import type { CSSProperties, KeyboardEvent } from 'react'
import { progressoDe } from '../lib/filtros'
import type { Livro } from '../lib/types'
import { EstrelasFixas } from './Estrelas'
import { IconeCerto, IconeDetalhes } from './Icones'
import { useCapa, versaoDaCapa } from './useCapa'
import type { Reordenar } from './useReordenar'

export interface PropsDaEstante {
  livros: Livro[]
  aoAbrir: (id: string) => void
  aoVerDetalhes: (id: string) => void
  reordenar: Reordenar
  /** Livro sendo arrastado agora, se houver. */
  arrastandoId: string | null
  /** Alt + seta move o livro pelo teclado. */
  aoMoverPeloTeclado: (id: string, direcao: 1 | -1) => void
}

/** Limita proporções extremas para a prateleira não ficar desalinhada. */
export function proporcaoNaEstante(p: number): number {
  return Math.min(1.6, Math.max(0.55, p || 0.7))
}

export function teclaDeMover(e: KeyboardEvent, id: string, mover: PropsDaEstante['aoMoverPeloTeclado']): void {
  if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
  e.preventDefault()
  mover(id, e.key === 'ArrowRight' ? 1 : -1)
}

function CartaoLivro({ livro, aoAbrir, aoVerDetalhes, reordenar, arrastandoId, aoMoverPeloTeclado }: { livro: Livro } & Omit<PropsDaEstante, 'livros'>) {
  const capa = useCapa(livro.id, versaoDaCapa(livro))
  const progresso = progressoDe(livro)
  const estilo = { '--proporcao': proporcaoNaEstante(livro.proporcaoCapa) } as CSSProperties
  const lido = livro.status === 'lido'

  return (
    <li className={`livro${arrastandoId === livro.id ? ' arrastando' : ''}`} style={estilo} data-livro={livro.id}>
      <button
        type="button"
        className="livro-botao"
        aria-label={`Ler ${livro.titulo}`}
        onPointerDown={(e) => reordenar.aoApertar(e, livro.id)}
        onKeyDown={(e) => teclaDeMover(e, livro.id, aoMoverPeloTeclado)}
        onClick={() => {
          if (reordenar.arrastou.current) reordenar.arrastou.current = false
          else aoAbrir(livro.id)
        }}
      >
        <span className="capa">
          {capa ? <img src={capa} alt="" draggable={false} /> : <span className="capa-espera" />}
          {lido && (
            <span className="capa-selo" title="Lido">
              <IconeCerto width={14} height={14} />
            </span>
          )}
          {!lido && progresso > 0 && (
            <span className="capa-progresso" aria-hidden="true">
              <span style={{ width: `${Math.max(3, Math.round(progresso * 100))}%` }} />
            </span>
          )}
        </span>
      </button>
      <div className="livro-legenda">
        <div className="livro-textos">
          <span className="livro-titulo">{livro.titulo}</span>
          {livro.avaliacao !== null && <EstrelasFixas valor={livro.avaliacao} tamanho={12} />}
        </div>
        <button
          type="button"
          className="botao-icone botao-icone-pequeno livro-detalhes"
          onClick={() => aoVerDetalhes(livro.id)}
          aria-label={`Detalhes de ${livro.titulo}`}
          title="Detalhes"
        >
          <IconeDetalhes />
        </button>
      </div>
    </li>
  )
}

export function GradeLivros({ livros, ...resto }: PropsDaEstante) {
  return (
    <div className="grade-area">
      <ul className="grade">
        {livros.map((livro) => (
          <CartaoLivro key={livro.id} livro={livro} {...resto} />
        ))}
      </ul>
    </div>
  )
}
