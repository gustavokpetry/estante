import { describe, expect, it } from 'vitest'
import { lerRota } from '../src/lib/rota'

describe('lerRota', () => {
  const id = 'a'.repeat(64)
  it('reconhece o leitor', () => {
    expect(lerRota(`#/ler/${id}`)).toEqual({ tela: 'leitor', livroId: id })
  })
  it('qualquer outra coisa é a estante', () => {
    expect(lerRota('')).toEqual({ tela: 'estante' })
    expect(lerRota('#/')).toEqual({ tela: 'estante' })
    expect(lerRota('#/ler/123')).toEqual({ tela: 'estante' })
  })
})
