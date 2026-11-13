import { clarear, corPredominante, escurecer, textoSobre } from './cores'
import { db } from './db'
import { abrirPdf, gerarCapa } from './pdf'
import type { ModeloCapa, ParametrosCapa } from './types'

export const MODELOS: Array<{ valor: ModeloCapa; nome: string }> = [
  { valor: 'classico', nome: 'Clássico' },
  { valor: 'minimalista', nome: 'Minimalista' },
  { valor: 'faixa', nome: 'Faixa' },
  { valor: 'geometrico', nome: 'Geométrico' },
]

export const CORES_DE_CAPA = [
  '#3d5a47', '#7d4613', '#8e2f1f', '#2f3e5c', '#5b3a6b', '#1f5a66',
  '#b5762e', '#2a1a0f', '#6b6f3a', '#a34a5c', '#44546a', '#d9c59c',
]

const LADO_MAIOR = 900
const FONTE_TITULO = "'Alegreya', Georgia, serif"
const FONTE_TEXTO = "'Alegreya Sans', 'Segoe UI', sans-serif"

function novoCanvas(proporcao: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const p = Math.min(2.2, Math.max(0.4, proporcao || 0.7))
  canvas.width = Math.round(p >= 1 ? LADO_MAIOR : LADO_MAIOR * p)
  canvas.height = Math.round(p >= 1 ? LADO_MAIOR / p : LADO_MAIOR)
  return canvas
}

function paraBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolver, rejeitar) =>
    canvas.toBlob((b) => (b ? resolver(b) : rejeitar(new Error('Não foi possível gerar a imagem'))), 'image/jpeg', 0.9),
  )
}

/** Quebra o texto em linhas que caibam na largura dada. */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean)
  const linhas: string[] = []
  let atual = ''
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width <= largura || !atual) {
      atual = tentativa
    } else {
      linhas.push(atual)
      atual = palavra
    }
  }
  if (atual) linhas.push(atual)
  if (linhas.length > maxLinhas) {
    const cortadas = linhas.slice(0, maxLinhas)
    cortadas[maxLinhas - 1] = cortadas[maxLinhas - 1].replace(/.{0,2}$/, '…')
    return cortadas
  }
  return linhas
}

/** Escreve um bloco de texto, diminuindo a letra até caber. Devolve a altura usada. */
function bloco(
  ctx: CanvasRenderingContext2D,
  texto: string,
  opcoes: { x: number; y: number; largura: number; alturaMax: number; tamanho: number; peso: string; fonte: string; alinhar: CanvasTextAlign; maxLinhas: number; italico?: boolean },
): number {
  if (!texto.trim()) return 0
  let tamanho = opcoes.tamanho
  let linhas: string[] = []
  for (; tamanho >= opcoes.tamanho * 0.45; tamanho *= 0.92) {
    ctx.font = `${opcoes.italico ? 'italic ' : ''}${opcoes.peso} ${tamanho}px ${opcoes.fonte}`
    linhas = quebrar(ctx, texto, opcoes.largura, opcoes.maxLinhas)
    const cabe = linhas.every((l) => ctx.measureText(l).width <= opcoes.largura)
    if (cabe && linhas.length * tamanho * 1.15 <= opcoes.alturaMax) break
  }
  ctx.textAlign = opcoes.alinhar
  ctx.textBaseline = 'top'
  linhas.forEach((linha, i) => ctx.fillText(linha, opcoes.x, opcoes.y + i * tamanho * 1.15))
  return linhas.length * tamanho * 1.15
}

