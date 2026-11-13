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
    case 'manual':
      // Arrumados à mão pela posição; os que ainda não têm posição (novos) vêm antes, do mais novo ao mais antigo.
      return lista.sort((a, b) => {
        const pa = a.ordem ?? null
        const pb = b.ordem ?? null
        if (pa === null && pb === null) return b.adicionadoEm - a.adicionadoEm
        if (pa === null) return -1
        if (pb === null) return 1
        return pa - pb
      })
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

/** Tira `id` de onde está e o coloca antes ou depois de `alvo`. Devolve a mesma lista se nada mudar. */
export function moverNaLista(lista: string[], id: string, alvo: string, depois: boolean): string[] {
  if (id === alvo || !lista.includes(id)) return lista
  const sem = lista.filter((x) => x !== id)
  const i = sem.indexOf(alvo)
  if (i < 0) return lista
  sem.splice(depois ? i + 1 : i, 0, id)
  return sem.every((x, k) => x === lista[k]) ? lista : sem
}

/**
 * Com filtros ligados, só parte dos livros está na tela. A nova ordem dos
 * visíveis ocupa as mesmas vagas que eles ocupavam na lista completa; os
 * escondidos não saem do lugar.
 */
export function encaixarOrdem(todos: string[], visiveisNaNovaOrdem: string[]): string[] {
  const naTela = new Set(visiveisNaNovaOrdem)
  let k = 0
  return todos.map((id) => (naTela.has(id) ? visiveisNaNovaOrdem[k++] : id))
}
