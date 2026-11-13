import { useSyncExternalStore } from 'react'
import { db } from './db'
import { abrirPdf } from './pdf'
import type { TextoPagina } from './types'

/**
 * Extrai o texto dos PDFs em segundo plano, um livro por vez, para a busca.
 * Cede a vez à interface a cada página, então nada trava enquanto isso roda.
 */

export interface EstadoIndexacao {
  livroId: string | null
  titulo: string
  feitas: number
  total: number
  naFila: number
}

let estado: EstadoIndexacao = { livroId: null, titulo: '', feitas: 0, total: 0, naFila: 0 }
const ouvintes = new Set<() => void>()
const fila: string[] = []
let trabalhando = false

function publicar(mudanca: Partial<EstadoIndexacao>): void {
  estado = { ...estado, ...mudanca, naFila: fila.length }
  ouvintes.forEach((avisar) => avisar())
}

export function useIndexacao(): EstadoIndexacao {
  return useSyncExternalStore(
    (avisar) => {
      ouvintes.add(avisar)
      return () => ouvintes.delete(avisar)
    },
    () => estado,
  )
}

const respirar = () => new Promise<void>((r) => setTimeout(r, 0))

async function indexar(livroId: string): Promise<void> {
  const livro = await db.livros.get(livroId)
  const arquivo = await db.arquivos.get(livroId)
  if (!livro || !arquivo || livro.temTexto !== null) return

  publicar({ livroId, titulo: livro.titulo, feitas: 0, total: livro.totalPaginas })
  const aberto = await abrirPdf(await arquivo.blob.arrayBuffer())
  try {
    const total = aberto.doc.numPages
    let lote: TextoPagina[] = []
    let paginasComTexto = 0
    let caracteres = 0

    for (let n = 1; n <= total; n++) {
      const pagina = await aberto.doc.getPage(n)
      const conteudo = await pagina.getTextContent()
      let texto = ''
      for (const item of conteudo.items) {
        if (!('str' in item)) continue
        texto += item.str
        if (item.hasEOL) texto += ' '
      }
      pagina.cleanup()
      texto = texto.replace(/\s+/g, ' ').trim()
      if (texto.length >= 20) paginasComTexto++
      caracteres += texto.length
      if (texto) lote.push({ livroId, pagina: n, texto })

      if (lote.length >= 25 || n === total) {
        if (lote.length) await db.textos.bulkPut(lote)
        lote = []
        // O livro pode ter sido excluído no meio do caminho.
        if (!(await db.livros.get(livroId))) {
          await db.textos.where('livroId').equals(livroId).delete()
          return
        }
      }
      publicar({ feitas: n, total })
      await respirar()
    }

    // PDF escaneado: quase nenhuma página tem texto de verdade.
    const temTexto = paginasComTexto >= Math.max(1, total * 0.15) || caracteres > 2000
    if (!temTexto) await db.textos.where('livroId').equals(livroId).delete()
    await db.livros.update(livroId, { temTexto })
  } finally {
    void aberto.fechar()
  }
}

async function trabalhar(): Promise<void> {
  if (trabalhando) return
  trabalhando = true
  try {
    while (fila.length > 0) {
      const id = fila.shift()!
      try {
        await indexar(id)
      } catch {
        // PDF problemático: fica sem busca, sem atrapalhar os outros.
        await db.livros.update(id, { temTexto: false }).catch(() => {})
      }
    }
  } finally {
    trabalhando = false
    publicar({ livroId: null, titulo: '', feitas: 0, total: 0 })
  }
}

export function indexarLivro(id: string): void {
  if (fila.includes(id) || estado.livroId === id) return
  fila.push(id)
  publicar({})
  void trabalhar()
}

/** Coloca na fila todos os livros cujo texto ainda não foi analisado. */
export async function indexarPendentes(): Promise<void> {
  const pendentes = await db.livros.filter((l) => l.temTexto === null).primaryKeys()
  pendentes.forEach((id) => indexarLivro(id))
}