/** Desenha uma capa a partir dos parâmetros. Usada na prévia e ao salvar. */
export function desenharCapa(canvas: HTMLCanvasElement, { titulo, autor, cor, modelo }: ParametrosCapa): void {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return
  const L = canvas.width
  const A = canvas.height
  const u = Math.min(L, A) / 100 // unidade relativa ao lado menor
  const tinta = textoSobre(cor)
  const clara = tinta === '#f6ecd4'
  const realce = clara ? '#e6c476' : escurecer(cor, 0.55)

  ctx.fillStyle = cor
  ctx.fillRect(0, 0, L, A)

  if (modelo === 'classico') {
    // Moldura dupla e um florão simples, como capa de livro antigo.
    ctx.strokeStyle = realce
    ctx.lineWidth = u * 0.9
    ctx.strokeRect(u * 6, u * 6, L - u * 12, A - u * 12)
    ctx.lineWidth = u * 0.3
    ctx.strokeRect(u * 8.5, u * 8.5, L - u * 17, A - u * 17)
    ctx.fillStyle = tinta
    const h = bloco(ctx, titulo || 'Sem título', {
      x: L / 2, y: A * 0.26, largura: L - u * 30, alturaMax: A * 0.36, tamanho: u * 13,
      peso: '700', fonte: FONTE_TITULO, alinhar: 'center', maxLinhas: 5,
    })
    const yFlorao = A * 0.26 + h + u * 5
    ctx.strokeStyle = realce
    ctx.lineWidth = u * 0.4
    ctx.beginPath()
    ctx.moveTo(L / 2 - u * 12, yFlorao)
    ctx.lineTo(L / 2 - u * 2.5, yFlorao)
    ctx.moveTo(L / 2 + u * 2.5, yFlorao)
    ctx.lineTo(L / 2 + u * 12, yFlorao)
    ctx.stroke()
    ctx.fillStyle = realce
    ctx.beginPath()
    ctx.moveTo(L / 2, yFlorao - u * 1.6)
    ctx.lineTo(L / 2 + u * 1.6, yFlorao)
    ctx.lineTo(L / 2, yFlorao + u * 1.6)
    ctx.lineTo(L / 2 - u * 1.6, yFlorao)
    ctx.fill()
    ctx.fillStyle = tinta
    bloco(ctx, autor, {
      x: L / 2, y: A - u * 24, largura: L - u * 30, alturaMax: u * 12, tamanho: u * 6,
      peso: '400', fonte: FONTE_TITULO, alinhar: 'center', maxLinhas: 2, italico: true,
    })
  } else if (modelo === 'minimalista') {
    ctx.fillStyle = tinta
    const h = bloco(ctx, titulo || 'Sem título', {
      x: u * 10, y: u * 12, largura: L - u * 20, alturaMax: A * 0.5, tamanho: u * 11,
      peso: '700', fonte: FONTE_TEXTO, alinhar: 'left', maxLinhas: 6,
    })
    ctx.fillRect(u * 10, u * 12 + h + u * 4, u * 14, u * 0.8)
    bloco(ctx, autor, {
      x: u * 10, y: A - u * 20, largura: L - u * 20, alturaMax: u * 12, tamanho: u * 5.5,
      peso: '500', fonte: FONTE_TEXTO, alinhar: 'left', maxLinhas: 2,
    })
  } else if (modelo === 'faixa') {
    // Faixa clara atravessando a capa, com o título dentro.
    const topo = A * 0.3
    const altura = A * 0.34
    const papel = clara ? '#f4e9d0' : escurecer(cor, 0.62)
    ctx.fillStyle = papel
    ctx.fillRect(0, topo, L, altura)
    ctx.fillStyle = realce
    ctx.fillRect(0, topo - u * 1.6, L, u * 0.7)
    ctx.fillRect(0, topo + altura + u * 0.9, L, u * 0.7)
    ctx.fillStyle = textoSobre(papel)
    ctx.font = `700 ${u * 10}px ${FONTE_TITULO}`
    const linhas = Math.min(4, quebrar(ctx, titulo || 'Sem título', L - u * 20, 4).length)
    const tamanho = Math.min(u * 10, (altura - u * 8) / (linhas * 1.15))
    bloco(ctx, titulo || 'Sem título', {
      x: L / 2, y: topo + (altura - linhas * tamanho * 1.15) / 2, largura: L - u * 20, alturaMax: altura - u * 6,
      tamanho, peso: '700', fonte: FONTE_TITULO, alinhar: 'center', maxLinhas: 4,
    })
    ctx.fillStyle = tinta
    bloco(ctx, autor, {
      x: L / 2, y: topo + altura + u * 8, largura: L - u * 20, alturaMax: u * 14, tamanho: u * 6,
      peso: '500', fonte: FONTE_TEXTO, alinhar: 'center', maxLinhas: 2,
    })
  } else {
    // Geométrico: círculos e uma diagonal em tons da própria cor.
    const tomA = clara ? clarear(cor, 0.16) : escurecer(cor, 0.12)
    const tomB = clara ? escurecer(cor, 0.28) : clarear(cor, 0.3)
    ctx.fillStyle = tomA
    ctx.beginPath()
    ctx.arc(L * 0.78, A * 0.24, Math.min(L, A) * 0.34, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = tomB
    ctx.beginPath()
    ctx.moveTo(0, A * 0.52)
    ctx.lineTo(L, A * 0.36)
    ctx.lineTo(L, A * 0.46)
    ctx.lineTo(0, A * 0.62)
    ctx.fill()
    ctx.fillStyle = realce
    ctx.beginPath()
    ctx.arc(L * 0.2, A * 0.3, Math.min(L, A) * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = tinta
    bloco(ctx, titulo || 'Sem título', {
      x: u * 9, y: A * 0.66, largura: L - u * 18, alturaMax: A * 0.2, tamanho: u * 10,
      peso: '700', fonte: FONTE_TITULO, alinhar: 'left', maxLinhas: 3,
    })
    bloco(ctx, autor, {
      x: u * 9, y: A - u * 13, largura: L - u * 18, alturaMax: u * 8, tamanho: u * 5,
      peso: '500', fonte: FONTE_TEXTO, alinhar: 'left', maxLinhas: 1,
    })
  }
}

/** Garante que as fontes do app estão carregadas antes de desenhar no canvas. */
export async function prepararFontes(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`700 40px ${FONTE_TITULO}`),
      document.fonts.load(`italic 400 40px ${FONTE_TITULO}`),
      document.fonts.load(`700 40px ${FONTE_TEXTO}`),
      document.fonts.load(`500 40px ${FONTE_TEXTO}`),
    ])
  } catch {
    // Sem as fontes o desenho usa as de reserva.
  }
}

