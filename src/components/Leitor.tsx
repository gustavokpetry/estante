import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { db, salvarConfiguracao } from '../lib/db'
import { paginaCanonica, rotuloPaginas } from '../lib/folhas'
import { CachePaginas } from '../lib/paginas'
import { abrirPdf, FalhaAoAbrirPdf, type PdfAberto } from '../lib/pdf'
import { voltarParaEstante } from '../lib/rota'
import { lerSumario, paginaDoDestino, type ItemSumario } from '../lib/sumario'
import type { FiltroPagina, Livro, ModoLeitura } from '../lib/types'
import {
  IconeAparencia,
  IconeAvancar,
  IconeFechar,
  IconeMais,
  IconeMenos,
  IconeSairTelaCheia,
  IconeSumario,
  IconeTelaCheia,
  IconeVoltar,
} from './Icones'
import { Palco, ZOOM_MAXIMO, type ControlesPalco } from './Palco'

interface Aberto {
  livro: Livro
  pdf: PdfAberto
  cache: CachePaginas
  /** Largura dividida pela altura de uma página comum do livro. */
  proporcao: number
  total: number
}

const MODOS: Array<{ valor: ModoLeitura; nome: string; descricao: string }> = [
  { valor: '3d', nome: 'Virada de página', descricao: 'A folha dobra e vira, como no papel.' },
  { valor: 'simples', nome: 'Livro simples', descricao: 'Duas páginas lado a lado, troca rápida.' },
  { valor: 'unica', nome: 'Página única', descricao: 'Uma página por vez, maior.' },
]

const FILTROS: Array<{ valor: FiltroPagina; nome: string }> = [
  { valor: 'nenhum', nome: 'Original' },
  { valor: 'sepia', nome: 'Sépia' },
  { valor: 'noite', nome: 'Noite' },
]

const PASSOS_ZOOM = [1, 1.25, 1.5, 2, 2.5, 3, ZOOM_MAXIMO]

