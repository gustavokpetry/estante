import { useState } from 'react'
import { aplicarTema, temaSalvo } from '../lib/tema'
import type { Tema } from '../lib/types'
import { IconeAuto, IconeInfo, IconeLua, IconeMais, IconeSol } from './Icones'

const ORDEM: Tema[] = ['auto', 'claro', 'escuro']
const ROTULO: Record<Tema, string> = {
  auto: 'Tema: igual ao do aparelho',
  claro: 'Tema: dia',
  escuro: 'Tema: noite',
}

interface Props {
  aoAdicionar: () => void
  aoAbrirSobre: () => void
}

export function Cabecalho({ aoAdicionar, aoAbrirSobre }: Props) {
  const [tema, setTema] = useState<Tema>(temaSalvo)

  function alternarTema() {
    const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length]
    setTema(proximo)
    aplicarTema(proximo)
  }

  return (
    <header className="tabua">
      <div className="tabua-conteudo">
        <h1 className="placa">Estante</h1>
        <div className="tabua-acoes">
          <button type="button" className="botao botao-principal" onClick={aoAdicionar}>
            <IconeMais />
            <span>Adicionar PDFs</span>
          </button>
          <button
            type="button"
            className="botao-icone"
            onClick={alternarTema}
            aria-label={`${ROTULO[tema]}. Trocar tema`}
            title={ROTULO[tema]}
          >
            {tema === 'auto' ? <IconeAuto /> : tema === 'claro' ? <IconeSol /> : <IconeLua />}
          </button>
          <button
            type="button"
            className="botao-icone"
            onClick={aoAbrirSobre}
            aria-label="Sobre o app e armazenamento"
            title="Sobre o app e armazenamento"
          >
            <IconeInfo />
          </button>
        </div>
      </div>
    </header>
  )
}
