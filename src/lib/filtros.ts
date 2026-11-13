import { normalizar } from './texto'
import type { Livro, Ordenacao, StatusLeitura } from './types'

export interface Filtros {
  busca: string
  colecaoId: string | null
  tag: string | null
  status: StatusLeitura | null
  /** null: qualquer. 0: só sem avaliação. 1 a 5: pelo menos essa nota. */
  avaliacaoMinima: number | null
}

export const SEM_FILTROS: Filtros = { busca: '', colecaoId: null, tag: null, status: null, avaliacaoMinima: null }

export function temFiltroAtivo(f: Filtros): boolean {
  return f.busca.trim() !== '' || f.colecaoId !== null || f.tag !== null || f.status !== null || f.avaliacaoMinima !== null
}

export function progressoDe(livro: Livro): number {
  if (livro.ultimaLeitura === null || livro.totalPaginas <= 1) return 0
  return Math.min(1, Math.max(0, (livro.paginaAtual - 1) / (livro.totalPaginas - 1)))
}

export function filtrarLivros(livros: Livro[], f: Filtros): Livro[] {
  const termo = normalizar(f.busca.trim())
  return livros.filter((l) => {
    if (termo && !normalizar(`${l.titulo} ${l.autor}`).includes(termo)) return false
    if (f.colecaoId && !l.colecoesIds.includes(f.colecaoId)) return false
    if (f.tag && !l.tags.includes(f.tag)) return false
    if (f.status && l.status !== f.status) return false
    if (f.avaliacaoMinima === 0 && l.avaliacao !== null) return false
    if (f.avaliacaoMinima && (l.avaliacao ?? 0) < f.avaliacaoMinima) return false
    return true
  })
}

const comparaTitulo = (a: Livro, b: Livro) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base', numeric: true })

export function ordenarLivros(livros: Livro[], ordem: Ordenacao): Livro[] {
  const lista = [...livros]
  switch (ordem) {
    case 'recentes':
      return lista.sort((a, b) => b.adicionadoEm - a.adicionadoEm)
    case 'lidos':
      return lista.sort((a, b) => (b.ultimaLeitura ?? 0) - (a.ultimaLeitura ?? 0) || b.adicionadoEm - a.adicionadoEm)
    case 'titulo':
      return lista.sort(comparaTitulo)
    case 'progresso':
      return lista.sort((a, b) => progressoDe(b) - progressoDe(a) || comparaTitulo(a, b))
    case 'avaliacao':
      return lista.sort((a, b) => (b.avaliacao ?? -1) - (a.avaliacao ?? -1) || comparaTitulo(a, b))
  }
}

/** Todas as tags em uso, em ordem alfabética. */
export function tagsEmUso(livros: Livro[]): string[] {
  return [...new Set(livros.flatMap((l) => l.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Limpa uma tag digitada: sem espaços nas pontas, sem "#", minúscula. */
export function limparTag(texto: string): string {
  return texto.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 40)
}
