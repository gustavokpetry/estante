import type { CSSProperties } from 'react'
import { progressoDe } from '../lib/filtros'
import type { Livro } from '../lib/types'
import { EstrelasFixas } from './Estrelas'
import { IconeCerto, IconeDetalhes } from './Icones'
import { useCapa, versaoDaCapa } from './useCapa'

interface Props {
  livros: Livro[]
  aoAbrir: (id: string) => void
  aoVerDetalhes: (id: string) => void
}

/** Limita proporções extremas para a prateleira não ficar desalinhada. */
export function proporcaoNaEstante(p: number): number {
  return Math.min(1.6, Math.max(0.55, p || 0.7))
}

function CartaoLivro({ livro, aoAbrir, aoVerDetalhes }: { livro: Livro } & Omit<Props, 'livros'>) {
  const capa = useCapa(livro.id, versaoDaCapa(livro))
  const progresso = progressoDe(livro)
  const estilo = { '--proporcao': proporcaoNaEstante(livro.proporcaoCapa) } as CSSProperties
  const lido = livro.status === 'lido'

  return (
    <li className="livro" style={estilo}>
      <button type="button" className="livro-botao" onClick={() => aoAbrir(livro.id)} aria-label={`Ler ${livro.titulo}`}>
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
          {livro.autor && <span className="livro-autor">{livro.autor}</span>}
          {livro.avaliacao !== null && <EstrelasFixas valor={livro.avaliacao} />}
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

export function GradeLivros({ livros, aoAbrir, aoVerDetalhes }: Props) {
  return (
    <ul className="grade">
      {livros.map((livro) => (
        <CartaoLivro key={livro.id} livro={livro} aoAbrir={aoAbrir} aoVerDetalhes={aoVerDetalhes} />
      ))}
    </ul>
  )
}
