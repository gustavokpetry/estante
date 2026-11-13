import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  ArquivoPdf,
  Capa,
  Colecao,
  Configuracao,
  Destaque,
  Livro,
  Marcador,
  Nota,
  RegistroLeitura,
  TextoPagina,
} from './types'

/**
 * Banco local (IndexedDB). Nada aqui sai do navegador.
 * Os PDFs ficam em `arquivos`, separados de `livros`, para a estante
 * listar os livros sem carregar os arquivos na memória.
 */
class EstanteDB extends Dexie {
  livros!: EntityTable<Livro, 'id'>
  arquivos!: EntityTable<ArquivoPdf, 'livroId'>
  capas!: EntityTable<Capa, 'livroId'>
  configuracoes!: EntityTable<Configuracao, 'chave'>
  colecoes!: EntityTable<Colecao, 'id'>
  marcadores!: EntityTable<Marcador, 'id'>
  notas!: EntityTable<Nota, 'id'>
  destaques!: EntityTable<Destaque, 'id'>
  textos!: Table<TextoPagina, [string, number]>
  leituras!: Table<RegistroLeitura, [string, string]>

  constructor() {
    super('estante')
    this.version(1).stores({
      livros: 'id, titulo, autor, adicionadoEm, ultimaLeitura, status, *tags, *colecoesIds',
      arquivos: 'livroId',
      capas: 'livroId',
      configuracoes: 'chave',
    })
    // v1.3 a v1.7: coleções, anotações, texto para busca e registro de leitura.
    this.version(2).stores({
      colecoes: 'id, nome',
      marcadores: 'id, livroId, [livroId+pagina]',
      notas: 'id, livroId, [livroId+pagina]',
      destaques: 'id, livroId, [livroId+pagina]',
      textos: '[livroId+pagina], livroId',
      leituras: '[data+livroId], data, livroId',
    })
  }
}

export const db = new EstanteDB()

export const novoId = (): string => crypto.randomUUID()

/** Remove o livro e tudo o que pertence a ele. O histórico de leitura fica, para as estatísticas. */
export async function excluirLivro(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.livros, db.arquivos, db.capas, db.marcadores, db.notas, db.destaques, db.textos],
    async () => {
      await db.livros.delete(id)
      await db.arquivos.delete(id)
      await db.capas.delete(id)
      await db.marcadores.where('livroId').equals(id).delete()
      await db.notas.where('livroId').equals(id).delete()
      await db.destaques.where('livroId').equals(id).delete()
      await db.textos.where('livroId').equals(id).delete()
    },
  )
}

export async function excluirColecao(id: string): Promise<void> {
  await db.transaction('rw', db.colecoes, db.livros, async () => {
    await db.colecoes.delete(id)
    await db.livros
      .where('colecoesIds')
      .equals(id)
      .modify((livro) => {
        livro.colecoesIds = livro.colecoesIds.filter((c) => c !== id)
      })
  })
}

export async function salvarConfiguracao(chave: string, valor: unknown): Promise<void> {
  await db.configuracoes.put({ chave, valor })
}
