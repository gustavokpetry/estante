import { useEffect, useState } from 'react'
import { db } from '../lib/db'

/** Carrega a capa do banco e devolve um endereço temporário para a imagem. */
export function useCapa(livroId: string): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    let criado: string | null = null
    void db.capas.get(livroId).then((capa) => {
      if (cancelado || !capa) return
      criado = URL.createObjectURL(capa.blob)
      setUrl(criado)
    })
    return () => {
      cancelado = true
      if (criado) URL.revokeObjectURL(criado)
    }
  }, [livroId])

  return url
}
