import { useEffect, useRef, useState } from 'react'
import { db, novoId } from '../lib/db'
import type { CorDestaque, Destaque, Marcador, Nota } from '../lib/types'
import { IconeCerto, IconeFechar, IconeLixeira } from './Icones'

export const CORES_DESTAQUE: Array<{ valor: CorDestaque; nome: string }> = [
  { valor: 'amarelo', nome: 'Amarelo' },
  { valor: 'verde', nome: 'Verde' },
  { valor: 'rosa', nome: 'Rosa' },
  { valor: 'azul', nome: 'Azul' },
]

interface Props {
  livroId: string
  /** Páginas na tela agora (uma ou duas). */
  visiveis: number[]
  marcadores: Marcador[]
  notas: Nota[]
  destaques: Destaque[]
  destaqueEmFoco: string | null
  aoIr: (pagina: number) => void
  aoFechar: () => void
}

function CampoDeTexto({ valor, aoSalvar, rotulo, placeholder }: { valor: string; aoSalvar: (v: string) => void; rotulo: string; placeholder?: string }) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  return (
    <textarea
      className="anotacao-texto"
      aria-label={rotulo}
      placeholder={placeholder}
      rows={Math.min(8, Math.max(2, Math.ceil(texto.length / 34)))}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => texto.trim() !== valor && aoSalvar(texto.trim())}
    />
  )
}

export function PainelAnotacoes({ livroId, visiveis, marcadores, notas, destaques, destaqueEmFoco, aoIr, aoFechar }: Props) {
  const [novaNota, setNovaNota] = useState('')
  const lista = useRef<HTMLDivElement>(null)
  const paginaAtual = visiveis[0] ?? 1

  // Ao tocar num destaque na página, o painel rola até ele.
  useEffect(() => {
    if (!destaqueEmFoco) return
    lista.current?.querySelector(`[data-destaque="${destaqueEmFoco}"]`)?.scrollIntoView({ block: 'center' })
  }, [destaqueEmFoco])

  const salvarNota = async () => {
    const texto = novaNota.trim()
    if (!texto) return
    const agora = Date.now()
    await db.notas.add({ id: novoId(), livroId, pagina: paginaAtual, texto, criadoEm: agora, atualizadoEm: agora })
    setNovaNota('')
  }

  return (
    <section className="painel painel-anotacoes" aria-label="Marcadores e anotações">
      <header className="painel-topo">
        <h2>Anotações</h2>
        <button type="button" className="botao-icone botao-icone-pequeno" onClick={aoFechar} aria-label="Fechar anotações">
          <IconeFechar />
        </button>
      </header>
      <div className="painel-corpo" ref={lista}>
        <section className="anotacoes-grupo">
          <h3>Marcadores ({marcadores.length})</h3>
          <ul className="anotacoes-lista">
            {marcadores.map((m) => (
              <li key={m.id} className="anotacao">
                <div className="anotacao-topo">
                  <button type="button" className="anotacao-pagina" onClick={() => aoIr(m.pagina)}>
                    p. {m.pagina}
                  </button>
                  <button type="button" className="botao-icone botao-icone-pequeno" aria-label={`Excluir o marcador ${m.nome}`} onClick={() => void db.marcadores.delete(m.id)}>
                    <IconeLixeira />
                  </button>
                </div>
                <input
                  type="text"
                  className="anotacao-nome"
                  aria-label={`Nome do marcador da página ${m.pagina}`}
                  defaultValue={m.nome}
                  onBlur={(e) => {
                    const nome = e.target.value.trim() || `Página ${m.pagina}`
                    if (nome !== m.nome) void db.marcadores.update(m.id, { nome })
                  }}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="anotacoes-grupo">
          <h3>Notas ({notas.length})</h3>
          <div className="nota-nova">
            <textarea
              className="anotacao-texto"
              rows={2}
              placeholder={`Nota da página ${paginaAtual}`}
              aria-label={`Nova nota na página ${paginaAtual}`}
              value={novaNota}
              onChange={(e) => setNovaNota(e.target.value)}
            />
            <button type="button" className="botao-quadrado botao-quadrado-principal" onClick={() => void salvarNota()} disabled={!novaNota.trim()} aria-label="Salvar a nota" title="Salvar a nota">
              <IconeCerto />
            </button>
          </div>
          <ul className="anotacoes-lista">
            {notas.map((n) => (
              <li key={n.id} className="anotacao">
                <div className="anotacao-topo">
                  <button type="button" className="anotacao-pagina" onClick={() => aoIr(n.pagina)}>
                    p. {n.pagina}
                  </button>
                  <button type="button" className="botao-icone botao-icone-pequeno" aria-label={`Excluir a nota da página ${n.pagina}`} onClick={() => void db.notas.delete(n.id)}>
                    <IconeLixeira />
                  </button>
                </div>
                <CampoDeTexto
                  valor={n.texto}
                  rotulo={`Nota da página ${n.pagina}`}
                  aoSalvar={(texto) => (texto ? void db.notas.update(n.id, { texto, atualizadoEm: Date.now() }) : void db.notas.delete(n.id))}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="anotacoes-grupo">
          <h3>Destaques ({destaques.length})</h3>
          {destaques.length === 0 && (
            <p className="painel-nota">Use a caneta para destacar.</p>
          )}
          <ul className="anotacoes-lista">
            {destaques.map((d) => (
              <li key={d.id} data-destaque={d.id} className={`anotacao anotacao-destaque destaque-borda-${d.cor}${d.id === destaqueEmFoco ? ' em-foco' : ''}`}>
                <div className="anotacao-topo">
                  <button type="button" className="anotacao-pagina" onClick={() => aoIr(d.pagina)}>
                    p. {d.pagina}
                  </button>
                  <button type="button" className="botao-icone botao-icone-pequeno" aria-label="Excluir este destaque" onClick={() => void db.destaques.delete(d.id)}>
                    <IconeLixeira />
                  </button>
                </div>
                <blockquote>{d.texto.length > 220 ? `${d.texto.slice(0, 220)}…` : d.texto}</blockquote>
                <div className="cores-destaque" role="radiogroup" aria-label="Cor do destaque">
                  {CORES_DESTAQUE.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      role="radio"
                      aria-checked={d.cor === c.valor}
                      aria-label={c.nome}
                      title={c.nome}
                      className={`cor-destaque destaque-${c.valor}${d.cor === c.valor ? ' ativa' : ''}`}
                      onClick={() => void db.destaques.update(d.id, { cor: c.valor })}
                    />
                  ))}
                </div>
                <CampoDeTexto valor={d.nota} rotulo="Nota do destaque" placeholder="Nota" aoSalvar={(nota) => void db.destaques.update(d.id, { nota })} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
