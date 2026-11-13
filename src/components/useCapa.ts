import { useEffect, useState } from 'react'
import { db } from '../lib/db'

/**
 * Carrega a capa do banco e devolve um endereço temporário para a imagem.
 * `versao` muda quando a capa é trocada, para a imagem ser recarregada.
 */
export function useCapa(livroId: string, versao: string = ''): string | null {
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
  }, [livroId, versao])

  return url
}

/** Assinatura da capa de um livro: muda sempre que a capa muda. */
export function versaoDaCapa(livro: { tipoCapa: string; parametrosCapa?: unknown; corLombada?: string | null; proporcaoCapa: number }): string {
  return `${livro.tipoCapa}|${JSON.stringify(livro.parametrosCapa ?? '')}|${livro.corLombada ?? ''}|${livro.proporcaoCapa}`
}
