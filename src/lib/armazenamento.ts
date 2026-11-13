export interface EstadoArmazenamento {
  usado: number | null
  disponivel: number | null
  /** true: o navegador prometeu não apagar os dados sozinho. */
  persistente: boolean | null
}

/** Pede ao navegador para não apagar a biblioteca por conta própria. */
export async function pedirPersistencia(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function lerArmazenamento(): Promise<EstadoArmazenamento> {
  let usado: number | null = null
  let disponivel: number | null = null
  let persistente: boolean | null = null
  try {
    if (navigator.storage?.estimate) {
      const estimativa = await navigator.storage.estimate()
      usado = estimativa.usage ?? null
      disponivel = estimativa.quota ?? null
    }
    if (navigator.storage?.persisted) persistente = await navigator.storage.persisted()
  } catch {
    // Navegador sem a API: mostramos apenas o aviso geral.
  }
  return { usado, disponivel, persistente }
}
