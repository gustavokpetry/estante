import { useState } from 'react'
import { db, excluirLivro } from '../lib/db'
import { formatarBytes, formatarData, plural } from '../lib/formato'
import type { Livro, ModoHorizontal, Orientacao } from '../lib/types'
import { Dialogo } from './Dialogo'
import { useCapa } from './useCapa'

interface Props {
  livro: Livro
  aoFechar: () => void
  aoLer: (id: string) => void
}

export function DialogoLivro({ livro, aoFechar, aoLer }: Props) {
  const capa = useCapa(livro.id)
  const [titulo, setTitulo] = useState(livro.titulo)
  const [autor, setAutor] = useState(livro.autor)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const mudou = titulo.trim() !== livro.titulo || autor.trim() !== livro.autor
  const podeSalvar = mudou && titulo.trim().length > 0

  async function salvar() {
    if (!podeSalvar) return
    await db.livros.update(livro.id, { titulo: titulo.trim(), autor: autor.trim() })
    setSalvo(true)
  }

  async function excluir() {
    await excluirLivro(livro.id)
    aoFechar()
  }

  return (
    <Dialogo titulo="Detalhes do livro" aoFechar={aoFechar} largo>
      <div className="detalhes">
        <div className="detalhes-capa" style={{ aspectRatio: String(livro.proporcaoCapa || 0.7) }}>
          {capa && <img src={capa} alt={`Capa de ${livro.titulo}`} />}
        </div>

        <div className="detalhes-corpo">
          <label className="campo">
            <span>Título</span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value)
                setSalvo(false)
              }}
            />
          </label>
          <label className="campo">
            <span>Autor</span>
            <input
              type="text"
              value={autor}
              placeholder="Sem autor"
              onChange={(e) => {
                setAutor(e.target.value)
                setSalvo(false)
              }}
            />
          </label>

          <div className="campos-lado-a-lado">
            <label className="campo">
              <span>Formato das páginas</span>
              <select
                value={livro.orientacao}
                onChange={(e) => void db.livros.update(livro.id, { orientacao: e.target.value as Orientacao })}
              >
                <option value="vertical">Vertical (em pé)</option>
                <option value="horizontal">Horizontal (deitado)</option>
              </select>
            </label>
            {livro.orientacao === 'horizontal' && (
              <label className="campo">
                <span>Como o livro abre</span>
                <select
                  value={livro.modoHorizontal ?? 'auto'}
                  onChange={(e) =>
                    void db.livros.update(livro.id, {
                      modoHorizontal: e.target.value === 'auto' ? null : (e.target.value as ModoHorizontal),
                    })
                  }
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
            <div>
              <dt>Tamanho</dt>
              <dd>
                {plural(livro.totalPaginas, 'página', 'páginas')}, {formatarBytes(livro.tamanhoBytes)}
              </dd>
            </div>
            {livro.ultimaLeitura !== null && (
              <div>
                <dt>Leitura</dt>
                <dd>
                  Página {livro.paginaAtual} de {livro.totalPaginas}
                </dd>
              </div>
            )}
            <div>
              <dt>Adicionado em</dt>
              <dd>{formatarData(livro.adicionadoEm)}</dd>
            </div>
            <div>
              <dt>Arquivo</dt>
              <dd className="quebra">{livro.nomeArquivo}</dd>
            </div>
          </dl>

          <div className="detalhes-acoes">
            <button type="button" className="botao botao-principal" onClick={() => aoLer(livro.id)}>
              {livro.ultimaLeitura ? 'Continuar lendo' : 'Ler'}
            </button>
            <button type="button" className="botao" onClick={salvar} disabled={!podeSalvar}>
              Salvar alterações
            </button>
            {salvo && !mudou && (
              <span className="nota-salvo" role="status">
                Alterações salvas
              </span>
            )}
          </div>

          <div className="zona-exclusao">
            {confirmandoExclusao ? (
              <>
                <p>
                  Excluir “{livro.titulo}”? O PDF sai deste navegador e não dá para desfazer.
                </p>
                <div className="detalhes-acoes">
                  <button type="button" className="botao botao-perigo" onClick={excluir}>
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
