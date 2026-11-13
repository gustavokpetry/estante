import { useState } from 'react'

const CAMINHO = 'M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z'

function Estrela({ preenchimento, tamanho }: { preenchimento: 0 | 0.5 | 1; tamanho: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" className="estrela">
      <path d={CAMINHO} className="estrela-fundo" />
      {preenchimento > 0 && (
        <path d={CAMINHO} className="estrela-cheia" style={preenchimento === 0.5 ? { clipPath: 'inset(0 50% 0 0)' } : undefined} />
      )}
    </svg>
  )
}

function quanto(valor: number, posicao: number): 0 | 0.5 | 1 {
  if (valor >= posicao) return 1
  if (valor >= posicao - 0.5) return 0.5
  return 0
}

/** Estrelas só para mostrar a nota. */
export function EstrelasFixas({ valor, tamanho = 14 }: { valor: number; tamanho?: number }) {
  return (
    <span className="estrelas" role="img" aria-label={`${valor.toLocaleString('pt-BR')} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Estrela key={n} preenchimento={quanto(valor, n)} tamanho={tamanho} />
      ))}
    </span>
  )
}

interface Props {
  valor: number | null
  aoMudar: (valor: number | null) => void
}

/** Avaliação de meia em meia estrela. Clicar na nota atual a remove. */
export function EscolherEstrelas({ valor, aoMudar }: Props) {
  const [previa, setPrevia] = useState<number | null>(null)
  const mostrado = previa ?? valor ?? 0

  return (
    <div className="estrelas-campo">
      <div className="estrelas estrelas-grandes" role="radiogroup" aria-label="Avaliação" onPointerLeave={() => setPrevia(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="estrela-alvo">
            <Estrela preenchimento={quanto(mostrado, n)} tamanho={30} />
            {[n - 0.5, n].map((nota) => (
              <button
                key={nota}
                type="button"
                role="radio"
                aria-checked={valor === nota}
                aria-label={`${nota.toLocaleString('pt-BR')} ${nota === 1 ? 'estrela' : 'estrelas'}`}
                className={nota === n ? 'metade-direita' : 'metade-esquerda'}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setPrevia(nota)}
                onClick={() => {
                  setPrevia(null)
                  aoMudar(valor === nota ? null : nota)
                }}
              />
            ))}
          </span>
        ))}
      </div>
      <span className="estrelas-legenda">
        {valor ? `${valor.toLocaleString('pt-BR')} de 5` : 'Sem avaliação'}
        {valor !== null && (
          <button type="button" className="link-discreto link-compacto" onClick={() => aoMudar(null)}>
            Remover
          </button>
        )}
      </span>
    </div>
  )
}
