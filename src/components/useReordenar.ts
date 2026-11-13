import { useCallback, useEffect, useRef, type PointerEvent as EventoPonteiro } from 'react'

interface Gesto {
  id: string
  ponteiro: number
  tipo: string
  x0: number
  y0: number
  x: number
  y: number
  ativo: boolean
  espera: ReturnType<typeof setTimeout> | null
  quadro: number
}

interface Opcoes {
  aoComecar: (id: string) => void
  /** O livro arrastado passou por cima de outro: fica antes ou depois dele. */
  aoMover: (id: string, alvoId: string, depois: boolean) => void
  aoSoltar: () => void
}

/**
 * Arrastar livros para arrumar a estante, com mouse ou dedo.
 * No mouse o arrasto começa ao mover; no toque, depois de segurar um
 * instante (para não brigar com a rolagem da página).
 * Cada livro precisa do atributo data-livro com o id.
 */
export function useReordenar({ aoComecar, aoMover, aoSoltar }: Opcoes) {
  const gesto = useRef<Gesto | null>(null)
  /** Fica true depois de um arrasto, para o clique que vem em seguida não abrir o livro. */
  const arrastou = useRef(false)
  const acoes = useRef({ aoComecar, aoMover, aoSoltar })
  acoes.current = { aoComecar, aoMover, aoSoltar }

  // Enquanto um livro é arrastado com o dedo, a página não rola.
  useEffect(() => {
    const travar = (e: TouchEvent) => {
      if (gesto.current?.ativo) e.preventDefault()
    }
    const semMenu = (e: Event) => {
      if (gesto.current) e.preventDefault()
    }
    document.addEventListener('touchmove', travar, { passive: false })
    document.addEventListener('contextmenu', semMenu)
    return () => {
      document.removeEventListener('touchmove', travar)
      document.removeEventListener('contextmenu', semMenu)
    }
  }, [])

  const aoApertar = useCallback((e: EventoPonteiro, id: string) => {
    if (e.button !== 0 || gesto.current) return
    arrastou.current = false
    const g: Gesto = {
      id,
      ponteiro: e.pointerId,
      tipo: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      ativo: false,
      espera: null,
      quadro: 0,
    }
    gesto.current = g

    const procurarAlvo = () => {
      const sob = document.elementFromPoint(g.x, g.y)?.closest<HTMLElement>('[data-livro]')
      const alvoId = sob?.dataset.livro
      if (!sob || !alvoId || alvoId === g.id) return
      const r = sob.getBoundingClientRect()
      acoes.current.aoMover(g.id, alvoId, g.x > r.left + r.width / 2)
    }

    const rolar = () => {
      // Perto do alto ou do fim da tela, a página rola sozinha.
      const margem = 90
      if (g.y < margem) window.scrollBy(0, -Math.ceil((margem - g.y) / 6))
      else if (g.y > window.innerHeight - margem) window.scrollBy(0, Math.ceil((g.y - (window.innerHeight - margem)) / 6))
      procurarAlvo()
      g.quadro = requestAnimationFrame(rolar)
    }

    const iniciar = () => {
      if (g.ativo) return
      g.ativo = true
      arrastou.current = true
      document.documentElement.classList.add('arrastando-livro')
      navigator.vibrate?.(12)
      acoes.current.aoComecar(g.id)
      g.quadro = requestAnimationFrame(rolar)
    }

    const encerrar = () => {
      if (g.espera) clearTimeout(g.espera)
      cancelAnimationFrame(g.quadro)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      document.documentElement.classList.remove('arrastando-livro')
      gesto.current = null
      if (g.ativo) acoes.current.aoSoltar()
    }

    const mover = (ev: PointerEvent) => {
      if (ev.pointerId !== g.ponteiro) return
      g.x = ev.clientX
      g.y = ev.clientY
      if (g.ativo) return
      const distancia = Math.hypot(g.x - g.x0, g.y - g.y0)
      if (g.tipo === 'mouse') {
        if (distancia > 8) iniciar()
      } else if (distancia > 10) {
        encerrar() // o dedo andou antes do tempo: é rolagem, não arrasto
      }
    }

    const soltar = (ev: PointerEvent) => {
      if (ev.pointerId === g.ponteiro) encerrar()
    }

    if (g.tipo !== 'mouse') g.espera = setTimeout(iniciar, 330)
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }, [])

  return { aoApertar, arrastou }
}

export type Reordenar = ReturnType<typeof useReordenar>
