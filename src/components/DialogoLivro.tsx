import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, excluirLivro, novoId } from '../lib/db'
import { limparTag, tagsEmUso } from '../lib/filtros'
import { formatarBytes, formatarData, plural } from '../lib/formato'
import type { Livro, ModoHorizontal, Orientacao, StatusLeitura } from '../lib/types'
import { Dialogo } from './Dialogo'
import { DialogoCapa } from './DialogoCapa'
import { EscolherEstrelas } from './Estrelas'
import { IconeCaneta, IconeFechar, IconeLer, IconeLixeira, IconeMais } from './Icones'
import { useCapa, versaoDaCapa } from './useCapa'

interface Props {
  livro: Livro
  aoFechar: () => void
  aoLer: (id: string) => void
}

export function DialogoLivro({ livro, aoFechar, aoLer }: Props) {
  const capa = useCapa(livro.id, versaoDaCapa(livro))
  const colecoes = useLiveQuery(() => db.colecoes.orderBy('nome').toArray(), []) ?? []
  const todas = useLiveQuery(() => db.livros.toArray().then(tagsEmUso), []) ?? []
  const [titulo, setTitulo] = useState(livro.titulo)
  const [autor, setAutor] = useState(livro.autor)
  const [novaTag, setNovaTag] = useState('')
  const [novaColecao, setNovaColecao] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [editandoCapa, setEditandoCapa] = useState(false)

  const atualizar = (mudanca: Partial<Livro>) => void db.livros.update(livro.id, mudanca)
  // Listas mudam direto no banco, para duas mudanças seguidas não se atropelarem.
  const mudarLista = (campo: 'tags' | 'colecoesIds', fazer: (lista: string[]) => string[]) =>
    db.livros
      .where('id')
      .equals(livro.id)
      .modify((l) => {
        l[campo] = fazer(l[campo])
      })

  // Título e autor são salvos ao sair do campo.
  const salvarTextos = () => {
    const t = titulo.trim()
    if (!t) {
      setTitulo(livro.titulo)
      return
    }
    if (t !== livro.titulo || autor.trim() !== livro.autor) atualizar({ titulo: t, autor: autor.trim() })
  }

  const adicionarTag = () => {
    const tag = limparTag(novaTag)
    setNovaTag('')
    if (tag) void mudarLista('tags', (tags) => (tags.includes(tag) ? tags : [...tags, tag]))
  }

  const alternarColecao = (id: string, dentro: boolean) =>
    void mudarLista('colecoesIds', (ids) => (dentro ? [...new Set([...ids, id])] : ids.filter((c) => c !== id)))

  const criarColecao = async () => {
    const nome = novaColecao.trim()
    setNovaColecao('')
    if (!nome) return
    const existente = colecoes.find((c) => c.nome.toLowerCase() === nome.toLowerCase())
    const id = existente?.id ?? novoId()
    if (!existente) await db.colecoes.add({ id, nome, criadaEm: Date.now() })
    await mudarLista('colecoesIds', (ids) => [...new Set([...ids, id])])
  }

  if (editandoCapa) return <DialogoCapa livro={livro} aoFechar={() => setEditandoCapa(false)} />

  return (
    <Dialogo titulo="Detalhes" aoFechar={aoFechar} largo>
      <div className="detalhes">
        <div className="detalhes-lateral">
          <div className="detalhes-capa" style={{ aspectRatio: String(livro.proporcaoCapa || 0.7) }}>
            {capa && <img src={capa} alt={`Capa de ${livro.titulo}`} />}
          </div>
          <div className="detalhes-botoes">
            <button type="button" className="botao-quadrado botao-quadrado-principal" onClick={() => aoLer(livro.id)} aria-label="Ler" title="Ler">
              <IconeLer />
            </button>
            <button type="button" className="botao-quadrado" onClick={() => setEditandoCapa(true)} aria-label="Trocar a capa" title="Trocar a capa">
              <IconeCaneta />
            </button>
            <button
              type="button"
              className="botao-quadrado botao-quadrado-perigo"
              onClick={() => setConfirmandoExclusao(true)}
              aria-label="Excluir o livro"
              title="Excluir o livro"
            >
              <IconeLixeira />
            </button>
          </div>
          {confirmandoExclusao && (
            <div className="confirmar" role="alertdialog" aria-label="Excluir o livro">
              <p>Excluir o livro e as anotações?</p>
              <div className="detalhes-acoes">
                <button
                  type="button"
                  className="botao botao-mini botao-perigo"
                  onClick={() => {
                    void excluirLivro(livro.id)
                    aoFechar()
                  }}
                >
                  Excluir
                </button>
                <button type="button" className="botao botao-mini" onClick={() => setConfirmandoExclusao(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="detalhes-corpo">
          <label className="campo">
            <span>Título</span>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={salvarTextos} />
          </label>
          <label className="campo">
            <span>Autor</span>
            <input type="text" value={autor} placeholder="Sem autor" onChange={(e) => setAutor(e.target.value)} onBlur={salvarTextos} />
          </label>

          <div className="campos-lado-a-lado">
            <label className="campo">
              <span>Status</span>
              <select value={livro.status} onChange={(e) => atualizar({ status: e.target.value as StatusLeitura })}>
                <option value="quero-ler">Quero ler</option>
                <option value="lendo">Lendo</option>
                <option value="lido">Lido</option>
              </select>
            </label>
            <div className="campo">
              <span>Avaliação</span>
              <EscolherEstrelas valor={livro.avaliacao} aoMudar={(avaliacao) => atualizar({ avaliacao })} />
            </div>
          </div>

          <div className="campo">
            <span>Tags</span>
            <div className="etiquetas">
              {livro.tags.map((tag) => (
                <span key={tag} className="etiqueta">
                  {tag}
                  <button type="button" aria-label={`Remover a tag ${tag}`} onClick={() => void mudarLista('tags', (tags) => tags.filter((t) => t !== tag))}>
                    <IconeFechar width={14} height={14} />
                  </button>
                </span>
              ))}
              <span className="etiqueta-nova">
                <input
                  type="text"
                  list="tags-conhecidas"
                  placeholder="Nova tag"
                  aria-label="Nova tag"
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      adicionarTag()
                    }
                  }}
                />
                <button type="button" className="botao-quadrado botao-quadrado-mini" onClick={adicionarTag} disabled={!limparTag(novaTag)} aria-label="Adicionar a tag" title="Adicionar a tag">
                  <IconeMais />
                </button>
              </span>
              <datalist id="tags-conhecidas">
                {todas
                  .filter((t) => !livro.tags.includes(t))
                  .map((t) => (
                    <option key={t} value={t} />
                  ))}
              </datalist>
            </div>
          </div>

          <div className="campo">
            <span>Coleções</span>
            <div className="colecoes-lista">
              {colecoes.map((c) => (
                <label key={c.id} className="marcavel">
                  <input type="checkbox" checked={livro.colecoesIds.includes(c.id)} onChange={(e) => alternarColecao(c.id, e.target.checked)} />
                  {c.nome}
                </label>
              ))}
              <span className="etiqueta-nova">
                <input
                  type="text"
                  placeholder="Nova coleção"
                  aria-label="Nova coleção"
                  value={novaColecao}
                  onChange={(e) => setNovaColecao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void criarColecao()
                    }
                  }}
                />
                <button type="button" className="botao-quadrado botao-quadrado-mini" onClick={() => void criarColecao()} disabled={!novaColecao.trim()} aria-label="Criar a coleção" title="Criar a coleção">
                  <IconeMais />
                </button>
              </span>
            </div>
          </div>

          <div className="campos-lado-a-lado">
            <label className="campo">
              <span>Formato</span>
              <select value={livro.orientacao} onChange={(e) => atualizar({ orientacao: e.target.value as Orientacao })}>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </label>
            {livro.orientacao === 'horizontal' && (
              <label className="campo">
                <span>Abertura</span>
                <select
                  value={livro.modoHorizontal ?? 'auto'}
                  onChange={(e) => atualizar({ modoHorizontal: e.target.value === 'auto' ? null : (e.target.value as ModoHorizontal) })}
                >
                  <option value="auto">Automática</option>
                  <option value="topo">No topo</option>
                  <option value="uma">Uma página</option>
                  <option value="duas">Duas páginas</option>
                </select>
              </label>
            )}
          </div>

          <p className="ficha-linha">
            {[
              plural(livro.totalPaginas, 'página', 'páginas'),
              formatarBytes(livro.tamanhoBytes),
              livro.ultimaLeitura !== null ? `na página ${livro.paginaAtual}` : '',
              livro.temTexto === false ? 'sem busca (PDF de imagens)' : '',
            ]
              .filter(Boolean)
              .join(', ')}
            <br />
            <span className="quebra">{livro.nomeArquivo}</span>, {formatarData(livro.adicionadoEm)}
          </p>
        </div>
      </div>
    </Dialogo>
  )
}
