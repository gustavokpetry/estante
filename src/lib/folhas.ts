/**
 * Contas de paginação do leitor.
 *
 * No modo de duas páginas, a capa (página 1) aparece sozinha à direita, como
 * num livro de verdade. Depois vêm os pares: 2-3, 4-5… Páginas pares ficam à
 * esquerda e ímpares à direita.
 */

export interface Abertura {
  esquerda: number | null
  direita: number | null
}

export function aberturaDe(pagina: number, total: number): Abertura {
  const indice = Math.floor(pagina / 2)
  const esquerda = indice * 2
  const direita = esquerda + 1
  return {
    esquerda: esquerda >= 1 && esquerda <= total ? esquerda : null,
    direita: direita <= total ? direita : null,
  }
}

/** Página que representa a abertura atual (a primeira visível). */
export function paginaCanonica(pagina: number, total: number, duas: boolean): number {
  const p = Math.min(Math.max(1, Math.round(pagina) || 1), Math.max(1, total))
  if (!duas) return p
  const { esquerda, direita } = aberturaDe(p, total)
  return esquerda ?? direita ?? 1
}

export function proximaPagina(pagina: number, total: number, duas: boolean): number | null {
  if (!duas) return pagina < total ? pagina + 1 : null
  const seguinte = (Math.floor(pagina / 2) + 1) * 2
  return seguinte <= total ? seguinte : null
}

export function paginaAnterior(pagina: number, _total: number, duas: boolean): number | null {
  if (!duas) return pagina > 1 ? pagina - 1 : null
  const indice = Math.floor(pagina / 2)
  if (indice === 0) return null
  return Math.max(1, (indice - 1) * 2)
}

/** "Página 12", "Páginas 12 e 13". */
export function rotuloPaginas(pagina: number, total: number, duas: boolean): string {
  if (!duas) return `Página ${pagina}`
  const { esquerda, direita } = aberturaDe(pagina, total)
  if (esquerda && direita) return `Páginas ${esquerda} e ${direita}`
  return `Página ${esquerda ?? direita ?? 1}`
}
