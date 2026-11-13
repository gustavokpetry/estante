import type { Livro } from '../lib/types'
import { progressoDe } from './GradeLivros'
import { useCapa } from './useCapa'

interface Props {
  livro: Livro
  aoAbrir: (id: string) => void
}

/** Atalho no alto da estante para retomar o último livro aberto. */
export function ContinuarLendo({ livro, aoAbrir }: Props) {
  const capa = useCapa(livro.id)
  const porcento = Math.round(progressoDe(livro) * 100)

  return (
    <section className="continuar" aria-label="Continuar lendo">
      <div className="continuar-capa" style={{ aspectRatio: String(Math.min(1.6, Math.max(0.55, livro.proporcaoCapa || 0.7))) }}>
        {capa && <img src={capa} alt="" />}
      </div>
      <div className="continuar-texto">
        <p className="continuar-chamada">Você parou aqui</p>
        <h2>{livro.titulo}</h2>
        <p className="continuar-pagina">
          Página {livro.paginaAtual} de {livro.totalPaginas} ({porcento}%)
        </p>
      </div>
      <button type="button" className="botao botao-principal" onClick={() => aoAbrir(livro.id)}>
        Continuar lendo
      </button>
    </section>
  )
}