export function Leitor({ livroId }: { livroId: string }) {
  const [aberto, setAberto] = useState<Aberto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [painel, setPainel] = useState<'nenhum' | 'aparencia' | 'sumario'>('nenhum')
  const [sumario, setSumario] = useState<ItemSumario[]>([])
  const [telaCheia, setTelaCheia] = useState(false)
  const [espaco, setEspaco] = useState({ largura: 0, altura: 0 })
  const [campoPagina, setCampoPagina] = useState<string | null>(null)

  const area = useRef<HTMLDivElement>(null)
  const palco = useRef<ControlesPalco>(null)
  const paginaRef = useRef(1)
  const desistiuDoCampo = useRef(false)

  // O livro "ao vivo": muda quando o modo só deste livro é alterado.
  const livro = useLiveQuery(() => db.livros.get(livroId), [livroId])
  const modoPadrao = useLiveQuery(
    () => db.configuracoes.get('modoLeitura').then((c) => (c?.valor as ModoLeitura | undefined) ?? '3d'),
    [],
  )
  const filtro = useLiveQuery(
    () => db.configuracoes.get('filtroPagina').then((c) => (c?.valor as FiltroPagina | undefined) ?? 'nenhum'),
    [],
  )

  // --- Abrir o livro --------------------------------------------------------

  useEffect(() => {
    let cancelado = false
    let recursos: { pdf: PdfAberto; cache: CachePaginas } | null = null
    setAberto(null)
    setErro(null)
    setSumario([])
    setPainel('nenhum')

    void (async () => {
      try {
        const registro = await db.livros.get(livroId)
        const arquivo = await db.arquivos.get(livroId)
        if (!registro || !arquivo) {
          if (!cancelado) setErro('Este livro não está mais na estante.')
          return
        }
        const pdf = await abrirPdf(await arquivo.blob.arrayBuffer())
        if (cancelado) {
          void pdf.fechar()
          return
        }
        const cache = new CachePaginas(pdf.doc)
        recursos = { pdf, cache }

        const total = pdf.doc.numPages
        const amostra = await pdf.doc.getPage(total > 2 ? 2 : 1)
        const base = amostra.getViewport({ scale: 1 })
        if (cancelado) return

        const inicial = Math.min(Math.max(1, registro.paginaAtual || 1), total)
        paginaRef.current = inicial
        setPagina(inicial)
        setAberto({ livro: registro, pdf, cache, proporcao: base.width / base.height, total })

        await db.livros.update(livroId, {
          ultimaLeitura: Date.now(),
          ...(registro.status === 'quero-ler' ? { status: 'lendo' as const } : {}),
        })
        const itens = await lerSumario(pdf.doc)
        if (!cancelado) setSumario(itens)
      } catch (e) {
        if (cancelado) return
        setErro(e instanceof FalhaAoAbrirPdf ? e.message : 'Não foi possível abrir este livro.')
      }
    })()

    return () => {
      cancelado = true
      // Guarda a página onde parou antes de fechar.
      void db.livros.update(livroId, { paginaAtual: paginaRef.current, ultimaLeitura: Date.now() }).catch(() => {})
      recursos?.cache.encerrar()
      void recursos?.pdf.fechar()
    }
  }, [livroId])

  useEffect(() => {
    const anterior = document.title
    if (aberto) document.title = `${livro?.titulo ?? aberto.livro.titulo} | Estante`
    return () => {
      document.title = anterior
    }
  }, [aberto, livro?.titulo])

  // --- Tamanho disponível e disposição das páginas -------------------------

  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const medir = () => {
      const estilo = getComputedStyle(el)
      const largura = el.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
      const altura = el.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom)
      setEspaco((atual) =>
        Math.abs(atual.largura - largura) < 1 && Math.abs(atual.altura - altura) < 1 ? atual : { largura, altura },
      )
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [aberto !== null])

  const modo: ModoLeitura = livro?.modoLeitura ?? modoPadrao ?? '3d'
  const horizontal = (livro ?? aberto?.livro)?.orientacao === 'horizontal'

  const disposicao = useMemo(() => {
    const proporcao = aberto?.proporcao ?? 0.7
    const { largura, altura } = espaco
    if (largura <= 0 || altura <= 0) return null
    // Duas páginas só quando cabem com folga: tela deitada e livro vertical.
    const duas = modo !== 'unica' && !horizontal && largura >= altura * 1.05
    const colunas = duas ? 2 : 1
    const alturaPagina = Math.min(altura, largura / colunas / proporcao)
    return {
      duas,
      largura: Math.floor(alturaPagina * proporcao),
      altura: Math.floor(alturaPagina),
    }
  }, [aberto?.proporcao, espaco, modo, horizontal])

  const duas = disposicao?.duas ?? false
  const total = aberto?.total ?? 1

  // Ao trocar entre uma e duas páginas, ajusta para o começo da abertura.
  useEffect(() => {
    if (!aberto) return
    setPagina((p) => paginaCanonica(p, aberto.total, duas))
  }, [aberto, duas])

  // --- Página atual ---------------------------------------------------------

  const mudarPagina = useCallback(
    (n: number) => {
      setPagina(paginaCanonica(n, total, duas))
    },
    [total, duas],
  )

  // Salva o progresso pouco depois de cada mudança de página.
  useEffect(() => {
    paginaRef.current = pagina
    if (!aberto) return
    const espera = setTimeout(() => {
      void db.livros.update(livroId, { paginaAtual: pagina, ultimaLeitura: Date.now() })
    }, 500)
    return () => clearTimeout(espera)
  }, [pagina, aberto, livroId])

  // --- Zoom e tela cheia ----------------------------------------------------

  const maisZoom = () => palco.current?.definirZoom(PASSOS_ZOOM.find((z) => z > zoom + 0.01) ?? ZOOM_MAXIMO)
  const menosZoom = () => palco.current?.definirZoom([...PASSOS_ZOOM].reverse().find((z) => z < zoom - 0.01) ?? 1)

  const podeTelaCheia = typeof document.documentElement.requestFullscreen === 'function'
  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])
  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }

  // --- Teclado --------------------------------------------------------------

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && painel !== 'nenhum') {
        setPainel('nenhum')
        return
      }
      const alvo = e.target as HTMLElement
      if (alvo.closest('input, textarea, select, [contenteditable]')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          palco.current?.avancar()
          break
        case ' ':
          if (alvo.closest('button')) return
          e.preventDefault()
          if (e.shiftKey) palco.current?.voltar()
          else palco.current?.avancar()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          palco.current?.voltar()
          break
        case 'Home':
          e.preventDefault()
          mudarPagina(1)
          break
        case 'End':
          e.preventDefault()
          mudarPagina(total)
          break
        case '+':
        case '=':
          maisZoom()
          break
        case '-':
          menosZoom()
          break
        case '0':
          palco.current?.definirZoom(1)
          break
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  })

  // --- Preferências ---------------------------------------------------------

  const soNesteLivro = livro?.modoLeitura != null
  const escolherModo = (novo: ModoLeitura) => {
    if (soNesteLivro) void db.livros.update(livroId, { modoLeitura: novo })
    else void salvarConfiguracao('modoLeitura', novo)
  }
  const alternarSoNesteLivro = (ligado: boolean) => {
    void db.livros.update(livroId, { modoLeitura: ligado ? modo : null })
  }

  const irParaItem = async (item: ItemSumario) => {
    if (!aberto) return
    const destino = await paginaDoDestino(aberto.pdf.doc, item.destino)
    if (destino) {
      mudarPagina(destino)
      if (window.innerWidth < 900) setPainel('nenhum')
    }
  }

  const confirmarCampoPagina = () => {
    if (desistiuDoCampo.current) {
      desistiuDoCampo.current = false
      setCampoPagina(null)
      return
    }
    if (campoPagina === null) return
    const n = parseInt(campoPagina, 10)
    if (Number.isFinite(n)) mudarPagina(n)
    setCampoPagina(null)
  }

  // --- Tela -----------------------------------------------------------------

  if (erro) {
    return (
      <div className="leitor leitor-aviso">
        <p>{erro}</p>
        <button type="button" className="botao botao-principal" onClick={voltarParaEstante}>
          Voltar para a estante
        </button>
      </div>
    )
  }

  const titulo = livro?.titulo ?? aberto?.livro.titulo ?? ''
  const tresD = modo === '3d'

  return (
    <div className="leitor">
      <header className="leitor-topo">
        <button type="button" className="botao-icone" onClick={voltarParaEstante} aria-label="Voltar para a estante" title="Voltar para a estante">
          <IconeVoltar />
        </button>
        <h1 className="leitor-titulo">{titulo}</h1>
        <div className="leitor-acoes">
          {sumario.length > 0 && (
            <button
              type="button"
              className="botao-icone"
              aria-label="Sumário"
              title="Sumário"
              aria-expanded={painel === 'sumario'}
              onClick={() => setPainel(painel === 'sumario' ? 'nenhum' : 'sumario')}
            >
              <IconeSumario />
            </button>
          )}
          <button
            type="button"
            className="botao-icone"
            aria-label="Aparência da leitura"
            title="Aparência da leitura"
            aria-expanded={painel === 'aparencia'}
            onClick={() => setPainel(painel === 'aparencia' ? 'nenhum' : 'aparencia')}
          >
            <IconeAparencia />
          </button>
          {podeTelaCheia && (
            <button
              type="button"
              className="botao-icone"
              onClick={alternarTelaCheia}
              aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
              title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {telaCheia ? <IconeSairTelaCheia /> : <IconeTelaCheia />}
            </button>
          )}
        </div>
      </header>

      <div className="leitor-meio">
        {painel === 'sumario' && (
          <nav className="painel painel-sumario" aria-label="Sumário">
            <header className="painel-topo">
              <h2>Sumário</h2>
              <button type="button" className="botao-icone botao-icone-pequeno" onClick={() => setPainel('nenhum')} aria-label="Fechar sumário">
                <IconeFechar />
              </button>
            </header>
            <ul className="sumario-lista">
              {sumario.map((item, i) => (
                <li key={i}>
                  <button type="button" style={{ paddingLeft: 16 + item.nivel * 16 }} onClick={() => void irParaItem(item)}>
                    {item.titulo}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div ref={area} className="leitor-area">
          {!aberto && <p className="leitor-abrindo">Abrindo o livro…</p>}
          {aberto && disposicao && (
            <Palco
              ref={palco}
              cache={aberto.cache}
              total={aberto.total}
              pagina={pagina}
              aoMudarPagina={mudarPagina}
              duas={disposicao.duas}
              largura={disposicao.largura}
              altura={disposicao.altura}
              tresD={tresD}
              filtro={filtro ?? 'nenhum'}
              aoMudarZoom={setZoom}
            />
          )}
        </div>

        {painel === 'aparencia' && (
          <section className="painel painel-aparencia" aria-label="Aparência da leitura">
            <header className="painel-topo">
              <h2>Aparência</h2>
              <button type="button" className="botao-icone botao-icone-pequeno" onClick={() => setPainel('nenhum')} aria-label="Fechar aparência">
                <IconeFechar />
              </button>
            </header>
            <div className="painel-corpo">
              <fieldset className="opcoes">
                <legend>Como as páginas viram</legend>
                {MODOS.map((m) => (
                  <label key={m.valor} className="opcao">
                    <input type="radio" name="modo" checked={modo === m.valor} onChange={() => escolherModo(m.valor)} />
                    <span>
                      <strong>{m.nome}</strong>
                      <small>{m.descricao}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <label className="opcao opcao-solta">
                <input type="checkbox" checked={soNesteLivro} onChange={(e) => alternarSoNesteLivro(e.target.checked)} />
                <span>
                  <strong>Usar este modo só neste livro</strong>
                  <small>Os outros livros seguem o modo padrão.</small>
                </span>
              </label>
              {horizontal && modo !== 'unica' && (
                <p className="painel-nota">Este livro é horizontal, então aparece uma página por vez. Os modos próprios para ele chegam na versão 1.2.</p>
              )}

              <fieldset className="opcoes">
                <legend>Cor das páginas</legend>
                <div className="segmentos">
                  {FILTROS.map((f) => (
                    <label key={f.valor} className={`segmento${(filtro ?? 'nenhum') === f.valor ? ' ativo' : ''}`}>
                      <input
                        type="radio"
                        name="filtro"
                        checked={(filtro ?? 'nenhum') === f.valor}
                        onChange={() => void salvarConfiguracao('filtroPagina', f.valor)}
                      />
                      {f.nome}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="opcoes">
                <p className="opcoes-titulo">Zoom</p>
                <div className="zoom-linha">
                  <button type="button" className="botao-icone" onClick={menosZoom} disabled={zoom <= 1} aria-label="Diminuir zoom">
                    <IconeMenos />
                  </button>
                  <button type="button" className="botao zoom-valor" onClick={() => palco.current?.definirZoom(1)} aria-label={`Zoom em ${Math.round(zoom * 100)}%. Voltar para a página inteira`}>
                    {Math.round(zoom * 100)}%
                  </button>
                  <button type="button" className="botao-icone" onClick={maisZoom} disabled={zoom >= ZOOM_MAXIMO} aria-label="Aumentar zoom">
                    <IconeMais />
                  </button>
                </div>
                {tresD && zoom > 1 && <p className="painel-nota">Com zoom, a página fica plana para você poder arrastá-la. A virada volta em 100%.</p>}
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="leitor-base">
        <button type="button" className="botao-icone" onClick={() => palco.current?.voltar()} disabled={!aberto || pagina <= 1} aria-label="Página anterior">
          <IconeVoltar />
        </button>
        <input
          className="trilho"
          type="range"
          min={1}
          max={total}
          step={1}
          value={pagina}
          disabled={!aberto || total <= 1}
          aria-label="Posição no livro"
          aria-valuetext={`${rotuloPaginas(pagina, total, duas)} de ${total}`}
          onChange={(e) => mudarPagina(Number(e.target.value))}
        />
        <button
          type="button"
          className="botao-icone"
          onClick={() => palco.current?.avancar()}
          disabled={!aberto || paginaCanonica(total, total, duas) <= pagina}
          aria-label="Próxima página"
        >
          <IconeAvancar />
        </button>
        <label className="ir-para">
          <span className="so-leitor-de-tela">Ir para a página</span>
          <input
            type="text"
            inputMode="numeric"
            value={campoPagina ?? String(pagina)}
            disabled={!aberto}
            onFocus={(e) => {
              setCampoPagina(String(pagina))
              e.target.select()
            }}
            onChange={(e) => setCampoPagina(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onBlur={confirmarCampoPagina}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                desistiuDoCampo.current = true
                ;(e.target as HTMLInputElement).blur()
              }
            }}
          />
          <span aria-hidden="true">de {total}</span>
        </label>
      </footer>
    </div>
  )
}
