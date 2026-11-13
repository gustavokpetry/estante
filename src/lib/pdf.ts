import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Orientacao } from './types'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Auxiliares copiados para public/pdfjs/ por scripts/copy-pdf-assets.mjs.
const AUX = `${import.meta.env.BASE_URL}pdfjs/`

export type ErroPdf = 'senha' | 'invalido' | 'desconhecido'

export class FalhaAoAbrirPdf extends Error {
  tipo: ErroPdf
  constructor(tipo: ErroPdf, mensagem: string) {
    super(mensagem)
    this.tipo = tipo
  }
}

export interface PdfAberto {
  doc: PDFDocumentProxy
  /** Encerra o documento e libera a memória usada por ele. */
  fechar: () => Promise<void>
}

export async function abrirPdf(dados: ArrayBuffer): Promise<PdfAberto> {
  const tarefa = pdfjs.getDocument({
    data: dados,
    cMapUrl: `${AUX}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${AUX}standard_fonts/`,
    wasmUrl: `${AUX}wasm/`,
    iccUrl: `${AUX}iccs/`,
  })
  try {
    const doc = await tarefa.promise
    return { doc, fechar: () => tarefa.destroy() }
  } catch (e) {
    void tarefa.destroy()
    const nome = (e as { name?: string })?.name
    if (nome === 'PasswordException') {
      throw new FalhaAoAbrirPdf('senha', 'Protegido por senha')
    }
    if (nome === 'InvalidPDFException' || nome === 'FormatError') {
      throw new FalhaAoAbrirPdf('invalido', 'Arquivo inválido')
    }
    throw new FalhaAoAbrirPdf('desconhecido', 'Não abriu')
  }
}

export interface MetadadosPdf {
  titulo: string | null
  autor: string | null
  totalPaginas: number
}

export async function lerMetadados(pdf: PDFDocumentProxy): Promise<MetadadosPdf> {
  let titulo: string | null = null
  let autor: string | null = null
  try {
    const { info } = await pdf.getMetadata()
    const dados = info as { Title?: unknown; Author?: unknown }
    if (typeof dados.Title === 'string') titulo = dados.Title
    if (typeof dados.Author === 'string') autor = dados.Author.trim() || null
  } catch {
    // PDF sem metadados: seguimos com o nome do arquivo.
  }
  return { titulo, autor, totalPaginas: pdf.numPages }
}

/**
 * Um livro é "horizontal" quando a maioria das páginas é mais larga que alta.
 * Olhamos uma amostra (pulando a capa quando possível) para não percorrer PDFs enormes.
 */
export async function detectarOrientacao(pdf: PDFDocumentProxy): Promise<Orientacao> {
  const total = pdf.numPages
  const amostra: number[] = []
  const inicio = total > 2 ? 2 : 1
  for (let n = inicio; n <= total && amostra.length < 6; n++) amostra.push(n)
  let deitadas = 0
  for (const n of amostra) {
    const pagina = await pdf.getPage(n)
    const { width, height } = pagina.getViewport({ scale: 1 })
    if (width > height * 1.05) deitadas++
  }
  return deitadas > amostra.length / 2 ? 'horizontal' : 'vertical'
}

export interface CapaGerada {
  blob: Blob
  proporcao: number
}

/** Desenha a primeira página numa miniatura JPEG para servir de capa. */
export async function gerarCapa(pdf: PDFDocumentProxy, ladoMaior = 640): Promise<CapaGerada> {
  const pagina = await pdf.getPage(1)
  const base = pagina.getViewport({ scale: 1 })
  const escala = ladoMaior / Math.max(base.width, base.height)
  const viewport = pagina.getViewport({ scale: escala })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas indisponível')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await pagina.render({ canvas, canvasContext: ctx, viewport }).promise

  const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/jpeg', 0.86))
  // Libera a memória do canvas (importante no celular).
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new Error('Não foi possível gerar a capa')
  return { blob, proporcao: base.width / base.height }
}