export async function criarCapaGerada(parametros: ParametrosCapa, proporcao: number): Promise<Blob> {
  await prepararFontes()
  const canvas = novoCanvas(proporcao)
  desenharCapa(canvas, parametros)
  const blob = await paraBlob(canvas)
  canvas.width = 0
  return blob
}

export interface Enquadramento {
  /** 1 = a imagem cobre a capa justinha; maior aproxima. */
  zoom: number
  /** Posição do recorte, de 0 a 1 em cada eixo. */
  x: number
  y: number
}

/** Desenha a imagem cobrindo o canvas inteiro, com o enquadramento pedido. */
export function desenharRecorte(canvas: HTMLCanvasElement, imagem: CanvasImageSource & { width: number; height: number }, e: Enquadramento): void {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return
  const escala = Math.max(canvas.width / imagem.width, canvas.height / imagem.height) * e.zoom
  const l = imagem.width * escala
  const a = imagem.height * escala
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(imagem, (canvas.width - l) * e.x, (canvas.height - a) * e.y, l, a)
}

export async function criarCapaDeImagem(imagem: ImageBitmap, proporcao: number, e: Enquadramento): Promise<Blob> {
  const canvas = novoCanvas(proporcao)
  desenharRecorte(canvas, imagem, e)
  const blob = await paraBlob(canvas)
  canvas.width = 0
  return blob
}

/** Refaz a capa a partir da primeira página do PDF guardado. */
export async function criarCapaDoPdf(livroId: string): Promise<{ blob: Blob; proporcao: number } | null> {
  const arquivo = await db.arquivos.get(livroId)
  if (!arquivo) return null
  const aberto = await abrirPdf(await arquivo.blob.arrayBuffer())
  try {
    return await gerarCapa(aberto.doc)
  } finally {
    void aberto.fechar()
  }
}

/** Cor da lombada a partir da imagem da capa. */
export async function corDaCapa(blob: Blob): Promise<string> {
  try {
    const imagem = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = 24
    canvas.height = 24
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return '#6a4a32'
    ctx.drawImage(imagem, 0, 0, 24, 24)
    imagem.close()
    return corPredominante(ctx.getImageData(0, 0, 24, 24).data)
  } catch {
    return '#6a4a32'
  }
}
