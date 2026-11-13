import { db } from './db'
import { autorConfiavel, tituloConfiavel, tituloDoArquivo } from './formato'
import { sha256Hex } from './hash'
import { abrirPdf, detectarOrientacao, FalhaAoAbrirPdf, gerarCapa, lerMetadados } from './pdf'
import type { Livro } from './types'

export type ResultadoImportacao =
  | { tipo: 'adicionado'; livro: Livro }
  | { tipo: 'duplicado'; titulo: string }
  | { tipo: 'erro'; mensagem: string }

export function ehPdf(arquivo: File): boolean {
  return arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name)
}

function ehCotaCheia(e: unknown): boolean {
  const erro = e as { name?: string; inner?: { name?: string } }
  return erro?.name === 'QuotaExceededError' || erro?.inner?.name === 'QuotaExceededError'
}

/** Lê um PDF, extrai o necessário e grava tudo no banco local. */
export async function importarPdf(arquivo: File): Promise<ResultadoImportacao> {
  if (!ehPdf(arquivo)) return { tipo: 'erro', mensagem: 'Não é um arquivo PDF.' }

  let dados: ArrayBuffer
  try {
    dados = await arquivo.arrayBuffer()
  } catch {
    return { tipo: 'erro', mensagem: 'Não foi possível ler o arquivo.' }
  }

  const id = await sha256Hex(dados)
  const existente = await db.livros.get(id)
  if (existente) return { tipo: 'duplicado', titulo: existente.titulo }

  // O PDF.js toma posse do buffer que recebe, então entregamos uma cópia
  // e guardamos o original.
  let aberto
  try {
    aberto = await abrirPdf(dados.slice(0))
  } catch (e) {
    const mensagem = e instanceof FalhaAoAbrirPdf ? e.message : 'Não foi possível abrir este PDF.'
    return { tipo: 'erro', mensagem }
  }

  const pdf = aberto.doc
  try {
    const meta = await lerMetadados(pdf)
    const orientacao = await detectarOrientacao(pdf)
    const capa = await gerarCapa(pdf)

    const livro: Livro = {
      id,
      titulo: tituloConfiavel(meta.titulo) ?? tituloDoArquivo(arquivo.name),
      autor: autorConfiavel(meta.autor),
      nomeArquivo: arquivo.name,
      tamanhoBytes: arquivo.size,
      totalPaginas: meta.totalPaginas,
      orientacao,
      modoHorizontal: null,
      tipoCapa: 'pdf',
      proporcaoCapa: capa.proporcao,
      status: 'quero-ler',
      avaliacao: null,
      adicionadoEm: Date.now(),
      ultimaLeitura: null,
      paginaAtual: 1,
      tags: [],
      colecoesIds: [],
      temTexto: null,
    }

    await db.transaction('rw', db.livros, db.arquivos, db.capas, async () => {
      await db.livros.add(livro)
      await db.arquivos.add({ livroId: id, blob: new Blob([dados], { type: 'application/pdf' }) })
      await db.capas.add({ livroId: id, blob: capa.blob })
    })

    return { tipo: 'adicionado', livro }
  } catch (e) {
    if (ehCotaCheia(e)) {
      return {
        tipo: 'erro',
        mensagem: 'O armazenamento do navegador está cheio. Exclua algum livro e tente de novo.',
      }
    }
    return { tipo: 'erro', mensagem: 'Não foi possível guardar este PDF.' }
  } finally {
    void aberto.fechar()
  }
}
