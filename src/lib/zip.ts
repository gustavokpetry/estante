import { strFromU8, strToU8, Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough } from 'fflate'

export interface EntradaZip {
  nome: string
  dados: Uint8Array
  /** PDFs e JPEGs já são compactados: guardar sem comprimir é mais rápido. */
  comprimir: boolean
}

/**
 * Monta um .zip a partir de entradas produzidas uma a uma, para nunca ter
 * todos os PDFs na memória ao mesmo tempo. Devolve os pedaços do arquivo.
 */
export async function montarZip(entradas: AsyncIterable<EntradaZip>): Promise<Uint8Array[]> {
  const pedacos: Uint8Array[] = []
  let falha: Error | null = null
  let terminou: () => void = () => {}
  const fim = new Promise<void>((r) => (terminou = r))

  const zip = new Zip((erro, pedaco, ultimo) => {
    if (erro) falha = erro
    else pedacos.push(pedaco)
    if (ultimo || erro) terminou()
  })

  for await (const entrada of entradas) {
    const arquivo = entrada.comprimir ? new ZipDeflate(entrada.nome, { level: 6 }) : new ZipPassThrough(entrada.nome)
    zip.add(arquivo)
    arquivo.push(entrada.dados, true)
    if (falha) throw falha
  }
  zip.end()
  await fim
  if (falha) throw falha
  return pedacos
}

/**
 * Lê um .zip em pedaços e entrega cada arquivo assim que ele termina.
 * Os arquivos são processados em ordem, um por vez.
 */
export async function lerZip(
  pedacos: AsyncIterable<Uint8Array>,
  aoArquivo: (nome: string, dados: Uint8Array) => Promise<void>,
): Promise<void> {
  let cadeia: Promise<void> = Promise.resolve()
  let falha: unknown = null
  const leitor = new Unzip()
  leitor.register(UnzipInflate)
  leitor.onfile = (arquivo) => {
    const partes: Uint8Array[] = []
    arquivo.ondata = (erro, parte, ultimo) => {
      if (erro) {
        falha = erro
        return
      }
      partes.push(parte)
      if (!ultimo) return
      const total = partes.reduce((s, p) => s + p.length, 0)
      const dados = new Uint8Array(total)
      let pos = 0
      for (const p of partes) {
        dados.set(p, pos)
        pos += p.length
      }
      partes.length = 0
      cadeia = cadeia.then(() => aoArquivo(arquivo.name, dados)).catch((e) => {
        falha ??= e
      })
    }
    arquivo.start()
  }

  for await (const pedaco of pedacos) {
    leitor.push(pedaco, false)
    await cadeia // não lê mais do arquivo enquanto o anterior não foi guardado
    if (falha) throw falha
  }
  leitor.push(new Uint8Array(0), true)
  await cadeia
  if (falha) throw falha
}

export const textoParaBytes = strToU8
export const bytesParaTexto = strFromU8
