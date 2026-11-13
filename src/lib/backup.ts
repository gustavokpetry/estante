import { db } from './db'
import { indexarPendentes } from './indexador'
import type { Colecao, Configuracao, Destaque, Livro, Marcador, Nota, RegistroLeitura } from './types'
import { bytesParaTexto, lerZip, montarZip, textoParaBytes, type EntradaZip } from './zip'

export const VERSAO_BACKUP = 1

/** Conteúdo do library.json dentro do backup. */
export interface Biblioteca {
  app: 'estante'
  versao: number
  exportadoEm: number
  comPdfs: boolean
  livros: Livro[]
  colecoes: Colecao[]
  marcadores: Marcador[]
  notas: Nota[]
  destaques: Destaque[]
  leituras: RegistroLeitura[]
  configuracoes: Configuracao[]
}

export interface ResumoImportacao {
  livrosNovos: number
  livrosAtualizados: number
  livrosSemPdf: number
  anotacoes: number
}

/**
 * Junta os dados de um livro que já existe com os do backup: nada se perde.
 * Listas são unidas; progresso, status e avaliação vêm de quem leu por último.
 */
export function mesclarLivro(atual: Livro, vindo: Livro, traducaoColecoes: Map<string, string> = new Map()): Livro {
  const vindoMaisRecente = (vindo.ultimaLeitura ?? 0) > (atual.ultimaLeitura ?? 0)
  const colecoesVindas = vindo.colecoesIds.map((id) => traducaoColecoes.get(id) ?? id)
  return {
    ...atual,
    tags: [...new Set([...atual.tags, ...vindo.tags])],
    colecoesIds: [...new Set([...atual.colecoesIds, ...colecoesVindas])],
    paginaAtual: vindoMaisRecente ? Math.min(vindo.paginaAtual, atual.totalPaginas) : atual.paginaAtual,
    ultimaLeitura: vindoMaisRecente ? vindo.ultimaLeitura : atual.ultimaLeitura,
    status: vindoMaisRecente ? vindo.status : atual.status,
    avaliacao: atual.avaliacao ?? vindo.avaliacao,
  }
}

async function* entradasDoBackup(comPdfs: boolean, aoAvancar: (feitos: number, total: number) => void): AsyncGenerator<EntradaZip> {
  const livros = await db.livros.toArray()
  const biblioteca: Biblioteca = {
    app: 'estante',
    versao: VERSAO_BACKUP,
    exportadoEm: Date.now(),
    comPdfs,
    livros,
    colecoes: await db.colecoes.toArray(),
    marcadores: await db.marcadores.toArray(),
    notas: await db.notas.toArray(),
    destaques: await db.destaques.toArray(),
    leituras: await db.leituras.toArray(),
    configuracoes: await db.configuracoes.toArray(),
  }
  // O índice vai primeiro: na importação ele precisa chegar antes dos arquivos.
  yield { nome: 'library.json', dados: textoParaBytes(JSON.stringify(biblioteca)), comprimir: true }

  let feitos = 0
  for (const livro of livros) {
    const capa = await db.capas.get(livro.id)
    if (capa) yield { nome: `capas/${livro.id}.jpg`, dados: new Uint8Array(await capa.blob.arrayBuffer()), comprimir: false }
    if (comPdfs) {
      const arquivo = await db.arquivos.get(livro.id)
      if (arquivo) yield { nome: `pdfs/${livro.id}.pdf`, dados: new Uint8Array(await arquivo.blob.arrayBuffer()), comprimir: false }
    }
    aoAvancar(++feitos, livros.length)
  }
}

/** Gera o arquivo de backup. Com `comPdfs` falso leva só os dados e as capas. */
export async function exportarBackup(comPdfs: boolean, aoAvancar: (feitos: number, total: number) => void = () => {}): Promise<Blob> {
  const pedacos = await montarZip(entradasDoBackup(comPdfs, aoAvancar))
  return new Blob(pedacos as BlobPart[], { type: 'application/zip' })
}

export function nomeDoBackup(comPdfs: boolean, agora: Date = new Date()): string {
  const d = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
  return comPdfs ? `estante-backup-${d}.zip` : `estante-backup-sem-pdfs-${d}.zip`
}

/** Oferece um arquivo para o navegador salvar. */
export function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function* pedacosDoArquivo(arquivo: Blob): AsyncGenerator<Uint8Array> {
  const leitor = arquivo.stream().getReader()
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) return
    yield value
  }
}

