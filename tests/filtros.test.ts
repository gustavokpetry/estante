import { describe, expect, it } from 'vitest'
import { mesclarLivro } from '../src/lib/backup'
import { encaixarOrdem, filtrarLivros, limparTag, moverNaLista, ordenarLivros, SEM_FILTROS, tagsEmUso } from '../src/lib/filtros'
import type { Livro } from '../src/lib/types'

function livro(parcial: Partial<Livro>): Livro {
  return {
    id: 'x', titulo: 'Sem título', autor: '', nomeArquivo: 'a.pdf', tamanhoBytes: 1, totalPaginas: 100,
    orientacao: 'vertical', modoHorizontal: null, tipoCapa: 'pdf', proporcaoCapa: 0.7, status: 'quero-ler',
    avaliacao: null, adicionadoEm: 0, ultimaLeitura: null, paginaAtual: 1, tags: [], colecoesIds: [], temTexto: null,
    ...parcial,
  }
}

const estante = [
  livro({ id: 'a', titulo: 'Dom Casmurro', autor: 'Machado de Assis', tags: ['clássico'], colecoesIds: ['c1'], status: 'lido', avaliacao: 5, adicionadoEm: 1, ultimaLeitura: 50, paginaAtual: 100 }),
  livro({ id: 'b', titulo: 'Cálculo 2', autor: 'Stewart', tags: ['faculdade'], status: 'lendo', avaliacao: 3.5, adicionadoEm: 3, ultimaLeitura: 90, paginaAtual: 40 }),
  livro({ id: 'c', titulo: 'atlas', autor: '', tags: ['clássico', 'mapas'], adicionadoEm: 2 }),
]

describe('filtrarLivros', () => {
  const ids = (l: Livro[]) => l.map((x) => x.id)
  it('busca por título ou autor sem ligar para acentos', () => {
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, busca: 'calculo' }))).toEqual(['b'])
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, busca: 'MACHADO' }))).toEqual(['a'])
  })
  it('filtra por coleção, tag, status e avaliação', () => {
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, colecaoId: 'c1' }))).toEqual(['a'])
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, tag: 'clássico' }))).toEqual(['a', 'c'])
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, status: 'lendo' }))).toEqual(['b'])
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, avaliacaoMinima: 4 }))).toEqual(['a'])
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, avaliacaoMinima: 0 }))).toEqual(['c'])
  })
  it('combina filtros', () => {
    expect(ids(filtrarLivros(estante, { ...SEM_FILTROS, tag: 'clássico', status: 'lido' }))).toEqual(['a'])
  })
})

describe('ordenarLivros', () => {
  const ids = (l: Livro[]) => l.map((x) => x.id).join('')
  it('ordena de cada jeito', () => {
    expect(ids(ordenarLivros(estante, 'recentes'))).toBe('bca')
    expect(ids(ordenarLivros(estante, 'lidos'))).toBe('bac')
    expect(ids(ordenarLivros(estante, 'titulo'))).toBe('cba')
    expect(ids(ordenarLivros(estante, 'progresso'))).toBe('abc')
    expect(ids(ordenarLivros(estante, 'avaliacao'))).toBe('abc')
  })
})

describe('ordem arrumada à mão', () => {
  it('sem ninguém arrumado, é igual a "adicionados por último"', () => {
    expect(ordenarLivros(estante, 'manual').map((l) => l.id).join('')).toBe('bca')
  })
  it('respeita as posições e põe os livros novos na frente', () => {
    const arrumada = [livro({ id: 'x', ordem: 1 }), livro({ id: 'y', ordem: 0 }), livro({ id: 'novo', adicionadoEm: 99 })]
    expect(ordenarLivros(arrumada, 'manual').map((l) => l.id)).toEqual(['novo', 'y', 'x'])
  })
  it('move um item para antes ou depois de outro', () => {
    expect(moverNaLista(['a', 'b', 'c', 'd'], 'a', 'c', true)).toEqual(['b', 'c', 'a', 'd'])
    expect(moverNaLista(['a', 'b', 'c', 'd'], 'd', 'b', false)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('devolve a mesma lista quando nada muda', () => {
    const lista = ['a', 'b', 'c']
    expect(moverNaLista(lista, 'a', 'b', false)).toBe(lista)
    expect(moverNaLista(lista, 'a', 'a', true)).toBe(lista)
  })
  it('com filtro ligado, os escondidos ficam onde estavam', () => {
    // Na tela só b e d; o usuário trocou os dois de lugar.
    expect(encaixarOrdem(['a', 'b', 'c', 'd', 'e'], ['d', 'b'])).toEqual(['a', 'd', 'c', 'b', 'e'])
  })
})

describe('tags', () => {
  it('lista as tags em uso sem repetir', () => {
    expect(tagsEmUso(estante)).toEqual(['clássico', 'faculdade', 'mapas'])
  })
  it('limpa o que foi digitado', () => {
    expect(limparTag('  #Ficção   Científica ')).toBe('ficção científica')
  })
})

describe('mesclarLivro (importar backup)', () => {
  it('une listas e fica com o progresso de quem leu por último', () => {
    const aqui = livro({ tags: ['a'], colecoesIds: ['c1'], paginaAtual: 10, ultimaLeitura: 100, status: 'lendo', avaliacao: null })
    const backup = livro({ tags: ['a', 'b'], colecoesIds: ['velha'], paginaAtual: 60, ultimaLeitura: 200, status: 'lido', avaliacao: 4 })
    const r = mesclarLivro(aqui, backup, new Map([['velha', 'c2']]))
    expect(r.tags).toEqual(['a', 'b'])
    expect(r.colecoesIds).toEqual(['c1', 'c2'])
    expect(r.paginaAtual).toBe(60)
    expect(r.status).toBe('lido')
    expect(r.avaliacao).toBe(4)
  })
  it('backup mais antigo não desfaz o progresso daqui', () => {
    const aqui = livro({ paginaAtual: 80, ultimaLeitura: 300, status: 'lendo', avaliacao: 2 })
    const backup = livro({ paginaAtual: 5, ultimaLeitura: 100, status: 'quero-ler', avaliacao: 5 })
    const r = mesclarLivro(aqui, backup)
    expect(r.paginaAtual).toBe(80)
    expect(r.status).toBe('lendo')
    expect(r.avaliacao).toBe(2)
  })
})
