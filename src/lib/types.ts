export type Orientacao = 'vertical' | 'horizontal'
export type StatusLeitura = 'quero-ler' | 'lendo' | 'lido'
export type TipoCapa = 'pdf' | 'image' | 'generated'
export type ModoHorizontal = 'topo' | 'uma' | 'duas'
export type Tema = 'auto' | 'claro' | 'escuro'

/** Metadados de um livro. O arquivo PDF e a capa ficam em tabelas separadas. */
export interface Livro {
  /** Hash SHA-256 do arquivo PDF. Identifica o livro e evita duplicatas. */
  id: string
  titulo: string
  autor: string
  nomeArquivo: string
  tamanhoBytes: number
  totalPaginas: number
  orientacao: Orientacao
  modoHorizontal: ModoHorizontal | null
  tipoCapa: TipoCapa
  /** Largura dividida pela altura da capa. */
  proporcaoCapa: number
  status: StatusLeitura
  avaliacao: number | null
  adicionadoEm: number
  ultimaLeitura: number | null
  paginaAtual: number
  tags: string[]
  colecoesIds: string[]
  /** null enquanto o texto ainda não foi analisado (busca chega na v1.6). */
  temTexto: boolean | null
}

export interface ArquivoPdf {
  livroId: string
  blob: Blob
}

export interface Capa {
  livroId: string
  blob: Blob
}

export interface Configuracao {
  chave: string
  valor: unknown
}
