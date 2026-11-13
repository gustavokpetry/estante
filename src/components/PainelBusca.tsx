import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import { plural } from '../lib/formato'
import { indexarLivro, useIndexacao } from '../lib/indexador'
import { normalizar, procurarNaPagina, type Ocorrencia } from '../lib/texto'
import type { TextoPagina } from '../lib/types'
import { IconeFechar } from './Icones'

interface Props {
  livroId: string
  /** null: texto ainda sendo preparado. false: PDF sem texto. */
  temTexto: boolean | null
  termo: string
  aoMudarTermo: (termo: string) => void
  aoIr: (pagina: number) => void
  aoFechar: () => void
}

const LIMITE = 300

export function PainelBusca({ livroId, temTexto, termo, aoMudarTermo, aoIr, aoFechar }: Props) {
  const [textos, setTextos] = useState<TextoPagina[] | null>(null)
  const [digitado, setDigitado] = useState(termo)
  const indexacao = useIndexacao()

  useEffect(() => {
    if (temTexto === null) indexarLivro(livroId)
    if (temTexto !== true) return
    let vivo = true
    void db.textos
      .where('livroId')
      .equals(livroId)
      .sortBy('pagina')
      .then((t) => vivo && setTextos(t))
    return () => {
      vivo = false
    }
  }, [livroId, temTexto])

  // Espera a digitação assentar antes de procurar no livro inteiro.
  useEffect(() => {
    const espera = setTimeout(() => aoMudarTermo(digitado), 250)
    return () => clearTimeout(espera)
  }, [digitado, aoMudarTermo])

  const resultados = useMemo(() => {
    const alvo = normalizar(termo.trim())
    if (!textos || alvo.length < 2) return null
    const achados: Ocorrencia[] = []
    for (const t of textos) {
      achados.push(...procurarNaPagina(t.pagina, t.texto, alvo, 10))
      if (achados.length >= LIMITE) break
    }
    return achados.slice(0, LIMITE)
  }, [textos, termo])

  const preparando = temTexto === null
  const progresso = indexacao.livroId === livroId && indexacao.total > 0 ? `página ${indexacao.feitas} de ${indexacao.total}` : 'na fila'

  return (
    <section className="painel painel-busca" aria-label="Buscar no livro">
      <header className="painel-topo">
        <h2>Buscar no livro</h2>
        <button type="button" className="botao-icone botao-icone-pequeno" onClick={aoFechar} aria-label="Fechar busca">
          <IconeFechar />
        </button>
      </header>
      <div className="painel-corpo">
        {temTexto === false && <p className="selo selo-alerta">Este PDF é feito de imagens, sem texto. A busca não está disponível para ele.</p>}
        {preparando && (
          <p className="selo" role="status">
            Preparando o texto deste livro para a busca ({progresso}). Pode continuar lendo.
          </p>
        )}
        {temTexto === true && (
          <>
            <label className="campo">
              <span>Palavra ou trecho</span>
              <input type="search" value={digitado} autoFocus onChange={(e) => setDigitado(e.target.value)} />
            </label>
            {resultados && (
              <p className="painel-nota" role="status">
                {resultados.length === 0
                  ? 'Nada encontrado.'
                  : resultados.length >= LIMITE
                    ? `Mostrando as primeiras ${LIMITE} ocorrências.`
                    : plural(resultados.length, 'ocorrência', 'ocorrências')}
              </p>
            )}
            {!resultados && <p className="painel-nota">Digite pelo menos duas letras. A busca ignora acentos e maiúsculas.</p>}
            <ul className="resultados">
              {resultados?.map((r, i) => (
                <li key={i}>
                  <button type="button" onClick={() => aoIr(r.pagina)}>
                    <span className="resultado-pagina">Página {r.pagina}</span>
                    <span className="resultado-trecho">
                      {r.antes}
                      <mark>{r.termo}</mark>
                      {r.depois}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
