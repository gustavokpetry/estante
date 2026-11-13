export type Orientacao = 'vertical' | 'horizontal'
export type StatusLeitura = 'quero-ler' | 'lendo' | 'lido'
export type TipoCapa = 'pdf' | 'image' | 'generated'
export type ModoHorizontal = 'topo' | 'uma' | 'duas'
export type Tema = 'auto' | 'claro' | 'escuro'
/** '3d': virada com dobra; 'simples': duas páginas lado a lado; 'unica': uma página por vez. */
export type ModoLeitura = '3d' | 'simples' | 'unica'
export type FiltroPagina = 'nenhum' | 'sepia' | 'noite'
export type VisualEstante = 'grade' | 'madeira' | 'lombadas'
export type Ordenacao = 'manual' | 'recentes' | 'lidos' | 'titulo' | 'progresso' | 'avaliacao'
export type ModeloCapa = 'classico' | 'minimalista' | 'faixa' | 'geometrico'
export type CorDestaque = 'amarelo' | 'verde' | 'rosa' | 'azul'

/** O que define uma capa criada no app (guardado para poder reeditar). */
export interface ParametrosCapa {
  titulo: string
  autor: string
  cor: string
  modelo: ModeloCapa
}

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
  /** De 0,5 a 5, de meia em meia estrela. */
  avaliacao: number | null
  adicionadoEm: number
  ultimaLeitura: number | null
  paginaAtual: number
  tags: string[]
  colecoesIds: string[]
  /** null: texto ainda não analisado. false: PDF só de imagens (sem busca). */
  temTexto: boolean | null
  /** Modo de leitura só deste livro. Vazio: segue o padrão do app. */
  modoLeitura?: ModoLeitura | null
  parametrosCapa?: ParametrosCapa | null
  /** Cor predominante da capa, usada na lombada. */
  corLombada?: string | null
  /** Posição na ordem arrumada à mão. Livros sem posição (recém-adicionados) vêm primeiro. */
  ordem?: number | null
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

export interface Colecao {
  id: string
  nome: string
  criadaEm: number
}

export interface Marcador {
  id: string
  livroId: string
  pagina: number
  nome: string
  criadoEm: number
}

export interface Nota {
  id: string
  livroId: string
  pagina: number
  texto: string
  criadoEm: number
  atualizadoEm: number
}

/** Retângulo em frações da página (0 a 1), para valer em qualquer zoom e tela. */
export interface Retangulo {
  x: number
  y: number
  l: number
  a: number
}

export interface Destaque {
  id: string
  livroId: string
  pagina: number
  retangulos: Retangulo[]
  texto: string
  cor: CorDestaque
  nota: string
  criadoEm: number
}

export interface TextoPagina {
  livroId: string
  pagina: number
  texto: string
}

/** Leitura de um livro em um dia (AAAA-MM-DD). */
export interface RegistroLeitura {
  data: string
  livroId: string
  segundos: number
  paginas: number
}