/**
 * Importa um backup, mesclando com a biblioteca atual. Livros são
 * reconhecidos pelo hash do PDF, então nunca duplicam.
 */
export async function importarBackup(arquivo: Blob, aoAvancar: (texto: string) => void = () => {}): Promise<ResumoImportacao> {
  const resumo: ResumoImportacao = { livrosNovos: 0, livrosAtualizados: 0, livrosSemPdf: 0, anotacoes: 0 }
  let biblioteca: Biblioteca | null = null
  const novos = new Map<string, Livro>() // livros do backup que ainda não existem aqui
  const capas = new Map<string, Blob>() // capas que chegaram antes do PDF
  const traducao = new Map<string, string>() // id de coleção no backup → id aqui
  const guardados = new Set<string>()

  const aplicarBiblioteca = async (b: Biblioteca) => {
    // Coleções: mesma coleção se tiver o mesmo id ou o mesmo nome.
    const existentes = await db.colecoes.toArray()
    for (const c of b.colecoes ?? []) {
      const igual = existentes.find((e) => e.id === c.id) ?? existentes.find((e) => e.nome.toLowerCase() === c.nome.toLowerCase())
      if (igual) traducao.set(c.id, igual.id)
      else {
        await db.colecoes.put(c)
        existentes.push(c)
      }
    }
    for (const vindo of b.livros ?? []) {
      const atual = await db.livros.get(vindo.id)
      if (atual) {
        await db.livros.put(mesclarLivro(atual, vindo, traducao))
        resumo.livrosAtualizados++
      } else {
        novos.set(vindo.id, { ...vindo, colecoesIds: vindo.colecoesIds.map((id) => traducao.get(id) ?? id) })
      }
    }
    for (const c of b.configuracoes ?? []) {
      if (!(await db.configuracoes.get(c.chave))) await db.configuracoes.put(c)
    }
  }

  await lerZip(pedacosDoArquivo(arquivo), async (nome, dados) => {
    if (nome === 'library.json') {
      const lido = JSON.parse(bytesParaTexto(dados)) as Biblioteca
      if (lido.app !== 'estante' || !Array.isArray(lido.livros)) throw new Error('formato')
      if (lido.versao > VERSAO_BACKUP) throw new Error('versao')
      biblioteca = lido
      await aplicarBiblioteca(lido)
      return
    }
    if (!biblioteca) throw new Error('formato')
    const capa = /^capas\/([0-9a-f]{64})\.jpg$/.exec(nome)
    if (capa) {
      if (novos.has(capa[1])) capas.set(capa[1], new Blob([dados as BlobPart], { type: 'image/jpeg' }))
      return
    }
    const pdf = /^pdfs\/([0-9a-f]{64})\.pdf$/.exec(nome)
    if (!pdf) return
    const id = pdf[1]
    const livro = novos.get(id)
    if (!livro) return
    aoAvancar(livro.titulo)
    await db.transaction('rw', db.livros, db.arquivos, db.capas, async () => {
      // O texto para a busca é refeito aqui; não vem no backup.
      await db.livros.put({ ...livro, temTexto: null })
      await db.arquivos.put({ livroId: id, blob: new Blob([dados as BlobPart], { type: 'application/pdf' }) })
      const imagem = capas.get(id)
      if (imagem) await db.capas.put({ livroId: id, blob: imagem })
    })
    capas.delete(id)
    guardados.add(id)
    resumo.livrosNovos++
  })

  const lida = biblioteca as Biblioteca | null
  if (!lida) throw new Error('formato')
  resumo.livrosSemPdf = [...novos.keys()].filter((id) => !guardados.has(id)).length

  // Anotações e histórico só de livros que existem aqui agora.
  const presentes = new Set(await db.livros.toCollection().primaryKeys())
  const tabelas = [
    [db.marcadores, lida.marcadores ?? []],
    [db.notas, lida.notas ?? []],
    [db.destaques, lida.destaques ?? []],
  ] as const
  for (const [tabela, itens] of tabelas) {
    for (const item of itens) {
      if (!presentes.has(item.livroId)) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = tabela as any
      if (!(await t.get(item.id))) {
        await t.put(item)
        resumo.anotacoes++
      }
    }
  }
  for (const r of lida.leituras ?? []) {
    const atual = await db.leituras.get([r.data, r.livroId])
    await db.leituras.put({
      data: r.data,
      livroId: r.livroId,
      segundos: Math.max(atual?.segundos ?? 0, r.segundos),
      paginas: Math.max(atual?.paginas ?? 0, r.paginas),
    })
  }

  void indexarPendentes()
  return resumo
}
