import type { PDFDocumentProxy } from 'pdfjs-dist'
import { createContext } from 'react'
import type { Destaque, Retangulo } from '../lib/types'

/** O que cada página precisa saber para desenhar anotações por cima do PDF. */
export interface DadosDaLeitura {
  doc: PDFDocumentProxy | null
  destaques: Map<number, Destaque[]>
  /** Onde o termo buscado aparece, por página. */
  realces: Map<number, Retangulo[]>
  marcadas: Set<number>
  /** Modo anotação: o texto fica selecionável e os destaques, clicáveis. */
  anotando: boolean
  aoTocarDestaque: (id: string) => void
}

export const ContextoPagina = createContext<DadosDaLeitura>({
  doc: null,
  destaques: new Map(),
  realces: new Map(),
  marcadas: new Set(),
  anotando: false,
  aoTocarDestaque: () => {},
})
