import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CachePaginas } from '../lib/paginas'
import { CamadaTexto } from './CamadaTexto'
import { ContextoPagina } from './ContextoPagina'

interface Props {
  cache: CachePaginas
  numero: number
  /** Largura desejada do desenho, em pixels do aparelho. */
  largura: number
  /** Espaço reservado para a página na tela, em pixels CSS. */
  caixaLargura: number
  caixaAltura: number
  /** Páginas paradas aceitam seleção de texto; as que estão virando, não. */
  interativa?: boolean
}

/** Mostra uma página do PDF (copiada do cache) com as anotações por cima. */
export function PaginaTela({ cache, numero, largura, caixaLargura, caixaAltura, interativa = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [razao, setRazao] = useState<number | null>(null)
  const { doc, destaques, realces, marcadas, anotando, aoTocarDestaque } = useContext(ContextoPagina)

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
      const r = origem.width / origem.height
      setRazao((atual) => (atual !== null && Math.abs(atual - r) < 0.002 ? atual : r))
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

  // A página ocupa o maior retângulo com a proporção dela que caiba no espaço reservado.
  const l = razao === null ? caixaLargura : Math.min(caixaLargura, caixaAltura * razao)
  const a = razao === null ? caixaAltura : l / razao
  const daPagina = destaques.get(numero)
  const achados = realces.get(numero)

  return (
    <div
      className="pagina-caixa"
      data-numero={numero}
      style={{ width: l, height: a, left: (caixaLargura - l) / 2, top: (caixaAltura - a) / 2 }}
    >
      <canvas ref={ref} className="pagina-tela" aria-hidden="true" />
      {achados?.map((r, i) => (
        <span key={`b${i}`} className="realce-busca" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.l * 100}%`, height: `${r.a * 100}%` }} />
      ))}
      {daPagina?.map((d) =>
        d.retangulos.map((r, i) => (
          <span
            key={`${d.id}-${i}`}
            className={`destaque destaque-${d.cor}${d.nota ? ' destaque-com-nota' : ''}`}
            style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.l * 100}%`, height: `${r.a * 100}%` }}
            title={d.nota || undefined}
          />
        )),
      )}
      {interativa && anotando && doc && razao !== null && <CamadaTexto doc={doc} numero={numero} largura={l} />}
      {interativa &&
        anotando &&
        daPagina?.map((d) =>
          d.retangulos.map((r, i) => (
            <button
              key={`t${d.id}-${i}`}
              type="button"
              className="destaque-alvo"
              tabIndex={i === 0 ? 0 : -1}
              aria-label={`Destaque: ${d.texto.slice(0, 60)}`}
              style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.l * 100}%`, height: `${r.a * 100}%` }}
              onClick={() => aoTocarDestaque(d.id)}
            />
          )),
        )}
      {marcadas.has(numero) && <span className="fita-marcador" aria-hidden="true" />}
    </div>
  )
}
