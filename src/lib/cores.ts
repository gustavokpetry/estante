/** Contas de cor usadas nas capas criadas e nas lombadas. */

export interface Rgb {
  r: number
  g: number
  b: number
}

export function hexParaRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const cheio = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0')
  const n = parseInt(cheio.slice(0, 6), 16) || 0
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbParaHex({ r, g, b }: Rgb): string {
  const p = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${p(r)}${p(g)}${p(b)}`
}

/** Luminância relativa (0 escuro, 1 claro), como na regra de contraste da WCAG. */
export function luminancia({ r, g, b }: Rgb): number {
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

/** Cor de texto (clara ou escura) que se lê melhor sobre o fundo dado. */
export function textoSobre(fundo: string): string {
  return luminancia(hexParaRgb(fundo)) > 0.4 ? '#2a1a0f' : '#f6ecd4'
}

/** Mistura duas cores; t = 0 devolve a primeira, t = 1 a segunda. */
export function misturar(a: string, b: string, t: number): string {
  const x = hexParaRgb(a)
  const y = hexParaRgb(b)
  return rgbParaHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t })
}

export const clarear = (cor: string, t: number) => misturar(cor, '#ffffff', t)
export const escurecer = (cor: string, t: number) => misturar(cor, '#000000', t)

/**
 * Cor predominante de uma imagem já reduzida (pixels RGBA). Dá mais peso às
 * cores vivas e ignora quase-brancos e quase-pretos, que costumam ser papel
 * e texto; se a capa for toda assim, cai num tom neutro de couro.
 */
export function corPredominante(pixels: Uint8ClampedArray): string {
  let r = 0
  let g = 0
  let b = 0
  let peso = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const pr = pixels[i]
    const pg = pixels[i + 1]
    const pb = pixels[i + 2]
    const max = Math.max(pr, pg, pb)
    const min = Math.min(pr, pg, pb)
    if (max > 238 && min > 225) continue
    if (max < 22) continue
    const p = 1 + ((max - min) / 255) * 4
    r += pr * p
    g += pg * p
    b += pb * p
    peso += p
  }
  if (peso < pixels.length / 4 / 12) return '#6a4a32'
  const cor = { r: r / peso, g: g / peso, b: b / peso }
  // Lombadas muito claras somem na madeira clara: escurece um pouco.
  return luminancia(cor) > 0.6 ? escurecer(rgbParaHex(cor), 0.25) : rgbParaHex(cor)
}
