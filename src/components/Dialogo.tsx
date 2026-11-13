import { useEffect, useRef, type ReactNode } from 'react'
import { IconeFechar } from './Icones'

interface Props {
  titulo: string
  aoFechar: () => void
  children: ReactNode
  largo?: boolean
}

/** Janela modal sobre a estante. Fecha com Esc, no X ou tocando fora. */
export function Dialogo({ titulo, aoFechar, children, largo }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (dialogo && !dialogo.open) dialogo.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className={`dialogo${largo ? ' dialogo-largo' : ''}`}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
    >
      <div className="dialogo-folha">
        <header className="dialogo-topo">
          <h2>{titulo}</h2>
          <button type="button" className="botao-icone" onClick={() => ref.current?.close()} aria-label="Fechar">
            <IconeFechar />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
