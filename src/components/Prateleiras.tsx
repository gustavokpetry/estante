import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { corDaCapa } from '../lib/capas'
import { textoSobre } from '../lib/cores'
import { db } from '../lib/db'
import { progressoDe } from '../lib/filtros'
import type { Livro } from '../lib/types'
import { EstrelasFixas } from './Estrelas'
import { proporcaoNaEstante } from './GradeLivros'
import { useCapa, versaoDaCapa } from './useCapa'

interface Props {
  livros: Livro[]
  /** 'madeira': capas de frente na prateleira. 'lombadas': livros de lado. */
  tipo: 'madeira' | 'lombadas'
  aoAbrir: (id: string) => void
  aoVerDetalhes: (id: string) => void
}

/** Espessura da lombada conforme o número de páginas, com mínimo e máximo. */
export function espessuraDaLombada(paginas: number): number {
  return Math.round(Math.min(58, Math.max(22, 14 + paginas * 0.11)))
}

function LivroNaPrateleira({
  livro,
  tipo,
  selecionado,
  aoSelecionar,
  aoAbrir,
}: {
  livro: Livro
  tipo: Props['tipo']
  selecionado: boolean
  aoSelecionar: (id: string) => void
  aoAbrir: (id: string) => void
}) {
  const capa = useCapa(livro.id, versaoDaCapa(livro))
  const cor = livro.corLombada ?? '#6a4a32'

  // Livros antigos (de antes da v1.3) ainda não têm a cor da lombada guardada.
  useEffect(() => {
    if (livro.corLombada) return
    let vivo = true
    void db.capas.get(livro.id).then(async (c) => {
      if (!c || !vivo) return
      await db.livros.update(livro.id, { corLombada: await corDaCapa(c.blob) })
    })
    return () => {
      vivo = false
    }
  }, [livro.id, livro.corLombada])

  // Como o gesto começou: guardado no toque, porque o foco seleciona o livro antes do clique chegar.
  const gesto = useRef({ toque: false, jaSelecionado: false })

  function aoClicar() {
    const { toque, jaSelecionado } = gesto.current
    gesto.current = { toque: false, jaSelecionado: false }
    // No toque, o primeiro toque só puxa o livro; o segundo abre.
    if (toque && !jaSelecionado) aoSelecionar(livro.id)
    else aoAbrir(livro.id)
  }

  const proporcao = proporcaoNaEstante(livro.proporcaoCapa)
  const estilo = {
    '--proporcao': proporcao,
    '--espessura': `${espessuraDaLombada(livro.totalPaginas)}px`,
    '--cor-lombada': cor,
    '--cor-letra': textoSobre(cor),
  } as CSSProperties

  return (
    <li className={`volume volume-${tipo}${selecionado ? ' selecionado' : ''}`} style={estilo}>
      <button
        type="button"
        className="volume-botao"
        aria-label={`${livro.titulo}${livro.autor ? `, de ${livro.autor}` : ''}. ${selecionado ? 'Abrir' : 'Selecionar'}`}
        onClick={aoClicar}
        onPointerDown={(e) => {
          gesto.current = { toque: e.pointerType !== 'mouse', jaSelecionado: selecionado }
        }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && aoSelecionar(livro.id)}
        onFocus={() => aoSelecionar(livro.id)}
      >
        {tipo === 'lombadas' ? (
          <span className="volume-caixa">
            <span className="lombada-face">
              <span className="lombada-titulo">{livro.titulo}</span>
            </span>
            <span className="capa-face">{capa && <img src={capa} alt="" draggable={false} />}</span>
          </span>
        ) : (
          <span className="capa">{capa ? <img src={capa} alt="" draggable={false} /> : <span className="capa-espera" />}</span>
        )}
      </button>
    </li>
  )
}

export function Prateleiras({ livros, tipo, aoAbrir, aoVerDetalhes }: Props) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const selecionado = livros.find((l) => l.id === selecionadoId) ?? null
  const porcento = selecionado ? Math.round(progressoDe(selecionado) * 100) : 0

  return (
    <div className="prateleiras-area">
      <ul className={`prateleiras prateleiras-${tipo}`}>
        {livros.map((livro) => (
          <LivroNaPrateleira
            key={livro.id}
            livro={livro}
            tipo={tipo}
            selecionado={livro.id === selecionadoId}
            aoSelecionar={setSelecionadoId}
            aoAbrir={aoAbrir}
          />
        ))}
      </ul>

      <div className="ficha-volume" aria-live="polite">
        {selecionado ? (
          <>
            <div className="ficha-volume-texto">
              <strong>{selecionado.titulo}</strong>
              <span>
                {selecionado.autor || 'Sem autor'}
                {selecionado.status === 'lido' ? ', lido' : selecionado.ultimaLeitura !== null ? `, ${porcento}% lido` : ''}
              </span>
              {selecionado.avaliacao !== null && <EstrelasFixas valor={selecionado.avaliacao} />}
            </div>
            <div className="ficha-volume-acoes">
              <button type="button" className="botao botao-principal" onClick={() => aoAbrir(selecionado.id)}>
                {selecionado.ultimaLeitura ? 'Continuar lendo' : 'Ler'}
              </button>
              <button type="button" className="botao" onClick={() => aoVerDetalhes(selecionado.id)}>
                Detalhes
              </button>
            </div>
          </>
        ) : (
          <p className="ficha-volume-dica">Escolha um livro para ver os detalhes.</p>
        )}
      </div>
    </div>
  )
}
