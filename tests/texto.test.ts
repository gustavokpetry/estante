import { describe, expect, it } from 'vitest'
import { juntarRetangulos, normalizar, procurarNaPagina } from '../src/lib/texto'

describe('normalizar', () => {
  it('tira acentos e maiúsculas sem mudar o tamanho', () => {
    const original = 'Ação, CORAÇÃO e Pinguim à beça'
    const n = normalizar(original)
    expect(n).toBe('acao, coracao e pinguim a beca')
    expect(n.length).toBe(original.length)
  })
})

describe('procurarNaPagina', () => {
  const texto = 'O coração do livro. Outro CORACAO aparece aqui, e mais um coração no fim.'
  it('acha ignorando acentos e maiúsculas', () => {
    const achados = procurarNaPagina(7, texto, normalizar('Coração'))
    expect(achados).toHaveLength(3)
    expect(achados[0].pagina).toBe(7)
    expect(achados[0].termo).toBe('coração')
    expect(achados[1].termo).toBe('CORACAO')
  })
  it('devolve o trecho ao redor', () => {
    const [a] = procurarNaPagina(1, texto, 'livro')
    expect(a.antes.endsWith('do ')).toBe(true)
    expect(a.depois.startsWith('. Outro')).toBe(true)
  })
  it('termo vazio não acha nada', () => {
    expect(procurarNaPagina(1, texto, '')).toEqual([])
  })
})

describe('juntarRetangulos', () => {
  it('une pedaços da mesma linha e mantém linhas separadas', () => {
    const r = juntarRetangulos([
      { x: 0.1, y: 0.1, l: 0.1, a: 0.02 },
      { x: 0.205, y: 0.1, l: 0.1, a: 0.02 },
      { x: 0.1, y: 0.14, l: 0.2, a: 0.02 },
    ])
    expect(r).toHaveLength(2)
    expect(r[0].x).toBeCloseTo(0.1)
    expect(r[0].l).toBeCloseTo(0.205)
  })
})
