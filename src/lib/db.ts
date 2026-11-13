import Dexie, { type EntityTable } from 'dexie'
import type { ArquivoPdf, Capa, Configuracao, Livro } from './types'

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

  constructor() {
    super('estante')
    this.version(1).stores({
      livros: 'id, titulo, autor, adicionadoEm, ultimaLeitura, status, *tags, *colecoesIds',
      arquivos: 'livroId',
      capas: 'livroId',
      configuracoes: 'chave',
    })
  }
}

export const db = new EstanteDB()

export async function excluirLivro(id: string): Promise<void> {
  await db.transaction('rw', db.livros, db.arquivos, db.capas, async () => {
    await db.livros.delete(id)
    await db.arquivos.delete(id)
    await db.capas.delete(id)
  })
}

export async function salvarConfiguracao(chave: string, valor: unknown): Promise<void> {
  await db.configuracoes.put({ chave, valor })
}
