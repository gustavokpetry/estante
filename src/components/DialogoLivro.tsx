import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, excluirLivro, novoId } from '../lib/db'
import { limparTag, tagsEmUso } from '../lib/filtros'
import { formatarBytes, formatarData, plural } from '../lib/formato'
import type { Livro, ModoHorizontal, Orientacao, StatusLeitura } from '../lib/types'
import { Dialogo } from './Dialogo'
import { DialogoCapa } from './DialogoCapa'
import { EscolherEstrelas } from './Estrelas'
import { IconeFechar } from './Icones'
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
    <Dialogo titulo="Detalhes do livro" aoFechar={aoFechar} largo>
      <div className="detalhes">
        <div className="detalhes-lateral">
          <div className="detalhes-capa" style={{ aspectRatio: String(livro.proporcaoCapa || 0.7) }}>
            {capa && <img src={capa} alt={`Capa de ${livro.titulo}`} />}
          </div>
          <button type="button" className="botao" onClick={() => setEditandoCapa(true)}>
            Trocar capa
          </button>
          <button type="button" className="botao botao-principal" onClick={() => aoLer(livro.id)}>
            {livro.ultimaLeitura ? 'Continuar lendo' : 'Ler'}
          </button>
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
              <span>Status de leitura</span>
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
                <button type="button" className="botao botao-mini" onClick={adicionarTag} disabled={!limparTag(novaTag)}>
                  Adicionar
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
                <button type="button" className="botao botao-mini" onClick={() => void criarColecao()} disabled={!novaColecao.trim()}>
                  Criar
                </button>
              </span>
            </div>
          </div>

          <div className="campos-lado-a-lado">
            <label className="campo">
              <span>Formato das páginas</span>
              <select value={livro.orientacao} onChange={(e) => atualizar({ orientacao: e.target.value as Orientacao })}>
                <option value="vertical">Vertical (em pé)</option>
                <option value="horizontal">Horizontal (deitado)</option>
              </select>
            </label>
            {livro.orientacao === 'horizontal' && (
              <label className="campo">
                <span>Como o livro abre</span>
                <select
                  value={livro.modoHorizontal ?? 'auto'}
                  onChange={(e) => atualizar({ modoHorizontal: e.target.value === 'auto' ? null : (e.target.value as ModoHorizontal) })}
                >
                  <option value="auto">Automático</option>
                  <option value="topo">Encadernação no topo</option>
                  <option value="uma">Uma página por vez</option>
                  <option value="duas">Duas páginas lado a lado</option>
                </select>
              </label>
            )}
          </div>

          <dl className="ficha">
            {livro.ultimaLeitura !== null && (
              <div>
                <dt>Leitura</dt>
                <dd>
                  Página {livro.paginaAtual} de {livro.totalPaginas}
                </dd>
              </div>
            )}
            <div>
              <dt>Tamanho</dt>
              <dd>
                {plural(livro.totalPaginas, 'página', 'páginas')}, {formatarBytes(livro.tamanhoBytes)}
              </dd>
            </div>
            <div>
              <dt>Adicionado em</dt>
              <dd>{formatarData(livro.adicionadoEm)}</dd>
            </div>
            <div>
              <dt>Arquivo</dt>
              <dd className="quebra">{livro.nomeArquivo}</dd>
            </div>
            {livro.temTexto === false && (
              <div>
                <dt>Busca</dt>
                <dd>Indisponível: este PDF é feito de imagens, sem texto.</dd>
              </div>
            )}
          </dl>

          <div className="zona-exclusao">
            {confirmandoExclusao ? (
              <>
                <p>Excluir “{livro.titulo}”? O PDF e as anotações saem deste navegador e não dá para desfazer.</p>
                <div className="detalhes-acoes">
                  <button
                    type="button"
                    className="botao botao-perigo"
                    onClick={() => {
                      void excluirLivro(livro.id)
                      aoFechar()
                    }}
                  >
                    Excluir livro
                  </button>
                  <button type="button" className="botao" onClick={() => setConfirmandoExclusao(false)}>
                    Manter na estante
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="botao botao-discreto-perigo" onClick={() => setConfirmandoExclusao(true)}>
                Excluir livro
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialogo>
  )
}
