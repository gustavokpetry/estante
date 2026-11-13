import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../lib/db'
import { chaveDoDia, formatarDuracao, sequenciaDeDias, ultimosDias } from '../lib/estatisticas'
import { plural } from '../lib/formato'
import { voltarParaEstante } from '../lib/rota'
import { EstrelasFixas } from './Estrelas'
import { IconeVoltar } from './Icones'

function diaCurto(chave: string): string {
  const [, m, d] = chave.split('-')
  return `${Number(d)}/${Number(m)}`
}

export function Estatisticas() {
  const leituras = useLiveQuery(() => db.leituras.toArray(), [])
  const livros = useLiveQuery(() => db.livros.toArray(), [])

  const dados = useMemo(() => {
    if (!leituras || !livros) return null
    const hoje = chaveDoDia()
    const porDia = new Map<string, { segundos: number; paginas: number; livros: number }>()
    const porLivro = new Map<string, number>()
    let segundos = 0
    let paginas = 0
    for (const r of leituras) {
      segundos += r.segundos
      paginas += r.paginas
      const dia = porDia.get(r.data) ?? { segundos: 0, paginas: 0, livros: 0 }
      dia.segundos += r.segundos
      dia.paginas += r.paginas
      dia.livros += 1
      porDia.set(r.data, dia)
      porLivro.set(r.livroId, (porLivro.get(r.livroId) ?? 0) + r.segundos)
    }
    const dias = ultimosDias(30, hoje).map((chave) => ({ chave, ...(porDia.get(chave) ?? { segundos: 0, paginas: 0, livros: 0 }) }))
    const maiorDia = Math.max(60, ...dias.map((d) => d.segundos))
    const titulos = new Map(livros.map((l) => [l.id, l.titulo]))
    const tempoPorLivro = [...porLivro.entries()]
      .map(([id, s]) => ({ id, titulo: titulos.get(id) ?? 'Livro que não está mais na estante', segundos: s }))
      .filter((l) => l.segundos >= 1)
      .sort((a, b) => b.segundos - a.segundos)
    const notas = [5, 4, 3, 2, 1].map((n) => ({ nota: n, quantos: livros.filter((l) => l.avaliacao !== null && Math.ceil(l.avaliacao) === n).length }))
    return {
      segundos,
      paginas,
      dias,
      maiorDia,
      tempoPorLivro,
      maiorLivro: Math.max(1, ...tempoPorLivro.map((l) => l.segundos)),
      sequencia: sequenciaDeDias(
        [...porDia.entries()].filter(([, d]) => d.segundos >= 60 || d.paginas > 0).map(([chave]) => chave),
        hoje,
      ),
      concluidos: livros.filter((l) => l.status === 'lido').length,
      lendo: livros.filter((l) => l.status === 'lendo').length,
      notas,
      maiorNota: Math.max(1, ...notas.map((n) => n.quantos)),
      avaliados: livros.filter((l) => l.avaliacao !== null).length,
    }
  }, [leituras, livros])

  return (
    <div className="app">
      <header className="tabua">
        <div className="tabua-conteudo">
          <button type="button" className="botao-icone" onClick={voltarParaEstante} aria-label="Voltar para a estante" title="Voltar para a estante">
            <IconeVoltar />
          </button>
          <h1 className="tabua-titulo">Estatísticas de leitura</h1>
        </div>
      </header>

      <main className="parede estatisticas">
        {!dados && <p className="aviso-carregando">Somando as leituras…</p>}
        {dados && dados.segundos < 1 && dados.concluidos === 0 && (
          <p className="estatisticas-vazio">Ainda não há leituras registradas. Abra um livro e o tempo de leitura começa a contar.</p>
        )}
        {dados && (
          <>
            <dl className="numeros">
              <div>
                <dt>Tempo total de leitura</dt>
                <dd>{formatarDuracao(dados.segundos)}</dd>
              </div>
              <div>
                <dt>Páginas lidas</dt>
                <dd>{dados.paginas.toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt>Dias seguidos lendo</dt>
                <dd>{plural(dados.sequencia, 'dia', 'dias')}</dd>
              </div>
              <div>
                <dt>Livros concluídos</dt>
                <dd>
                  {dados.concluidos}
                  {dados.lendo > 0 && <small> e {dados.lendo} em leitura</small>}
                </dd>
              </div>
            </dl>

            <section className="quadro">
              <h2>Últimos 30 dias</h2>
              <div className="barras-dias" role="img" aria-label={`Tempo de leitura por dia nos últimos 30 dias. Total: ${formatarDuracao(dados.dias.reduce((s, d) => s + d.segundos, 0))}.`}>
                {dados.dias.map((d, i) => (
                  <div key={d.chave} className="barra-dia" title={`${diaCurto(d.chave)}: ${formatarDuracao(d.segundos)}, ${plural(d.paginas, 'página', 'páginas')}`}>
                    <span style={{ height: `${d.segundos > 0 ? Math.max(4, (d.segundos / dados.maiorDia) * 100) : 0}%` }} />
                    {(i % 5 === 4 || i === 29) && <small>{diaCurto(d.chave)}</small>}
                  </div>
                ))}
              </div>
              <table className="so-leitor-de-tela">
                <caption>Leitura por dia</caption>
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th>Tempo</th>
                    <th>Páginas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.dias.filter((d) => d.segundos > 0).map((d) => (
                    <tr key={d.chave}>
                      <td>{diaCurto(d.chave)}</td>
                      <td>{formatarDuracao(d.segundos)}</td>
                      <td>{d.paginas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {dados.tempoPorLivro.length > 0 && (
              <section className="quadro">
                <h2>Tempo por livro</h2>
                <ul className="barras-livros">
                  {dados.tempoPorLivro.slice(0, 15).map((l) => (
                    <li key={l.id}>
                      <span className="barras-livros-nome">{l.titulo}</span>
                      <span className="barras-livros-trilho">
                        <span style={{ width: `${Math.max(2, (l.segundos / dados.maiorLivro) * 100)}%` }} />
                      </span>
                      <span className="barras-livros-valor">{formatarDuracao(l.segundos)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {dados.avaliados > 0 && (
              <section className="quadro">
                <h2>Suas avaliações</h2>
                <ul className="barras-livros barras-notas">
                  {dados.notas.map((n) => (
                    <li key={n.nota}>
                      <span className="barras-livros-nome">
                        <EstrelasFixas valor={n.nota} />
                      </span>
                      <span className="barras-livros-trilho">
                        <span style={{ width: `${n.quantos ? Math.max(2, (n.quantos / dados.maiorNota) * 100) : 0}%` }} />
                      </span>
                      <span className="barras-livros-valor">{plural(n.quantos, 'livro', 'livros')}</span>
                    </li>
                  ))}
                </ul>
                <p className="medidor-legenda">Meias estrelas contam na faixa de cima: 3,5 entra em 4 estrelas.</p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
