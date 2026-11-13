import { describe, expect, it } from 'vitest'
import { sha256Hex } from '../src/lib/hash'

describe('sha256Hex', () => {
  it('bate com o valor conhecido de "abc"', async () => {
    const dados = new TextEncoder().encode('abc').buffer as ArrayBuffer
    expect(await sha256Hex(dados)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
  it('arquivos iguais geram o mesmo id; diferentes, ids diferentes', async () => {
    const a = new Uint8Array([1, 2, 3]).buffer as ArrayBuffer
    const b = new Uint8Array([1, 2, 3]).buffer as ArrayBuffer
    const c = new Uint8Array([1, 2, 4]).buffer as ArrayBuffer
    expect(await sha256Hex(a)).toBe(await sha256Hex(b))
    expect(await sha256Hex(a)).not.toBe(await sha256Hex(c))
  })
})
