import { describe, expect, it } from 'vitest'
import { corPredominante, hexParaRgb, misturar, rgbParaHex, textoSobre } from '../src/lib/cores'

const pixels = (cores: Array<[number, number, number]>) => new Uint8ClampedArray(cores.flatMap(([r, g, b]) => [r, g, b, 255]))

describe('cores', () => {
  it('converte hex e rgb nos dois sentidos', () => {
    expect(hexParaRgb('#3d5a47')).toEqual({ r: 61, g: 90, b: 71 })
    expect(rgbParaHex({ r: 61, g: 90, b: 71 })).toBe('#3d5a47')
    expect(hexParaRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })
  it('escolhe texto legível sobre o fundo', () => {
    expect(textoSobre('#3d5a47')).toBe('#f6ecd4')
    expect(textoSobre('#f4e9d0')).toBe('#2a1a0f')
  })
  it('mistura cores', () => {
    expect(misturar('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
  it('acha a cor predominante ignorando o branco do papel', () => {
    const capa = pixels([...Array(60).fill([255, 255, 255]), ...Array(40).fill([140, 30, 30])])
    expect(corPredominante(capa)).toBe('#8c1e1e')
  })
  it('capa toda branca vira um tom neutro', () => {
    expect(corPredominante(pixels(Array(100).fill([250, 250, 250])))).toBe('#6a4a32')
  })
})
