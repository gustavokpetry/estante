import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

interface Entrada {
  canvas: HTMLCanvasElement
  largura: number
  uso: number
}

interface Pedido {
  pagina: number
  largura: number
  ordem: number
  resolver: Array<(c: HTMLCanvasElement | null) => void>
}

const toqueGrosso = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

/** Limites de memória: celulares aguentam bem menos pixels que computadores. */
export const LIMITES = {
  pixelsPorPagina: toqueGrosso ? 3_000_000 : 6_000_000,
  pixelsNoTotal: toqueGrosso ? 20_000_000 : 60_000_000,
  densidadeMaxima: toqueGrosso ? 2 : 2.5,
}

/**
 * Desenha páginas do PDF sob demanda e guarda só as mais recentes.
 * Uma página por vez, sempre a pedida por último primeiro, para a tela
 * atual nunca ficar esperando páginas que já passaram.
 */
export class CachePaginas {
  private entradas = new Map<number, Entrada>()
  private fila = new Map<number, Pedido>()
  private relogio = 0
  private ocupado = false
  private tarefa: RenderTask | null = null
  private encerrado = false
  private foco = 1
  private doc: PDFDocumentProxy

  constructor(doc: PDFDocumentProxy) {
    this.doc = doc
  }

  /** Devolve na hora a página já desenhada com resolução suficiente, se houver. */
  pronta(pagina: number, largura: number): HTMLCanvasElement | null {
    const e = this.entradas.get(pagina)
    if (!e || e.largura < largura * 0.92) return null
    e.uso = ++this.relogio
    return e.canvas
  }

  /** Qualquer versão já desenhada, mesmo em resolução menor (para não piscar). */
  qualquer(pagina: number): HTMLCanvasElement | null {
    return this.entradas.get(pagina)?.canvas ?? null
  }

  /**
   * Pede uma página. Com `urgente` ela passa na frente da fila (é o que está
   * na tela); sem, entra atrás (páginas vizinhas adiantadas).
   */
  pedir(pagina: number, largura: number, urgente = true): Promise<HTMLCanvasElement | null> {
    if (this.encerrado || pagina < 1 || pagina > this.doc.numPages) return Promise.resolve(null)
    const pronta = this.pronta(pagina, largura)
    if (pronta) return Promise.resolve(pronta)
    return new Promise((resolver) => {
      const existente = this.fila.get(pagina)
      if (existente) {
        existente.largura = Math.max(existente.largura, largura)
        if (urgente) existente.ordem = ++this.relogio
        existente.resolver.push(resolver)
      } else {
        const ordem = urgente ? ++this.relogio : -++this.relogio
        this.fila.set(pagina, { pagina, largura, ordem, resolver: [resolver] })
      }
      void this.trabalhar()
    })
  }

  /** Avisa onde o leitor está: pedidos de páginas distantes são descartados. */
  focar(pagina: number): void {
    this.foco = pagina
    for (const [n, pedido] of this.fila) {
      if (Math.abs(n - pagina) > 6) {
        this.fila.delete(n)
        pedido.resolver.forEach((r) => r(null))
      }
    }
  }

  private async trabalhar(): Promise<void> {
    if (this.ocupado) return
    this.ocupado = true
    try {
      while (!this.encerrado && this.fila.size > 0) {
        let escolhido: Pedido | null = null
        for (const pedido of this.fila.values()) {
          if (!escolhido || pedido.ordem > escolhido.ordem) escolhido = pedido
        }
        if (!escolhido) break
        this.fila.delete(escolhido.pagina)
        const canvas = await this.desenhar(escolhido.pagina, escolhido.largura)
        escolhido.resolver.forEach((r) => r(canvas))
      }
    } finally {
      this.ocupado = false
    }
  }

  private async desenhar(numero: number, largura: number): Promise<HTMLCanvasElement | null> {
    try {
      const pagina = await this.doc.getPage(numero)
      const base = pagina.getViewport({ scale: 1 })
      let escala = largura / base.width
      const pixels = base.width * escala * base.height * escala
      if (pixels > LIMITES.pixelsPorPagina) escala *= Math.sqrt(LIMITES.pixelsPorPagina / pixels)
      const viewport = pagina.getViewport({ scale: escala })

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(viewport.width))
      canvas.height = Math.max(1, Math.round(viewport.height))
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return null
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      this.tarefa = pagina.render({ canvas, canvasContext: ctx, viewport })
      await this.tarefa.promise
      this.tarefa = null
      if (this.encerrado) {
        canvas.width = 0
        return null
      }

      const antiga = this.entradas.get(numero)
      if (antiga) antiga.canvas.width = 0
      // A largura registrada é a pedida: se o limite de pixels reduziu o
      // desenho, não adianta pedir de novo.
      this.entradas.set(numero, { canvas, largura, uso: ++this.relogio })
      this.enxugar()
      return canvas
    } catch {
      this.tarefa = null
      return null
    }
  }

  /** Descarta as páginas menos usadas e mais distantes quando a memória passa do limite. */
  private enxugar(): void {
    const total = () => {
      let soma = 0
      for (const e of this.entradas.values()) soma += e.canvas.width * e.canvas.height
      return soma
    }
    while (this.entradas.size > 3 && total() > LIMITES.pixelsNoTotal) {
      let pior: number | null = null
      let piorNota = -Infinity
      for (const [n, e] of this.entradas) {
        const nota = Math.abs(n - this.foco) * 1000 - e.uso
        if (nota > piorNota) {
          piorNota = nota
          pior = n
        }
      }
      if (pior === null) break
      const e = this.entradas.get(pior)!
      e.canvas.width = 0
      e.canvas.height = 0
      this.entradas.delete(pior)
    }
  }

  encerrar(): void {
    this.encerrado = true
    this.tarefa?.cancel()
    for (const pedido of this.fila.values()) pedido.resolver.forEach((r) => r(null))
    this.fila.clear()
    for (const e of this.entradas.values()) {
      e.canvas.width = 0
      e.canvas.height = 0
    }
    this.entradas.clear()
  }
}
