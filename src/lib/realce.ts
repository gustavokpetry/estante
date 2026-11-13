import { Util, type PDFDocumentProxy } from 'pdfjs-dist'
import { normalizar } from './texto'
import type { Retangulo } from './types'

/**
 * Onde um termo aparece numa página, em frações da página. Usado para
 * realçar o resultado da busca. A posição dentro de cada pedaço de texto é
 * estimada pela proporção de caracteres, o que basta para um realce.
 */
export async function retangulosDoTermo(doc: PDFDocumentProxy, numero: number, termoNormalizado: string): Promise<Retangulo[]> {
  if (!termoNormalizado) return []
  const pagina = await doc.getPage(numero)
  const viewport = pagina.getViewport({ scale: 1 })
  const conteudo = await pagina.getTextContent()
  const achados: Retangulo[] = []

  for (const item of conteudo.items) {
    if (!('str' in item) || !item.str) continue
    const alvo = normalizar(item.str)
    let de = 0
    for (;;) {
      const i = alvo.indexOf(termoNormalizado, de)
      if (i === -1) break
      de = i + termoNormalizado.length
      const t = Util.transform(viewport.transform, item.transform)
      // Só texto na horizontal; texto girado fica sem realce.
      if (Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01) continue
      const altura = Math.hypot(t[2], t[3])
      const largura = item.width * viewport.scale
      const x = t[4] + largura * (i / item.str.length)
      const l = largura * (termoNormalizado.length / item.str.length)
      achados.push({
        x: x / viewport.width,
        y: (t[5] - altura * 0.82) / viewport.height,
        l: l / viewport.width,
        a: (altura * 1.05) / viewport.height,
      })
    }
  }
  return achados
}
