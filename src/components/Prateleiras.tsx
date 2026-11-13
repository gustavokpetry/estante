import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { corDaCapa } from '../lib/capas'
import { textoSobre } from '../lib/cores'
import { db } from '../lib/db'
import { progressoDe } from '../lib/filtros'
import type { Livro } from '../lib/types'
import { EstrelasFixas } from './Estrelas'
import { proporcaoNaEstante, teclaDeMover, type PropsDaEstante } from './GradeLivros'
import { IconeDetalhes, IconeLer } from './Icones'
import { useCapa, versaoDaCapa } from './useCapa'

interface Props extends PropsDaEstante {
  /** 'madeira': capas de frente na prateleira. 'lombadas': livros de lado. */
  tipo: 'madeira' | 'lombadas'
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
  reordenar,
  arrastandoId,
  aoMoverPeloTeclado,
}: {
  livro: Livro
  tipo: Props['tipo']
  selecionado: boolean
  aoSelecionar: (id: string) => void
} & Pick<Props, 'aoAbrir' | 'reordenar' | 'arrastandoId' | 'aoMoverPeloTeclado'>) {
  const capa = useCapa(livro.id, versaoDaCapa(livro))
  const cor = livro.corLombada ?? '#6a4a32'
  // Como o gesto começou: guardado no toque, porque o foco seleciona o livro antes do clique chegar.
  const gesto = useRef({ toque: false, jaSelecionado: false })

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

  function aoClicar() {
    const { toque, jaSelecionado } = gesto.current
    gesto.current = { toque: false, jaSelecionado: false }
    if (reordenar.arrastou.current) {
      reordenar.arrastou.current = false
      return
    }
    // No toque, o primeiro toque só puxa o livro; o segundo abre.
    if (toque && !jaSelecionado) aoSelecionar(livro.id)
    else aoAbrir(livro.id)
  }

  const estilo = {
    '--proporcao': proporcaoNaEstante(livro.proporcaoCapa),
    '--espessura': `${espessuraDaLombada(livro.totalPaginas)}px`,
    '--cor-lombada': cor,
    '--cor-letra': textoSobre(cor),
  } as CSSProperties
  const arrastando = arrastandoId === livro.id
  // Durante um arrasto nenhum livro fica aberto: a prateleira não pode mudar de forma sob o dedo.
  const aberto = selecionado && arrastandoId === null

  return (
    <li className={`volume volume-${tipo}${aberto ? ' selecionado' : ''}${arrastando ? ' arrastando' : ''}`} style={estilo} data-livro={livro.id}>
      <button
        type="button"
        className="volume-botao"
        aria-label={`${livro.titulo}${livro.autor ? `, de ${livro.autor}` : ''}`}
        onClick={aoClicar}
        onKeyDown={(e) => teclaDeMover(e, livro.id, aoMoverPeloTeclado)}
        onPointerDown={(e) => {
          gesto.current = { toque: e.pointerType !== 'mouse', jaSelecionado: selecionado }
          reordenar.aoApertar(e, livro.id)
        }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && arrastandoId === null && aoSelecionar(livro.id)}
        onFocus={() => arrastandoId === null && aoSelecionar(livro.id)}
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

export function Prateleiras({ livros, tipo, aoAbrir, aoVerDetalhes, reordenar, arrastandoId, aoMoverPeloTeclado }: Props) {
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
            reordenar={reordenar}
            arrastandoId={arrastandoId}
            aoMoverPeloTeclado={aoMoverPeloTeclado}
          />
        ))}
      </ul>

      {selecionado && (
        <div className="ficha-volume" aria-live="polite">
          <div className="ficha-volume-texto">
            <strong>{selecionado.titulo}</strong>
            <span>
              {[selecionado.autor, selecionado.status === 'lido' ? 'lido' : selecionado.ultimaLeitura !== null ? `${porcento}%` : ''].filter(Boolean).join(', ')}
            </span>
            {selecionado.avaliacao !== null && <EstrelasFixas valor={selecionado.avaliacao} />}
          </div>
          <div className="ficha-volume-acoes">
            <button type="button" className="botao-quadrado botao-quadrado-principal" onClick={() => aoAbrir(selecionado.id)} aria-label={`Ler ${selecionado.titulo}`} title="Ler">
              <IconeLer />
            </button>
            <button type="button" className="botao-quadrado" onClick={() => aoVerDetalhes(selecionado.id)} aria-label={`Detalhes de ${selecionado.titulo}`} title="Detalhes">
              <IconeDetalhes />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
