import { db } from './db'

/** Data local no formato AAAA-MM-DD. */
export function chaveDoDia(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

function diaAnterior(chave: string): string {
  const [a, m, d] = chave.split('-').map(Number)
  return chaveDoDia(new Date(a, m - 1, d - 1))
}

/** Os últimos `n` dias, do mais antigo para hoje. */
export function ultimosDias(n: number, hoje: string = chaveDoDia()): string[] {
  const dias = [hoje]
  while (dias.length < n) dias.unshift(diaAnterior(dias[0]))
  return dias
}

/**
 * Dias seguidos com leitura, contando para trás a partir de hoje.
 * Se hoje ainda não houve leitura, a sequência de ontem continua valendo.
 */
export function sequenciaDeDias(diasComLeitura: Iterable<string>, hoje: string = chaveDoDia()): number {
  const dias = new Set(diasComLeitura)
  let dia = dias.has(hoje) ? hoje : diaAnterior(hoje)
  let total = 0
  while (dias.has(dia)) {
    total++
    dia = diaAnterior(dia)
  }
  return total
}

/** "2 h 15 min", "45 min", "30 s". */
export function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  if (s < 60) return `${s} s`
  const minutos = Math.round(s / 60)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto ? `${horas} h ${resto} min` : `${horas} h`
}

/** Soma tempo e páginas lidas ao registro do dia. */
export async function registrarLeitura(livroId: string, segundos: number, paginas: number): Promise<void> {
  if (segundos <= 0 && paginas <= 0) return
  const data = chaveDoDia()
  await db.transaction('rw', db.leituras, async () => {
    const atual = await db.leituras.get([data, livroId])
    await db.leituras.put({
      data,
      livroId,
      segundos: (atual?.segundos ?? 0) + segundos,
      paginas: (atual?.paginas ?? 0) + paginas,
    })
  })
}
