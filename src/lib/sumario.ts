import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface ItemSumario {
  titulo: string
  destino: unknown
  nivel: number
}

interface NoDoPdf {
  title: string
  dest: unknown
  items?: NoDoPdf[]
}

/** Lê o sumário embutido no PDF (quando existe) como uma lista com níveis. */
export async function lerSumario(doc: PDFDocumentProxy): Promise<ItemSumario[]> {
  let raiz: NoDoPdf[] | null = null
  try {
    raiz = (await doc.getOutline()) as NoDoPdf[] | null
  } catch {
    return []
  }
  if (!raiz) return []
  const lista: ItemSumario[] = []
  const percorrer = (nos: NoDoPdf[], nivel: number) => {
    for (const no of nos) {
      const titulo = (no.title ?? '').trim()
      if (titulo && no.dest != null) lista.push({ titulo, destino: no.dest, nivel })
      if (no.items?.length && nivel < 4) percorrer(no.items, nivel + 1)
    }
  }
  percorrer(raiz, 0)
  return lista.slice(0, 2000)
}

/** Descobre em que página (a partir de 1) um item do sumário cai. */
export async function paginaDoDestino(doc: PDFDocumentProxy, destino: unknown): Promise<number | null> {
  try {
    const alvo = typeof destino === 'string' ? await doc.getDestination(destino) : destino
    if (!Array.isArray(alvo) || alvo.length === 0) return null
    const ref = alvo[0]
    if (typeof ref === 'number') return ref + 1
    if (ref && typeof ref === 'object') {
      const indice = await doc.getPageIndex(ref as Parameters<PDFDocumentProxy['getPageIndex']>[0])
      return indice + 1
    }
  } catch {
    // Destino quebrado no PDF: ignoramos o clique.
  }
  return null
}
