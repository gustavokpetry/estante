import { useEffect, useRef, useState } from 'react'

function trazArquivos(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

/** Aceita PDFs arrastados para qualquer ponto da janela. */
export function SoltarArquivos({ aoSoltar }: { aoSoltar: (arquivos: File[]) => void }) {
  const [ativo, setAtivo] = useState(false)
  const profundidade = useRef(0)

  useEffect(() => {
    function entrar(e: DragEvent) {
      if (!trazArquivos(e)) return
      e.preventDefault()
      profundidade.current++
      setAtivo(true)
    }
    function sobre(e: DragEvent) {
      if (!trazArquivos(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    function sair(e: DragEvent) {
      if (!trazArquivos(e)) return
      profundidade.current = Math.max(0, profundidade.current - 1)
      if (profundidade.current === 0) setAtivo(false)
    }
    function soltar(e: DragEvent) {
      if (!trazArquivos(e)) return
      e.preventDefault()
      profundidade.current = 0
      setAtivo(false)
      aoSoltar(Array.from(e.dataTransfer?.files ?? []))
    }
    window.addEventListener('dragenter', entrar)
    window.addEventListener('dragover', sobre)
    window.addEventListener('dragleave', sair)
    window.addEventListener('drop', soltar)
    return () => {
      window.removeEventListener('dragenter', entrar)
      window.removeEventListener('dragover', sobre)
      window.removeEventListener('dragleave', sair)
      window.removeEventListener('drop', soltar)
    }
  }, [aoSoltar])

  if (!ativo) return null
  return (
    <div className="soltar" aria-hidden="true">
      <div className="soltar-moldura">
        <p>Solte os PDFs para guardá-los na estante</p>
      </div>
    </div>
  )
}
