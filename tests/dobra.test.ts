import { describe, expect, it } from 'vitest'
import { calcularDobra, cantoDaFolha, cantoOposto, type Ponto } from '../src/lib/dobra'

const L = 300
const A = 400

function area(pontos: Ponto[]): number {
  let s = 0
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i]
    const b = pontos[(i + 1) % pontos.length]
    s += a.x * b.y - b.x * a.y
  }
  return Math.abs(s) / 2
}

function aplicar(m: number[], u: number, v: number): Ponto {
  return { x: m[0] * u + m[2] * v + m[4], y: m[1] * u + m[3] * v + m[5] }
}

describe('calcularDobra', () => {
  it('folha no lugar: nada dobrado', () => {
    const d = calcularDobra({ largura: L, altura: A, lado: 1, canto: 'base', p: cantoDaFolha(L, A, 1, 'base') })
    expect(d.plana).toBe(true)
    expect(area(d.recorteFrente)).toBeCloseTo(L * A)
  })

  it('frente + verso sempre somam a folha inteira', () => {
    for (const lado of [1, -1] as const) {
      for (const p of [{ x: lado * 120, y: 330 }, { x: -lado * 80, y: 250 }, { x: lado * 10, y: 390 }]) {
        const d = calcularDobra({ largura: L, altura: A, lado, canto: 'base', p })
        expect(area(d.recorteFrente) + area(d.recorteVerso)).toBeCloseTo(L * A, 3)
      }
    }
  })

  it('virada completa: o verso cai exatamente sobre a página vizinha', () => {
    const d = calcularDobra({ largura: L, altura: A, lado: 1, canto: 'base', p: cantoOposto(L, A, 1, 'base') })
    expect(d.progresso).toBeCloseTo(1)
    expect(area(d.recorteFrente)).toBeCloseTo(0, 3)
    // Página do verso (0..L) deve ocupar x de -L a 0, sem espelhar o texto.
    const a = aplicar(d.matrizVerso, 0, 0)
    const b = aplicar(d.matrizVerso, L, A)
    expect(a.x).toBeCloseTo(-L)
    expect(a.y).toBeCloseTo(0)
    expect(b.x).toBeCloseTo(0)
    expect(b.y).toBeCloseTo(A)
  })

  it('o canto da folha vai parar onde o dedo está', () => {
    const p = { x: 60, y: 300 }
    const d = calcularDobra({ largura: L, altura: A, lado: 1, canto: 'base', p })
    // No verso, o canto externo de baixo é (u, v) = (0, A).
    const canto = aplicar(d.matrizVerso, 0, A)
    expect(canto.x).toBeCloseTo(d.p.x)
    expect(canto.y).toBeCloseTo(d.p.y)
  })

  it('o verso é uma rotação (texto legível, não espelhado)', () => {
    const d = calcularDobra({ largura: L, altura: A, lado: -1, canto: 'topo', p: { x: 40, y: 90 } })
    const [a, b, c, e] = d.matrizVerso
    expect(a * e - b * c).toBeCloseTo(1)
  })

  it('o papel não estica: o canto nunca passa do alcance da lombada', () => {
    const d = calcularDobra({ largura: L, altura: A, lado: 1, canto: 'base', p: { x: -900, y: -900 } })
    expect(Math.hypot(d.p.x, d.p.y - A)).toBeLessThanOrEqual(L + 1e-6)
  })
})
