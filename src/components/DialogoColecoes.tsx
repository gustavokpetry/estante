import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, excluirColecao, novoId } from '../lib/db'
import { plural } from '../lib/formato'
import type { Colecao } from '../lib/types'
import { Dialogo } from './Dialogo'
import { IconeLixeira } from './Icones'

function Linha({ colecao, quantos }: { colecao: Colecao; quantos: number }) {
  const [nome, setNome] = useState(colecao.nome)
  const [confirmando, setConfirmando] = useState(false)

  const renomear = () => {
    const n = nome.trim()
    if (n && n !== colecao.nome) void db.colecoes.update(colecao.id, { nome: n })
    else setNome(colecao.nome)
  }

  return (
    <li className="colecao-linha">
      <input type="text" value={nome} aria-label={`Nome da coleção ${colecao.nome}`} onChange={(e) => setNome(e.target.value)} onBlur={renomear} />
      <span className="colecao-contagem">{plural(quantos, 'livro', 'livros')}</span>
      {confirmando ? (
        <>
          <button type="button" className="botao botao-mini botao-perigo" onClick={() => void excluirColecao(colecao.id)}>
            Excluir coleção
          </button>
          <button type="button" className="botao botao-mini" onClick={() => setConfirmando(false)}>
            Manter
          </button>
        </>
      ) : (
        <button type="button" className="botao-icone botao-icone-pequeno" aria-label={`Excluir a coleção ${colecao.nome}`} onClick={() => setConfirmando(true)}>
          <IconeLixeira />
        </button>
      )}
    </li>
  )
}

export function DialogoColecoes({ aoFechar }: { aoFechar: () => void }) {
  const colecoes = useLiveQuery(() => db.colecoes.orderBy('nome').toArray(), []) ?? []
  const livros = useLiveQuery(() => db.livros.toArray(), []) ?? []
  const [nova, setNova] = useState('')

  const criar = async () => {
    const nome = nova.trim()
    if (!nome || colecoes.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) return
    await db.colecoes.add({ id: novoId(), nome, criadaEm: Date.now() })
    setNova('')
  }

  return (
    <Dialogo titulo="Coleções" aoFechar={aoFechar}>
      <div className="sobre">
        <p>Uma coleção reúne livros que você quer ver juntos. Um livro pode estar em várias. Excluir uma coleção não exclui os livros.</p>
        {colecoes.length === 0 && <p className="nota">Nenhuma coleção ainda.</p>}
        <ul className="colecoes-gerenciar">
          {colecoes.map((c) => (
            <Linha key={c.id} colecao={c} quantos={livros.filter((l) => l.colecoesIds.includes(c.id)).length} />
          ))}
        </ul>
        <div className="etiqueta-nova etiqueta-nova-larga">
          <input
            type="text"
            placeholder="Nome da nova coleção"
            aria-label="Nome da nova coleção"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void criar()}
          />
          <button type="button" className="botao botao-principal" onClick={() => void criar()} disabled={!nova.trim()}>
            Criar coleção
          </button>
        </div>
      </div>
    </Dialogo>
  )
}
