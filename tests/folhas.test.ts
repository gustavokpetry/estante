import { describe, expect, it } from 'vitest'
import { aberturaDe, paginaAnterior, paginaCanonica, proximaPagina, rotuloPaginas } from '../src/lib/folhas'

describe('aberturas em duas páginas', () => {
  it('a capa fica sozinha à direita', () => {
    expect(aberturaDe(1, 10)).toEqual({ esquerda: null, direita: 1 })
  })
  it('pares à esquerda, ímpares à direita', () => {
    expect(aberturaDe(2, 10)).toEqual({ esquerda: 2, direita: 3 })
    expect(aberturaDe(3, 10)).toEqual({ esquerda: 2, direita: 3 })
  })
  it('a última página par fica sozinha à esquerda', () => {
    expect(aberturaDe(10, 10)).toEqual({ esquerda: 10, direita: null })
  })
})

describe('navegação', () => {
  it('percorre o livro inteiro em duas páginas e volta', () => {
    const total = 7
    const ida = [1]
    for (let p = proximaPagina(1, total, true); p !== null; p = proximaPagina(p, total, true)) ida.push(p)
    expect(ida).toEqual([1, 2, 4, 6])
    const volta = [6]
    for (let p = paginaAnterior(6, total, true); p !== null; p = paginaAnterior(p, total, true)) volta.push(p)
    expect(volta).toEqual([6, 4, 2, 1])
  })
  it('em página única anda de uma em uma e para nas pontas', () => {
    expect(proximaPagina(3, 3, false)).toBeNull()
    expect(paginaAnterior(1, 3, false)).toBeNull()
    expect(proximaPagina(1, 3, false)).toBe(2)
  })
  it('normaliza a página guardada', () => {
    expect(paginaCanonica(5, 10, true)).toBe(4)
    expect(paginaCanonica(99, 10, false)).toBe(10)
    expect(paginaCanonica(0, 10, true)).toBe(1)
  })
  it('descreve o que está na tela', () => {
    expect(rotuloPaginas(4, 10, true)).toBe('Páginas 4 e 5')
    expect(rotuloPaginas(1, 10, true)).toBe('Página 1')
    expect(rotuloPaginas(4, 10, false)).toBe('Página 4')
  })
})
