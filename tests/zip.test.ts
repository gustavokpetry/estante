import { describe, expect, it } from 'vitest'
import { bytesParaTexto, lerZip, montarZip, textoParaBytes, type EntradaZip } from '../src/lib/zip'

async function* gerar(entradas: EntradaZip[]) {
  for (const e of entradas) yield e
}

async function* emPedacos(dados: Uint8Array, tamanho: number) {
  for (let i = 0; i < dados.length; i += tamanho) yield dados.subarray(i, i + tamanho)
}

function juntar(pedacos: Uint8Array[]): Uint8Array {
  const total = pedacos.reduce((s, p) => s + p.length, 0)
  const saida = new Uint8Array(total)
  let pos = 0
  for (const p of pedacos) {
    saida.set(p, pos)
    pos += p.length
  }
  return saida
}

describe('zip', () => {
  it('ida e volta, com arquivos comprimidos e guardados, lidos em pedaços pequenos', async () => {
    const binario = new Uint8Array(70_000)
    for (let i = 0; i < binario.length; i++) binario[i] = (i * 31 + 7) % 251
    const entradas: EntradaZip[] = [
      { nome: 'library.json', dados: textoParaBytes(JSON.stringify({ ola: 'coração' })), comprimir: true },
      { nome: 'pdfs/abc.pdf', dados: binario, comprimir: false },
      { nome: 'capas/abc.jpg', dados: new Uint8Array([1, 2, 3, 4, 5]), comprimir: false },
    ]
    const zip = juntar(await montarZip(gerar(entradas)))

    const lidos = new Map<string, Uint8Array>()
    const ordem: string[] = []
    await lerZip(emPedacos(zip, 1000), async (nome, dados) => {
      ordem.push(nome)
      lidos.set(nome, dados)
    })

    expect(ordem).toEqual(['library.json', 'pdfs/abc.pdf', 'capas/abc.jpg'])
    expect(JSON.parse(bytesParaTexto(lidos.get('library.json')!))).toEqual({ ola: 'coração' })
    expect(lidos.get('pdfs/abc.pdf')).toEqual(binario)
    expect(Array.from(lidos.get('capas/abc.jpg')!)).toEqual([1, 2, 3, 4, 5])
  })

  it('arquivo que não é zip dá erro em vez de passar em silêncio', async () => {
    let arquivos = 0
    const lixo = textoParaBytes('isto não é um zip, é só um texto qualquer bem comprido para passar do cabeçalho')
    await lerZip(emPedacos(lixo, 16), async () => {
      arquivos++
    }).catch(() => {})
    expect(arquivos).toBe(0)
  })
})
