import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, excluirColecao, novoId } from '../lib/db'
import type { Colecao } from '../lib/types'
import { Dialogo } from './Dialogo'
import { IconeLixeira, IconeMais } from './Icones'

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
      <span className="colecao-contagem" title="Livros na coleção">
        {quantos}
      </span>
      {confirmando ? (
        <>
          <button type="button" className="botao botao-mini botao-perigo" onClick={() => void excluirColecao(colecao.id)}>
            Excluir
          </button>
          <button type="button" className="botao botao-mini" onClick={() => setConfirmando(false)}>
            Cancelar
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
        {colecoes.length === 0 && <p className="nota">Nenhuma coleção.</p>}
        <ul className="colecoes-gerenciar">
          {colecoes.map((c) => (
            <Linha key={c.id} colecao={c} quantos={livros.filter((l) => l.colecoesIds.includes(c.id)).length} />
          ))}
        </ul>
        <div className="etiqueta-nova etiqueta-nova-larga">
          <input
            type="text"
            placeholder="Nova coleção"
            aria-label="Nome da nova coleção"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void criar()}
          />
          <button type="button" className="botao-quadrado botao-quadrado-principal" onClick={() => void criar()} disabled={!nova.trim()} aria-label="Criar a coleção" title="Criar a coleção">
            <IconeMais />
          </button>
        </div>
      </div>
    </Dialogo>
  )
}
