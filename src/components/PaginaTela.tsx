import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CachePaginas } from '../lib/paginas'

interface Props {
  cache: CachePaginas
  numero: number
  /** Largura desejada em pixels do aparelho. */
  largura: number
}

/** Mostra uma página do PDF, copiando o desenho pronto do cache. */
export function PaginaTela({ cache, numero, largura }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const destino = ref.current
    if (!destino) return
    let vivo = true

    const copiar = (origem: HTMLCanvasElement) => {
      if (origem.width === 0) return
      if (destino.width !== origem.width || destino.height !== origem.height) {
        destino.width = origem.width
        destino.height = origem.height
      }
      destino.getContext('2d', { alpha: false })?.drawImage(origem, 0, 0)
      destino.dataset.pagina = String(numero)
    }

    const pronta = cache.pronta(numero, largura)
    if (pronta) {
      copiar(pronta)
    } else {
      // Enquanto a versão nítida não chega, mostra a que houver (ou o papel em branco).
      const provisoria = cache.qualquer(numero)
      if (provisoria) copiar(provisoria)
      else if (destino.dataset.pagina !== String(numero)) destino.width = 0
      void cache.pedir(numero, largura).then((canvas) => {
        if (vivo && canvas) copiar(canvas)
      })
    }
    return () => {
      vivo = false
    }
  }, [cache, numero, largura])

  useEffect(() => {
    const canvas = ref.current
    return () => {
      // Devolve a memória ao sair da tela.
      if (canvas) canvas.width = 0
    }
  }, [])

  return <canvas ref={ref} className="pagina-tela" aria-hidden="true" />
}
