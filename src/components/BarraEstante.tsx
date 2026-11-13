import { useState } from 'react'
import { salvarConfiguracao } from '../lib/db'
import { SEM_FILTROS, temFiltroAtivo, type Filtros } from '../lib/filtros'
import type { Colecao, Ordenacao, StatusLeitura, VisualEstante } from '../lib/types'
import { IconeBusca, IconeFechar, IconeFiltro, IconeGrade, IconeLombadas, IconePasta, IconePrateleira } from './Icones'

interface Props {
  filtros: Filtros
  aoFiltrar: (f: Filtros) => void
  ordem: Ordenacao
  visual: VisualEstante
  colecoes: Colecao[]
  tags: string[]
  aoGerenciarColecoes: () => void
}

const VISUAIS: Array<{ valor: VisualEstante; nome: string; Icone: typeof IconeGrade }> = [
  { valor: 'grade', nome: 'Grade de capas', Icone: IconeGrade },
  { valor: 'madeira', nome: 'Estante de madeira', Icone: IconePrateleira },
  { valor: 'lombadas', nome: 'Lombadas', Icone: IconeLombadas },
]

export function BarraEstante({ filtros, aoFiltrar, ordem, visual, colecoes, tags, aoGerenciarColecoes }: Props) {
  const [aberto, setAberto] = useState(false)
  const ativos = [filtros.colecaoId, filtros.tag, filtros.status, filtros.avaliacaoMinima].filter((v) => v !== null).length

  return (
    <div className="barra-estante">
      <div className="barra-linha">
        <label className="busca">
          <IconeBusca />
          <input
            type="search"
            placeholder="Buscar"
            aria-label="Buscar por título ou autor"
            value={filtros.busca}
            onChange={(e) => aoFiltrar({ ...filtros, busca: e.target.value })}
          />
        </label>

        <button
          type="button"
          className={`botao-quadrado${ativos ? ' com-filtros' : ''}`}
          aria-expanded={aberto}
          aria-label={ativos ? `Filtros e ordem (${ativos} em uso)` : 'Filtros e ordem'}
          title="Filtros e ordem"
          onClick={() => setAberto(!aberto)}
        >
          <IconeFiltro />
          {ativos > 0 && <span className="contador">{ativos}</span>}
        </button>

        <div className="visuais" role="radiogroup" aria-label="Visual da estante">
          {VISUAIS.map(({ valor, nome, Icone }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={visual === valor}
              aria-label={nome}
              title={nome}
              className={visual === valor ? 'ativo' : ''}
              onClick={() => void salvarConfiguracao('visualEstante', valor)}
            >
              <Icone />
            </button>
          ))}
        </div>
      </div>

      {aberto && (
        <div className="barra-filtros">
          <label className="campo campo-compacto">
            <span>Ordem</span>
            <select value={ordem} onChange={(e) => void salvarConfiguracao('ordemEstante', e.target.value)}>
              <option value="manual">Minha ordem</option>
              <option value="recentes">Adicionados</option>
              <option value="lidos">Lidos por último</option>
              <option value="titulo">Título</option>
              <option value="progresso">Progresso</option>
              <option value="avaliacao">Avaliação</option>
            </select>
          </label>
          <label className="campo campo-compacto">
            <span>Coleção</span>
            <select value={filtros.colecaoId ?? ''} onChange={(e) => aoFiltrar({ ...filtros, colecaoId: e.target.value || null })}>
              <option value="">Todas</option>
              {colecoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo campo-compacto">
            <span>Tag</span>
            <select value={filtros.tag ?? ''} onChange={(e) => aoFiltrar({ ...filtros, tag: e.target.value || null })}>
              <option value="">Todas</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="campo campo-compacto">
            <span>Status</span>
            <select value={filtros.status ?? ''} onChange={(e) => aoFiltrar({ ...filtros, status: (e.target.value || null) as StatusLeitura | null })}>
              <option value="">Todos</option>
              <option value="quero-ler">Quero ler</option>
              <option value="lendo">Lendo</option>
              <option value="lido">Lido</option>
            </select>
          </label>
          <label className="campo campo-compacto">
            <span>Avaliação</span>
            <select
              value={filtros.avaliacaoMinima ?? ''}
              onChange={(e) => aoFiltrar({ ...filtros, avaliacaoMinima: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">Qualquer</option>
              <option value="5">5</option>
              <option value="4">4 ou mais</option>
              <option value="3">3 ou mais</option>
              <option value="2">2 ou mais</option>
              <option value="1">1 ou mais</option>
              <option value="0">Sem nota</option>
            </select>
          </label>
          <div className="barra-filtros-acoes">
            <button type="button" className="botao-quadrado" onClick={aoGerenciarColecoes} aria-label="Gerenciar coleções" title="Gerenciar coleções">
              <IconePasta />
            </button>
            {temFiltroAtivo(filtros) && (
              <button type="button" className="botao-quadrado" onClick={() => aoFiltrar(SEM_FILTROS)} aria-label="Limpar filtros" title="Limpar filtros">
                <IconeFechar />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
