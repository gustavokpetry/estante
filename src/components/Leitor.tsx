import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { db, novoId, salvarConfiguracao } from '../lib/db'
import { registrarLeitura } from '../lib/estatisticas'
import { aberturaDe, paginaCanonica, rotuloPaginas } from '../lib/folhas'
import { CachePaginas } from '../lib/paginas'
import { abrirPdf, FalhaAoAbrirPdf, type PdfAberto } from '../lib/pdf'
import { voltarParaEstante } from '../lib/rota'
import { retangulosDoTermo } from '../lib/realce'
import { lerSumario, paginaDoDestino, type ItemSumario } from '../lib/sumario'
import { juntarRetangulos, normalizar } from '../lib/texto'
import type { CorDestaque, Destaque, FiltroPagina, Livro, ModoHorizontal, ModoLeitura, Retangulo } from '../lib/types'
import { ContextoPagina, type DadosDaLeitura } from './ContextoPagina'
import {
  IconeAnotacoes,
  IconeAparencia,
  IconeAvancar,
  IconeBusca,
  IconeCaneta,
  IconeCerto,
  IconeFechar,
  IconeMais,
  IconeMarcador,
  IconeMenos,
  IconeSairTelaCheia,
  IconeSumario,
  IconeTelaCheia,
  IconeVoltar,
} from './Icones'
import { CORES_DESTAQUE, PainelAnotacoes } from './PainelAnotacoes'
import { PainelBusca } from './PainelBusca'
import { Palco, ZOOM_MAXIMO, type ControlesPalco } from './Palco'

type Painel = 'nenhum' | 'aparencia' | 'sumario' | 'anotacoes' | 'busca'

/** Trecho selecionado no modo anotação, pronto para virar destaque. */
interface Selecao {
  pagina: number
  retangulos: Retangulo[]
  texto: string
  x: number
  y: number
}

/** Lê a seleção do navegador e a converte em frações da página onde ela começa. */
function lerSelecao(): Selecao | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
  const faixa = sel.getRangeAt(0)
  const no = faixa.startContainer
  const inicio = no.nodeType === Node.ELEMENT_NODE ? (no as Element) : no.parentElement
  const caixa = inicio?.closest<HTMLElement>('.pagina-caixa')
  if (!caixa || !inicio?.closest('.textLayer')) return null
  const base = caixa.getBoundingClientRect()
  const pedacos: Retangulo[] = []
  for (const r of faixa.getClientRects()) {
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    // Uma seleção pode invadir a página vizinha: fica só o que está nesta.
    if (r.width < 1 || r.height < 1 || cx < base.left || cx > base.right || cy < base.top || cy > base.bottom) continue
    pedacos.push({
      x: (r.left - base.left) / base.width,
      y: (r.top - base.top) / base.height,
      l: r.width / base.width,
      a: r.height / base.height,
    })
  }
  const retangulos = juntarRetangulos(pedacos)
  const texto = sel.toString().replace(/\s+/g, ' ').trim()
  if (retangulos.length === 0 || !texto) return null
  const fim = faixa.getBoundingClientRect()
  return { pagina: Number(caixa.dataset.numero), retangulos, texto, x: fim.left + fim.width / 2, y: fim.bottom }
}

interface Aberto {
  livro: Livro
  pdf: PdfAberto
  cache: CachePaginas
  /** Largura dividida pela altura de uma página comum do livro. */
  proporcao: number
  total: number
}

const MODOS: Array<{ valor: ModoLeitura; nome: string; descricao: string }> = [
  { valor: '3d', nome: 'Virada com dobra', descricao: '' },
  { valor: 'simples', nome: 'Duas páginas', descricao: '' },
  { valor: 'unica', nome: 'Página única', descricao: '' },
]

