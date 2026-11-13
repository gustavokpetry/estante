import { useState } from 'react'
import { db, excluirLivro } from '../lib/db'
import { formatarBytes, formatarData, plural } from '../lib/formato'
import type { Livro } from '../lib/types'
import { Dialogo } from './Dialogo'
import { useCapa } from './useCapa'

interface Props {
  livro: Livro
  aoFechar: () => void
}

export function DialogoLivro({ livro, aoFechar }: Props) {
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

          <dl className="ficha">
            <div>
              <dt>Tamanho</dt>
              <dd>
                {plural(livro.totalPaginas, 'página', 'páginas')}, {formatarBytes(livro.tamanhoBytes)}
              </dd>
            </div>
            <div>
              <dt>Formato</dt>
              <dd>{livro.orientacao === 'horizontal' ? 'Horizontal (páginas deitadas)' : 'Vertical'}</dd>
            </div>
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
            <button type="button" className="botao botao-principal" onClick={salvar} disabled={!podeSalvar}>
              Salvar alterações
            </button>
            {salvo && !mudou && (
              <span className="nota-salvo" role="status">
                Alterações salvas
              </span>
            )}
          </div>

          <p className="nota">A leitura em formato de livro chega na versão 1.1.</p>

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
