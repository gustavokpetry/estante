import { useEffect, useState } from 'react'

export type Rota = { tela: 'estante' } | { tela: 'leitor'; livroId: string }

/** Rotas pelo "#" do endereço, que funcionam no GitHub Pages sem configuração. */
export function lerRota(hash: string): Rota {
  const m = /^#\/ler\/([0-9a-f]{64})$/.exec(hash)
  if (m) return { tela: 'leitor', livroId: m[1] }
  return { tela: 'estante' }
}

export function useRota(): Rota {
  const [rota, setRota] = useState<Rota>(() => lerRota(location.hash))
  useEffect(() => {
    const aoMudar = () => setRota(lerRota(location.hash))
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])
  return rota
}

export function abrirLivro(id: string): void {
  location.hash = `#/ler/${id}`
}

export function voltarParaEstante(): void {
  location.hash = '#/'
}
