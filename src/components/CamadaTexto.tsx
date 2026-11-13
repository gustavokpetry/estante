import { TextLayer, type PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useRef, type CSSProperties } from 'react'

interface Props {
  doc: PDFDocumentProxy
  numero: number
  /** Largura da página na tela, em pixels CSS. */
  largura: number
}

/**
 * Texto invisível do PDF.js alinhado sobre a imagem da página, para o
 * navegador conseguir selecionar trechos. Só existe no modo anotação.
 */
export function CamadaTexto({ doc, numero, largura }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    let cancelado = false
    let camada: TextLayer | null = null

    void (async () => {
      try {
        const pagina = await doc.getPage(numero)
        if (cancelado) return
        const escala = largura / pagina.getViewport({ scale: 1 }).width
        container.style.setProperty('--total-scale-factor', String(escala))
        camada = new TextLayer({
          textContentSource: pagina.streamTextContent(),
          container,
          viewport: pagina.getViewport({ scale: escala }),
        })
        await camada.render()
      } catch {
        // Página sem texto ou leitura cancelada: fica sem seleção.
      }
    })()

    return () => {
      cancelado = true
      camada?.cancel()
      container.replaceChildren()
    }
  }, [doc, numero, largura])

  const estilo = { '--scale-round-x': '1px', '--scale-round-y': '1px' } as CSSProperties
  return <div ref={ref} className="textLayer" style={estilo} />
}