const ABERTURAS: Array<{ valor: ModoHorizontal | null; nome: string; descricao: string }> = [
  { valor: null, nome: 'Automática', descricao: '' },
  { valor: 'topo', nome: 'No topo', descricao: '' },
  { valor: 'uma', nome: 'Uma página', descricao: '' },
  { valor: 'duas', nome: 'Duas páginas', descricao: '' },
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
  const [painel, setPainel] = useState<Painel>('nenhum')
  const [anotando, setAnotando] = useState(false)
  const [selecao, setSelecao] = useState<Selecao | null>(null)
  const [destaqueEmFoco, setDestaqueEmFoco] = useState<string | null>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [realces, setRealces] = useState<Map<number, Retangulo[]>>(new Map())
  const [fimDispensado, setFimDispensado] = useState(false)
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
  const marcadores = useLiveQuery(() => db.marcadores.where('livroId').equals(livroId).sortBy('pagina'), [livroId]) ?? []
  const notas = useLiveQuery(() => db.notas.where('livroId').equals(livroId).sortBy('pagina'), [livroId]) ?? []
  const destaques = useLiveQuery(() => db.destaques.where('livroId').equals(livroId).sortBy('pagina'), [livroId]) ?? []

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
          if (!cancelado) setErro('Livro não encontrado.')
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
        setErro(e instanceof FalhaAoAbrirPdf ? e.message : 'Não foi possível abrir.')
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

  const aberturaEscolhida = (livro ?? aberto?.livro)?.modoHorizontal ?? null

  const disposicao = useMemo(() => {
    const proporcao = aberto?.proporcao ?? 0.7
    const { largura, altura } = espaco
    if (largura <= 0 || altura <= 0) return null

    let duas: boolean
    let eixo: 'lado' | 'topo' = 'lado'
    if (horizontal) {
      // Livro deitado: vale a escolha feita para ele. No automático, duas
      // páginas só se a tela for larga a ponto de quase não diminuí-las.
      const tamanhoComUma = Math.min(largura, altura * proporcao)
      const tamanhoComDuas = Math.min(largura / 2, altura * proporcao)
      const abertura = aberturaEscolhida ?? (tamanhoComDuas >= tamanhoComUma * 0.8 ? 'duas' : 'uma')
      duas = abertura === 'duas'
      if (abertura === 'topo') eixo = 'topo'
    } else {
      // Livro em pé: duas páginas só quando cabem com folga (tela deitada).
      duas = modo !== 'unica' && largura >= altura * 1.05
    }

    const colunas = duas ? 2 : 1
    const alturaPagina = Math.min(altura, largura / colunas / proporcao)
    return {
      duas,
      eixo,
      largura: Math.floor(alturaPagina * proporcao),
      altura: Math.floor(alturaPagina),
    }
  }, [aberto?.proporcao, espaco, modo, horizontal, aberturaEscolhida])

  const duas = disposicao?.duas ?? false
  const noTopo = disposicao?.eixo === 'topo'
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

  // --- O que está na tela ---------------------------------------------------

  const visiveis = useMemo(() => {
    if (!duas) return [pagina]
    const { esquerda, direita } = aberturaDe(pagina, total)
    return [esquerda, direita].filter((n): n is number => n !== null)
  }, [pagina, total, duas])

  // --- Tempo de leitura (estatísticas) -------------------------------------

  const medidor = useRef({ segundos: 0, paginas: 0, ultimoToque: 0, ultimaMarca: 0, vistas: new Set<number>() })

  useEffect(() => {
    if (!aberto) return
    const m = medidor.current
    m.ultimoToque = m.ultimaMarca = Date.now()
    m.vistas = new Set()
    const tocar = () => {
      m.ultimoToque = Date.now()
    }
    const gravar = () => {
      const segundos = Math.round(m.segundos)
      if (segundos < 1 && m.paginas === 0) return
      void registrarLeitura(livroId, segundos, m.paginas)
      m.segundos -= segundos
      m.paginas = 0
    }
    const contar = () => {
      const agora = Date.now()
      const passou = Math.min(10, (agora - m.ultimaMarca) / 1000)
      m.ultimaMarca = agora
      // Só conta com a aba à vista e com algum sinal de vida nos últimos 2 minutos.
      if (document.visibilityState === 'visible' && agora - m.ultimoToque < 120_000) m.segundos += passou
      if (m.segundos >= 30) gravar()
    }
    const relogio = setInterval(contar, 5000)
    const aoEsconder = () => {
      contar()
      gravar()
    }
    const eventos = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    eventos.forEach((e) => window.addEventListener(e, tocar, { passive: true }))
    document.addEventListener('visibilitychange', aoEsconder)
    return () => {
      clearInterval(relogio)
      eventos.forEach((e) => window.removeEventListener(e, tocar))
      document.removeEventListener('visibilitychange', aoEsconder)
      contar()
      gravar()
    }
  }, [aberto, livroId])

  // Cada página nova que aparece conta como lida (a de abertura não conta).
  useEffect(() => {
    const m = medidor.current
    const primeira = m.vistas.size === 0
    for (const n of visiveis) {
      if (m.vistas.has(n)) continue
      m.vistas.add(n)
      if (!primeira) m.paginas++
    }
    m.ultimoToque = Date.now()
  }, [visiveis])

  // --- Anotações ------------------------------------------------------------

  const alternarMarcador = useCallback(async () => {
    const existentes = await db.marcadores.where('livroId').equals(livroId).toArray()
    const naTela = existentes.filter((m) => visiveis.includes(m.pagina))
    if (naTela.length > 0) await db.marcadores.bulkDelete(naTela.map((m) => m.id))
    else await db.marcadores.add({ id: novoId(), livroId, pagina: visiveis[0], nome: `Página ${visiveis[0]}`, criadoEm: Date.now() })
  }, [livroId, visiveis])

  // No modo anotação, acompanha o texto selecionado para oferecer as cores.
  useEffect(() => {
    if (!anotando) {
      setSelecao(null)
      return
    }
    let espera: ReturnType<typeof setTimeout>
    const aoMudar = () => {
      clearTimeout(espera)
      espera = setTimeout(() => setSelecao(lerSelecao()), 180)
    }
    document.addEventListener('selectionchange', aoMudar)
    return () => {
      clearTimeout(espera)
      document.removeEventListener('selectionchange', aoMudar)
    }
  }, [anotando])

  const destacar = async (cor: CorDestaque, comNota: boolean) => {
    if (!selecao) return
    const novo: Destaque = {
      id: novoId(),
      livroId,
      pagina: selecao.pagina,
      retangulos: selecao.retangulos,
      texto: selecao.texto.slice(0, 2000),
      cor,
      nota: '',
      criadoEm: Date.now(),
    }
    await db.destaques.add(novo)
    window.getSelection()?.removeAllRanges()
    setSelecao(null)
    if (comNota) {
      setDestaqueEmFoco(novo.id)
      setPainel('anotacoes')
    }
  }

  // Realce do termo buscado nas páginas visíveis, enquanto a busca está aberta.
  useEffect(() => {
    const alvo = normalizar(termoBusca.trim())
    if (!aberto || painel !== 'busca' || alvo.length < 2) {
      setRealces((atual) => (atual.size === 0 ? atual : new Map()))
      return
    }
    let vivo = true
    void Promise.all(visiveis.map(async (n) => [n, await retangulosDoTermo(aberto.pdf.doc, n, alvo)] as const)).then((pares) => {
      if (vivo) setRealces(new Map(pares))
    })
    return () => {
      vivo = false
    }
  }, [aberto, painel, termoBusca, visiveis])

  const dadosDaLeitura = useMemo<DadosDaLeitura>(() => {
    const porPagina = new Map<number, Destaque[]>()
    for (const d of destaques) porPagina.set(d.pagina, [...(porPagina.get(d.pagina) ?? []), d])
    return {
      doc: aberto?.pdf.doc ?? null,
      destaques: porPagina,
      realces,
      marcadas: new Set(marcadores.map((m) => m.pagina)),
      anotando,
      aoTocarDestaque: (id: string) => {
        setDestaqueEmFoco(id)
        setPainel('anotacoes')
      },
    }
  }, [aberto, destaques, realces, marcadores, anotando])

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
      if (e.key === 'Escape' && anotando) {
        setAnotando(false)
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
        case 'ArrowDown':
          if (!noTopo || zoom > 1) return
          e.preventDefault()
          palco.current?.avancar()
          break
        case 'ArrowUp':
          if (!noTopo || zoom > 1) return
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
        <button type="button" className="botao-redondo" onClick={voltarParaEstante} aria-label="Voltar para a estante" title="Voltar para a estante">
          <IconeVoltar width={28} height={28} />
        </button>
      </div>
    )
  }

  const titulo = livro?.titulo ?? aberto?.livro.titulo ?? ''
  const tresD = modo === '3d'
  const alternarPainel = (qual: Painel) => setPainel(painel === qual ? 'nenhum' : qual)
  const paginaMarcada = marcadores.some((m) => visiveis.includes(m.pagina))
  const semTexto = (livro ?? aberto?.livro)?.temTexto === false
  const noFim = aberto !== null && total > 1 && paginaCanonica(total, total, duas) === pagina
  const sugerirLido = noFim && !fimDispensado && livro !== undefined && livro.status !== 'lido'

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
              onClick={() => alternarPainel('sumario')}
            >
              <IconeSumario />
            </button>
          )}
          <button type="button" className="botao-icone" aria-label="Buscar no livro" title="Buscar no livro" aria-expanded={painel === 'busca'} onClick={() => alternarPainel('busca')}>
            <IconeBusca />
          </button>
          <button
            type="button"
            className="botao-icone"
            aria-label={paginaMarcada ? 'Tirar o marcador desta página' : 'Marcar esta página'}
            title={paginaMarcada ? 'Tirar o marcador desta página' : 'Marcar esta página'}
            aria-pressed={paginaMarcada}
            disabled={!aberto}
            onClick={() => void alternarMarcador()}
          >
            <IconeMarcador cheio={paginaMarcada} />
          </button>
          <button
            type="button"
            className={`botao-icone${anotando ? ' ligado' : ''}`}
            aria-label="Modo anotação: selecionar e destacar texto"
            title="Modo anotação: selecionar e destacar texto"
            aria-pressed={anotando}
            disabled={!aberto}
            onClick={() => setAnotando(!anotando)}
          >
            <IconeCaneta />
          </button>
          <button type="button" className="botao-icone" aria-label="Marcadores e anotações" title="Marcadores e anotações" aria-expanded={painel === 'anotacoes'} onClick={() => alternarPainel('anotacoes')}>
            <IconeAnotacoes />
          </button>
          <button
            type="button"
            className="botao-icone"
            aria-label="Aparência da leitura"
            title="Aparência da leitura"
            aria-expanded={painel === 'aparencia'}
            onClick={() => alternarPainel('aparencia')}
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

      {anotando && (
        <div className="faixa-anotacao" role="status">
          <span>{semTexto ? 'PDF de imagens: sem texto para selecionar.' : 'Selecione um trecho para destacar.'}</span>
          <button type="button" className="botao-icone botao-icone-pequeno" onClick={() => setAnotando(false)} aria-label="Sair do modo anotação" title="Sair do modo anotação">
            <IconeFechar />
          </button>
        </div>
      )}

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
          {!aberto && <p className="leitor-abrindo">Abrindo…</p>}
          {aberto && disposicao && (
            <ContextoPagina.Provider value={dadosDaLeitura}>
            <Palco
              ref={palco}
              cache={aberto.cache}
              total={aberto.total}
              pagina={pagina}
              aoMudarPagina={mudarPagina}
              duas={disposicao.duas}
              eixo={disposicao.eixo}
              largura={disposicao.largura}
              altura={disposicao.altura}
              tresD={tresD}
              filtro={filtro ?? 'nenhum'}
              anotando={anotando}
              aoMudarZoom={setZoom}
            />
            </ContextoPagina.Provider>
          )}
        </div>

        {painel === 'anotacoes' && (
          <PainelAnotacoes
            livroId={livroId}
            visiveis={visiveis}
            marcadores={marcadores}
            notas={notas}
            destaques={destaques}
            destaqueEmFoco={destaqueEmFoco}
            aoIr={mudarPagina}
            aoFechar={() => setPainel('nenhum')}
          />
        )}

        {painel === 'busca' && (
          <PainelBusca
            livroId={livroId}
            temTexto={(livro ?? aberto?.livro)?.temTexto ?? null}
            termo={termoBusca}
            aoMudarTermo={setTermoBusca}
            aoIr={mudarPagina}
            aoFechar={() => setPainel('nenhum')}
          />
        )}

        {painel === 'aparencia' && (
          <section className="painel painel-aparencia" aria-label="Aparência da leitura">
            <header className="painel-topo">
              <h2>Leitura</h2>
              <button type="button" className="botao-icone botao-icone-pequeno" onClick={() => setPainel('nenhum')} aria-label="Fechar aparência">
                <IconeFechar />
              </button>
            </header>
            <div className="painel-corpo">
              {horizontal && (
                <fieldset className="opcoes">
                  <legend>Abertura</legend>
                  {ABERTURAS.map((a) => (
                    <label key={a.valor ?? 'auto'} className="opcao">
                      <input
                        type="radio"
                        name="abertura"
                        checked={aberturaEscolhida === a.valor}
                        onChange={() => void db.livros.update(livroId, { modoHorizontal: a.valor })}
                      />
                      <span>{a.nome}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              <fieldset className="opcoes">
                <legend>Virada</legend>
                {MODOS.filter((m) => !horizontal || m.valor !== 'unica').map((m) => (
                  <label key={m.valor} className="opcao">
                    <input
                      type="radio"
                      name="modo"
                      checked={horizontal ? (modo === '3d') === (m.valor === '3d') : modo === m.valor}
                      onChange={() => escolherModo(m.valor)}
                    />
                    <span>{horizontal && m.valor === 'simples' ? 'Troca simples' : m.nome}</span>
                  </label>
                ))}
              </fieldset>
              <label className="opcao opcao-solta">
                <input type="checkbox" checked={soNesteLivro} onChange={(e) => alternarSoNesteLivro(e.target.checked)} />
                <span>Só neste livro</span>
              </label>

              <fieldset className="opcoes">
                <legend>Cor</legend>
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
              </div>
            </div>
          </section>
        )}
      </div>

      {selecao && anotando && (
        <div
          className="barra-selecao"
          role="toolbar"
          aria-label="Destacar o trecho selecionado"
          style={{
            left: Math.min(Math.max(8, selecao.x - 130), window.innerWidth - 268),
            top: selecao.y + 60 > window.innerHeight ? Math.max(8, selecao.y - 110) : selecao.y + 10,
          }}
          // Clicar na barra não pode desfazer a seleção.
          onPointerDown={(e) => e.preventDefault()}
        >
          {CORES_DESTAQUE.map((c) => (
            <button key={c.valor} type="button" className={`cor-destaque destaque-${c.valor}`} aria-label={`Destacar em ${c.nome.toLowerCase()}`} title={c.nome} onClick={() => void destacar(c.valor, false)} />
          ))}
          <button type="button" className="botao-icone botao-icone-pequeno" onClick={() => void destacar('amarelo', true)} aria-label="Destacar e escrever uma nota" title="Destacar com nota">
            <IconeAnotacoes />
          </button>
        </div>
      )}

      {sugerirLido && (
        <div className="faixa-fim" role="status">
          <span>Marcar como lido?</span>
          <button type="button" className="botao-icone botao-icone-pequeno faixa-sim" onClick={() => void db.livros.update(livroId, { status: 'lido' })} aria-label="Marcar como lido" title="Marcar como lido">
            <IconeCerto />
          </button>
          <button type="button" className="botao-icone botao-icone-pequeno" onClick={() => setFimDispensado(true)} aria-label="Agora não" title="Agora não">
            <IconeFechar />
          </button>
        </div>
      )}

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
          <span aria-hidden="true">/ {total}</span>
        </label>
      </footer>
    </div>
  )
}
