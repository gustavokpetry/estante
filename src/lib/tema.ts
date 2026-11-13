import { salvarConfiguracao } from './db'
import type { Tema } from './types'

const CHAVE = 'estante:tema'

export function temaSalvo(): Tema {
  try {
    const t = localStorage.getItem(CHAVE)
    if (t === 'claro' || t === 'escuro') return t
  } catch {
    // localStorage bloqueado: segue o sistema.
  }
  return 'auto'
}

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement
  if (tema === 'auto') delete raiz.dataset.tema
  else raiz.dataset.tema = tema
  try {
    if (tema === 'auto') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, tema)
  } catch {
    // Sem localStorage o tema vale só para esta visita.
  }
  // Cópia no banco, para entrar no backup (v1.7).
  void salvarConfiguracao('tema', tema)
}

export function temaEfetivo(tema: Tema): 'claro' | 'escuro' {
  if (tema !== 'auto') return tema
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}
