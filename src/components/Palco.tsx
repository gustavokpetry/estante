import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as EventoPonteiro,
} from 'react'
import {
  calcularDobra,
  calcularDobraNoTopo,
  cantoDaFolha,
  cantoNoTopo,
  cantoOposto,
  cantoOpostoNoTopo,
  degradeAPartirDaReta,
  poligonoCss,
  type Canto,
  type Lado,
  type Ponto,
} from '../lib/dobra'
import { aberturaDe, paginaAnterior, proximaPagina } from '../lib/folhas'
import { LIMITES, type CachePaginas } from '../lib/paginas'
import type { FiltroPagina } from '../lib/types'
import { PaginaTela } from './PaginaTela'

export const ZOOM_MAXIMO = 4

export interface ControlesPalco {
  avancar: () => void
  voltar: () => void
  /** Define o zoom (1 = página inteira na tela). */
  definirZoom: (zoom: number) => void
}

interface Props {
  cache: CachePaginas
  total: number
  pagina: number
  aoMudarPagina: (pagina: number) => void
  /** Duas páginas lado a lado (true) ou uma por vez (false). */
  duas: boolean
  /** Onde fica a lombada: 'lado' (livro comum) ou 'topo' (bloco, calendário de mesa). */
  eixo: 'lado' | 'topo'
  /** Tamanho de uma página na tela, em pixels CSS, com zoom 1. */
  largura: number
  altura: number
  /** Virada com dobra (true) ou troca simples (false). */
  tresD: boolean
  filtro: FiltroPagina
  /** Modo anotação: as páginas ficam paradas para o texto poder ser selecionado. */
  anotando: boolean
  aoMudarZoom: (zoom: number) => void
}

interface Virada {
  lado: Lado
  canto: Canto
  frente: number | null
  verso: number | null
  fundo: number | null
  inicio: Ponto
  fim: Ponto
  destino: number
}

interface Gesto {
  id: number
  x0: number
  y0: number
  t0: number
  direcao: 1 | -1
  arrastando: boolean
}

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const freio = (t: number) => 1 - Math.pow(1 - t, 3)
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const arredondar = (v: number) => Math.max(64, Math.round(v / 32) * 32)

