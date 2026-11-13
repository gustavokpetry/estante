import type { CSSProperties } from 'react'
import type { Livro } from '../lib/types'
import { useCapa } from './useCapa'

interface Props {
  livros: Livro[]
  aoAbrir: (id: string) => void
}

/** Limita proporções extremas para a prateleira não ficar desalinhada. */
function proporcaoNaEstante(p: number): number {
  return Math.min(1.6, Math.max(0.55, p || 0.7))
}

function CartaoLivro({ livro, aoAbrir }: { livro: Livro; aoAbrir: (id: string) => void }) {
  const capa = useCapa(livro.id)
  const progresso = livro.totalPaginas > 1 ? (livro.paginaAtual - 1) / (livro.totalPaginas - 1) : 0
  const estilo = { '--proporcao': proporcaoNaEstante(livro.proporcaoCapa) } as CSSProperties

  return (
    <li className="livro" style={estilo}>
      <button type="button" className="livro-botao" onClick={() => aoAbrir(livro.id)}>
        <span className="capa">
          {capa ? <img src={capa} alt="" draggable={false} /> : <span className="capa-espera" />}
          {progresso > 0 && (
            <span className="capa-progresso" aria-hidden="true">
              <span style={{ width: `${Math.round(progresso * 100)}%` }} />
            </span>
          )}
        </span>
        <span className="livro-titulo">{livro.titulo}</span>
        {livro.autor && <span className="livro-autor">{livro.autor}</span>}
      </button>
    </li>
  )
}

export function GradeLivros({ livros, aoAbrir }: Props) {
  return (
    <ul className="grade">
      {livros.map((livro) => (
        <CartaoLivro key={livro.id} livro={livro} aoAbrir={aoAbrir} />
      ))}
    </ul>
  )
}