function prefereMenosMovimento(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const Palco = forwardRef<ControlesPalco, Props>(function Palco(
  { cache, total, pagina, aoMudarPagina, duas, eixo, largura, altura, tresD, filtro, anotando, aoMudarZoom },
  ref,
) {
  const [zoom, setZoom] = useState(1)
  const [zoomNitido, setZoomNitido] = useState(1)
  const [virada, setVirada] = useState<Virada | null>(null)
  const [sentido, setSentido] = useState<1 | -1>(1)

  const rolagem = useRef<HTMLDivElement>(null)
  const livro = useRef<HTMLDivElement>(null)
  const frente = useRef<HTMLDivElement>(null)
  const sombra = useRef<HTMLDivElement>(null)
  const versoCaixa = useRef<HTMLDivElement>(null)
  const verso = useRef<HTMLDivElement>(null)
  const brilho = useRef<HTMLDivElement>(null)

  const viradaAtual = useRef<Virada | null>(null)
  const pontoAtual = useRef<Ponto>({ x: 0, y: 0 })
  const animacao = useRef<{ quadro: number; aoFim: () => void } | null>(null)
  const gesto = useRef<Gesto | null>(null)
  const pinca = useRef<{ distancia: number; zoom: number } | null>(null)
  const ancora = useRef<{ fx: number; fy: number; x: number; y: number } | null>(null)
  const zoomRef = useRef(1)
  const paginaEsperada = useRef(pagina)
  const pendente = useRef<1 | -1 | null>(null)
  const engoleClique = useRef(false)

  const noTopo = eixo === 'topo'
  const dobraAtiva = tresD && zoom === 1 && !anotando
  const L = largura
  const A = altura
  const abertura = aberturaDe(pagina, total)

  // --- Zoom -----------------------------------------------------------------

  const aplicarZoom = useCallback(
    (novo: number, foco?: { x: number; y: number }) => {
      const z = limitar(Math.round(novo * 100) / 100, 1, ZOOM_MAXIMO)
      if (z === zoomRef.current) return
      const caixa = livro.current?.getBoundingClientRect()
      const janela = rolagem.current?.getBoundingClientRect()
      if (caixa && janela) {
        const x = foco?.x ?? janela.left + janela.width / 2
        const y = foco?.y ?? janela.top + janela.height / 2
        ancora.current = {
          fx: (x - caixa.left) / caixa.width,
          fy: (y - caixa.top) / caixa.height,
          x,
          y,
        }
      }
      zoomRef.current = z
      setZoom(z)
      aoMudarZoom(z)
    },
    [aoMudarZoom],
  )

  // Depois de mudar o zoom, mantém sob o dedo o mesmo ponto da página.
  useLayoutEffect(() => {
    const a = ancora.current
    const caixa = livro.current?.getBoundingClientRect()
    const area = rolagem.current
    if (!a || !caixa || !area) return
    area.scrollLeft += caixa.left + a.fx * caixa.width - a.x
    area.scrollTop += caixa.top + a.fy * caixa.height - a.y
    ancora.current = null
  }, [zoom])

  // Só redesenha em alta resolução quando o zoom para de mudar.
  useEffect(() => {
    const espera = setTimeout(() => setZoomNitido(zoom), 220)
    return () => clearTimeout(espera)
  }, [zoom])

  // --- Virada com dobra -----------------------------------------------------

  const desenharDobra = useCallback(
    (p: Ponto) => {
      const v = viradaAtual.current
      if (!v) return
      pontoAtual.current = p
      const d = noTopo
        ? calcularDobraNoTopo({ largura: L, altura: A, canto: v.canto, p })
        : calcularDobra({ largura: L, altura: A, lado: v.lado, canto: v.canto, p })
      const elFrente = frente.current
      const elSombra = sombra.current
      const elCaixa = versoCaixa.current
      const elVerso = verso.current
      const elBrilho = brilho.current
      if (!elFrente || !elCaixa || !elVerso) return

      if (d.plana) {
        elFrente.style.clipPath = 'none'
        elCaixa.style.display = 'none'
        if (elSombra) elSombra.style.display = 'none'
        return
      }

      elFrente.style.clipPath = poligonoCss(d.recorteFrente)
      elCaixa.style.display = 'block'
      elVerso.style.transform = `matrix(${d.matrizVerso.map((n) => n.toFixed(5)).join(',')})`
      elVerso.style.clipPath = poligonoCss(d.recorteVerso)

      const esquerda = v.lado > 0 ? 0 : -L
      if (elSombra) {
        // Sombra que a folha levantada projeta na página de baixo.
        elSombra.style.display = 'block'
        elSombra.style.clipPath = poligonoCss(d.recorteFundo)
        const alcance = L * (0.12 + 0.3 * Math.sin(Math.PI * d.progresso))
        elSombra.style.background = degradeAPartirDaReta(
          L,
          A,
          { x: d.meio.x - esquerda, y: d.meio.y },
          d.normal,
          [
            [`rgba(20,12,6,${(0.5 * (1 - d.progresso * 0.6)).toFixed(3)})`, 0],
            ['rgba(20,12,6,0)', alcance],
          ],
        )
      }

      if (elBrilho) {
        // Curvatura do papel: escuro junto à dobra, um brilho logo depois.
        const [ax, ay, bx, by, ox, oy] = d.matrizVerso
        const m = { x: -d.normal.x, y: -d.normal.y }
        const direcao = { x: ax * m.x + ay * m.y, y: bx * m.x + by * m.y }
        const rel = { x: d.meio.x - ox, y: d.meio.y - oy }
        const naDobra = { x: rel.x * ax + rel.y * ay, y: rel.x * bx + rel.y * by }
        elBrilho.style.background = degradeAPartirDaReta(L, A, naDobra, direcao, [
          ['rgba(20,12,6,0.28)', 0],
          ['rgba(255,250,235,0.22)', L * 0.07],
          ['rgba(20,12,6,0.07)', L * 0.3],
          ['rgba(20,12,6,0)', L * 0.75],
        ])
      }
    },
    [L, A, noTopo],
  )

  const pararAnimacao = useCallback((concluir: boolean) => {
    const a = animacao.current
    if (!a) return
    cancelAnimationFrame(a.quadro)
    animacao.current = null
    if (concluir) a.aoFim()
  }, [])

  const encerrarVirada = useCallback(
    (completa: boolean) => {
      const v = viradaAtual.current
      viradaAtual.current = null
      setVirada(null)
      if (v && completa) {
        paginaEsperada.current = v.destino
        aoMudarPagina(v.destino)
      }
    },
    [aoMudarPagina],
  )

  const animarAte = useCallback(
    (alvo: Ponto, duracao: number, emArco: boolean, aoFim: () => void) => {
      const v = viradaAtual.current
      if (!v) return
      const de = { ...pontoAtual.current }
      const comeco = performance.now()
      const sinal = v.canto === 'base' ? -1 : 1
      const passo = (agora: number) => {
        const bruto = limitar((agora - comeco) / duracao, 0, 1)
        const t = emArco ? suave(bruto) : freio(bruto)
        // O arco afasta o canto da borda enquanto a folha passa pelo meio da virada.
        const arco = emArco ? sinal * Math.sin(Math.PI * t) * 0.2 : 0
        const p = {
          x: de.x + (alvo.x - de.x) * t + (noTopo ? arco * L : 0),
          y: de.y + (alvo.y - de.y) * t + (noTopo ? 0 : arco * A),
        }
        desenharDobra(p)
        if (bruto < 1) {
          animacao.current = { quadro: requestAnimationFrame(passo), aoFim }
        } else {
          animacao.current = null
          aoFim()
        }
      }
      animacao.current = { quadro: requestAnimationFrame(passo), aoFim }
    },
    [L, A, noTopo, desenharDobra],
  )

  const montarVirada = useCallback(
    (direcao: 1 | -1, canto: Canto): Virada | null => {
      if (duas) {
        const { esquerda, direita } = aberturaDe(pagina, total)
        if (direcao === 1) {
          const destino = proximaPagina(pagina, total, true)
          if (destino === null || direita === null) return null
          return {
            lado: 1,
            canto,
            frente: direita,
            verso: direita + 1 <= total ? direita + 1 : null,
            fundo: direita + 2 <= total ? direita + 2 : null,
            inicio: cantoDaFolha(L, A, 1, canto),
            fim: cantoOposto(L, A, 1, canto),
            destino,
          }
        }
        const destino = paginaAnterior(pagina, total, true)
        if (destino === null || esquerda === null) return null
        return {
          lado: -1,
          canto,
          frente: esquerda,
          verso: esquerda - 1,
          fundo: esquerda - 2 >= 1 ? esquerda - 2 : null,
          inicio: cantoDaFolha(L, A, -1, canto),
          fim: cantoOposto(L, A, -1, canto),
          destino,
        }
      }
      // Uma página por vez: a folha sai pela lombada (à esquerda, ou acima no modo topo).
      const noLugar = noTopo ? cantoNoTopo(L, A, canto) : cantoDaFolha(L, A, 1, canto)
      const virada = noTopo ? cantoOpostoNoTopo(L, A, canto) : cantoOposto(L, A, 1, canto)
      if (direcao === 1) {
        if (pagina >= total) return null
        return {
          lado: 1,
          canto,
          frente: pagina,
          verso: null,
          fundo: pagina + 1,
          inicio: noLugar,
          fim: virada,
          destino: pagina + 1,
        }
      }
      if (pagina <= 1) return null
      // Voltar é a folha anterior retornando de onde saiu.
      return {
        lado: 1,
        canto,
        frente: pagina - 1,
        verso: null,
        fundo: pagina,
        inicio: virada,
        fim: noLugar,
        destino: pagina - 1,
      }
    },
    [duas, noTopo, pagina, total, L, A],
  )

  const iniciarVirada = useCallback((v: Virada, p: Ponto) => {
    viradaAtual.current = v
    pontoAtual.current = p
    setVirada(v)
  }, [])

  // Assim que as peças da virada entram na tela, já aparecem na posição certa.
  useLayoutEffect(() => {
    if (virada) desenharDobra(pontoAtual.current)
  }, [virada, desenharDobra])

  const virarAnimado = useCallback(
    (direcao: 1 | -1) => {
      if (animacao.current || viradaAtual.current) {
        // Termina a virada em andamento e deixa a nova para logo depois,
        // quando a página atual já estiver atualizada.
        pendente.current = direcao
        pararAnimacao(true)
        return
      }
      const v = montarVirada(direcao, 'base')
      if (!v) return
      iniciarVirada(v, v.inicio)
      // Espera um quadro para as peças existirem antes de animar.
      animacao.current = {
        quadro: requestAnimationFrame(() => animarAte(v.fim, 620, true, () => encerrarVirada(true))),
        aoFim: () => encerrarVirada(true),
      }
    },
    [pararAnimacao, montarVirada, iniciarVirada, animarAte, encerrarVirada],
  )

  useEffect(() => {
    if (pendente.current === null || viradaAtual.current) return
    const direcao = pendente.current
    pendente.current = null
    virarAnimado(direcao)
  }, [pagina, virada, virarAnimado])

  // --- Navegação ------------------------------------------------------------

  const irPara = useCallback(
    (direcao: 1 | -1) => {
      if (dobraAtiva && !prefereMenosMovimento()) {
        virarAnimado(direcao)
        return
      }
      const destino = direcao === 1 ? proximaPagina(pagina, total, duas) : paginaAnterior(pagina, total, duas)
      if (destino === null) return
      setSentido(direcao)
      paginaEsperada.current = destino
      aoMudarPagina(destino)
    },
    [dobraAtiva, virarAnimado, pagina, total, duas, aoMudarPagina],
  )

  useImperativeHandle(
    ref,
    () => ({
      avancar: () => irPara(1),
      voltar: () => irPara(-1),
      definirZoom: (z: number) => aplicarZoom(z),
    }),
    [irPara, aplicarZoom],
  )

  // Se a página mudar por fora (barra, sumário) no meio de uma virada, desfaz a virada.
  useEffect(() => {
    if (pagina !== paginaEsperada.current) {
      paginaEsperada.current = pagina
      if (viradaAtual.current) {
        pararAnimacao(false)
        viradaAtual.current = null
        setVirada(null)
      }
    }
  }, [pagina, pararAnimacao])

  // Mudou o tamanho ou o modo: qualquer virada em andamento perde o sentido.
  useEffect(() => {
    return () => {
      pararAnimacao(false)
      viradaAtual.current = null
      setVirada(null)
    }
  }, [L, A, duas, noTopo, dobraAtiva, pararAnimacao])

  // --- Gestos ---------------------------------------------------------------

  const pontoNoPalco = (e: { clientX: number; clientY: number }): Ponto => {
    const caixa = livro.current!.getBoundingClientRect()
    return { x: e.clientX - caixa.left - (duas ? L : 0), y: e.clientY - caixa.top }
  }

  function aoApertar(e: EventoPonteiro<HTMLDivElement>) {
    // No modo anotação o gesto é do navegador: selecionar texto.
    if (e.button !== 0 || pinca.current || anotando) return
    engoleClique.current = false
    const p = pontoNoPalco(e)
    // Onde o toque cai decide o sentido: perto da lombada volta, no resto avança.
    const direcao: 1 | -1 = duas ? (p.x < 0 ? -1 : 1) : (noTopo ? p.y < A * 0.3 : p.x < L * 0.3) ? -1 : 1
    gesto.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), direcao, arrastando: false }
    // Sobre os botões das bordas não capturamos o ponteiro, para o clique deles funcionar.
    const sobreBotao = (e.target as HTMLElement).closest('button') !== null
    if (!sobreBotao && (zoom === 1 || e.pointerType === 'mouse')) e.currentTarget.setPointerCapture(e.pointerId)
  }

  function aoMover(e: EventoPonteiro<HTMLDivElement>) {
    const g = gesto.current
    if (!g || g.id !== e.pointerId) return
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0

    if (zoom > 1) {
      // Com zoom, o mouse arrasta a página (no toque, o próprio navegador rola).
      if (e.pointerType === 'mouse' && rolagem.current) {
        rolagem.current.scrollLeft -= e.movementX
        rolagem.current.scrollTop -= e.movementY
        g.arrastando = true
      }
      return
    }
    if (!dobraAtiva || prefereMenosMovimento()) return

    if (!g.arrastando) {
      if (Math.hypot(dx, dy) < 6) return
      if (animacao.current || viradaAtual.current) {
        pararAnimacao(true) // o próximo movimento já começa a nova virada
        return
      }
      const p = pontoNoPalco(e)
      const metade = noTopo ? p.x > L / 2 : p.y > A / 2
      const v = montarVirada(g.direcao, metade ? 'base' : 'topo')
      if (!v) {
        gesto.current = null
        return
      }
      g.arrastando = true
      iniciarVirada(v, p)
      return
    }
    desenharDobra(pontoNoPalco(e))
  }

  function aoSoltar(e: EventoPonteiro<HTMLDivElement>) {
    const g = gesto.current
    if (!g || g.id !== e.pointerId) return
    gesto.current = null
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0
    const cancelado = e.type === 'pointercancel'

    if (zoom > 1) return

    const v = viradaAtual.current
    if (g.arrastando && v) {
      const p = pontoAtual.current
      const inteiro = Math.hypot(v.fim.x - v.inicio.x, v.fim.y - v.inicio.y)
      const feito = Math.hypot(p.x - v.inicio.x, p.y - v.inicio.y) / inteiro
      const completa = !cancelado && feito > 0.28
      const alvo = completa ? v.fim : v.inicio
      const falta = Math.hypot(alvo.x - p.x, alvo.y - p.y) / inteiro
      animarAte(alvo, 160 + 380 * falta, false, () => encerrarVirada(completa))
      return
    }
    if (cancelado) return

    const rapido = performance.now() - g.t0 < 600
    // Deslizar o dedo: para os lados no livro comum, para cima e para baixo no modo topo.
    const [principal, outro] = noTopo ? [dy, dx] : [dx, dy]
    if (Math.abs(principal) > 45 && Math.abs(principal) > Math.abs(outro) * 1.5 && rapido) {
      engoleClique.current = true // se o gesto começou sobre um botão, não conta também como clique
      irPara(principal < 0 ? 1 : -1)
    } else if (Math.hypot(dx, dy) < 8 && dobraAtiva) {
      irPara(g.direcao) // toque simples na página
    }
  }

  function aoClicarBorda(direcao: 1 | -1) {
    if (engoleClique.current) {
      engoleClique.current = false
      return
    }
    irPara(direcao)
  }

  // Pinça e Ctrl + roda do mouse precisam de ouvintes "não passivos".
  useEffect(() => {
    const area = rolagem.current
    if (!area) return
    const distancia = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const comecar = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      gesto.current = null
      if (viradaAtual.current) {
        pararAnimacao(false)
        viradaAtual.current = null
        setVirada(null)
      }
      pinca.current = { distancia: distancia(e.touches), zoom: zoomRef.current }
    }
    const mover = (e: TouchEvent) => {
      const p = pinca.current
      if (!p || e.touches.length !== 2) return
      e.preventDefault()
      aplicarZoom(p.zoom * (distancia(e.touches) / p.distancia), {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      })
    }
    const terminar = (e: TouchEvent) => {
      if (!pinca.current || e.touches.length >= 2) return
      pinca.current = null
      if (zoomRef.current < 1.12) aplicarZoom(1)
    }
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      aplicarZoom(zoomRef.current * Math.exp(-e.deltaY * 0.004), { x: e.clientX, y: e.clientY })
    }

    area.addEventListener('touchstart', comecar, { passive: false })
    area.addEventListener('touchmove', mover, { passive: false })
    area.addEventListener('touchend', terminar)
    area.addEventListener('touchcancel', terminar)
    area.addEventListener('wheel', roda, { passive: false })
    return () => {
      area.removeEventListener('touchstart', comecar)
      area.removeEventListener('touchmove', mover)
      area.removeEventListener('touchend', terminar)
      area.removeEventListener('touchcancel', terminar)
      area.removeEventListener('wheel', roda)
    }
  }, [aplicarZoom, pararAnimacao])

  // --- Resolução e páginas vizinhas ----------------------------------------

  const densidade = Math.min(window.devicePixelRatio || 1, LIMITES.densidadeMaxima)
  const larguraPx = arredondar(L * zoomNitido * densidade)
  const larguraVizinhas = arredondar(L * densidade)

  useEffect(() => {
    cache.focar(pagina)
    const vizinhas = duas
      ? [pagina + 2, pagina + 3, pagina - 1, pagina - 2, pagina + 4, pagina + 5, pagina - 3]
      : [pagina + 1, pagina - 1, pagina + 2]
    for (const n of vizinhas) {
      if (n >= 1 && n <= total) void cache.pedir(n, larguraVizinhas, false)
    }
  }, [cache, pagina, duas, total, larguraVizinhas])

  // --- Tela -----------------------------------------------------------------

  const Lz = L * zoom
  const Az = A * zoom
  const escondeEsquerda = virada !== null && (duas ? virada.lado === -1 : true)
  const escondeDireita = virada !== null && (duas ? virada.lado === 1 : true)
  const podeVoltar = paginaAnterior(pagina, total, duas) !== null
  const podeAvancar = proximaPagina(pagina, total, duas) !== null
  const mostraBordas = !dobraAtiva && zoom === 1 && !anotando

  const estiloLivro: CSSProperties = { width: (duas ? 2 : 1) * Lz, height: Az }
  const estiloFolha: CSSProperties = { width: Lz, height: Az }
  const classes = [
    'livro-aberto',
    duas ? 'livro-duas' : noTopo ? 'livro-topo' : 'livro-uma',
    `filtro-${filtro}`,
    zoom > 1 ? 'com-zoom' : '',
    dobraAtiva ? 'com-dobra' : '',
    anotando ? 'anotando' : '',
  ].join(' ')

  return (
    <div ref={rolagem} className={`palco${zoom > 1 ? ' palco-zoom' : ''}${anotando ? ' palco-anotando' : ''}`}>
      <div className="palco-centro">
        <div
          ref={livro}
          className={classes}
          style={estiloLivro}
          onPointerDown={aoApertar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        >
          {/* No modo com dobra as folhas nunca são recriadas: um gesto em andamento (a pinça, por exemplo) perderia o alvo. */}
          <div key={tresD ? 'fixo' : pagina} className={`folhas${tresD ? '' : `${sentido === 1 ? ' entra-frente' : ' entra-tras'}${noTopo ? ' entra-vertical' : ''}`}`}>
            {duas ? (
              <>
                <div className="folha folha-esquerda" style={{ ...estiloFolha, visibility: abertura.esquerda && !escondeEsquerda ? 'visible' : 'hidden' }}>
                  {abertura.esquerda && <PaginaTela cache={cache} numero={abertura.esquerda} largura={larguraPx} caixaLargura={Lz} caixaAltura={Az} interativa />}
                </div>
                <div className="folha folha-direita" style={{ ...estiloFolha, visibility: abertura.direita && !escondeDireita ? 'visible' : 'hidden' }}>
                  {abertura.direita && <PaginaTela cache={cache} numero={abertura.direita} largura={larguraPx} caixaLargura={Lz} caixaAltura={Az} interativa />}
                </div>
                {abertura.esquerda && abertura.direita && !virada && <div className="vinco" />}
              </>
            ) : (
              <div className="folha" style={{ ...estiloFolha, visibility: escondeDireita ? 'hidden' : 'visible' }}>
                <PaginaTela cache={cache} numero={pagina} largura={larguraPx} caixaLargura={Lz} caixaAltura={Az} interativa />
              </div>
            )}
          </div>

          {virada && (
            <div className="virada" style={{ left: duas ? L : 0 }}>
              {virada.fundo !== null && (
                <div className="folha virada-peca" style={{ left: virada.lado > 0 ? 0 : -L, width: L, height: A }}>
                  <PaginaTela cache={cache} numero={virada.fundo} largura={larguraPx} caixaLargura={L} caixaAltura={A} />
                </div>
              )}
              {virada.fundo !== null && (
                <div ref={sombra} className="virada-peca virada-sombra" style={{ left: virada.lado > 0 ? 0 : -L, width: L, height: A }} />
              )}
              <div ref={frente} className="folha virada-peca" style={{ left: virada.lado > 0 ? 0 : -L, width: L, height: A }}>
                {virada.frente !== null && <PaginaTela cache={cache} numero={virada.frente} largura={larguraPx} caixaLargura={L} caixaAltura={A} />}
              </div>
              <div ref={versoCaixa} className="virada-verso-caixa">
                <div ref={verso} className="folha virada-verso" style={{ width: L, height: A }}>
                  {virada.verso !== null && <PaginaTela cache={cache} numero={virada.verso} largura={larguraPx} caixaLargura={L} caixaAltura={A} />}
                  <div ref={brilho} className="virada-brilho" />
                </div>
              </div>
            </div>
          )}

          {mostraBordas && (
            <>
               <button type="button" className={`borda ${noTopo ? 'borda-cima' : 'borda-esquerda'}`} onClick={() => aoClicarBorda(-1)} disabled={!podeVoltar} aria-label="Página anterior">
                <span aria-hidden="true">‹</span>
              </button>
              <button type="button" className={`borda ${noTopo ? 'borda-baixo' : 'borda-direita'}`} onClick={() => aoClicarBorda(1)} disabled={!podeAvancar} aria-label="Próxima página">
                <span aria-hidden="true">›</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
})
