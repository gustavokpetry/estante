/**
 * Normalização para busca: minúsculas e sem acentos, caractere por
 * caractere. O resultado tem o mesmo tamanho do original, então uma posição
 * encontrada no texto normalizado vale também no texto original.
 */
export function normalizar(texto: string): string {
  let saida = ''
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    const codigo = c.charCodeAt(0)
    if (codigo < 128) {
      saida += c.toLowerCase()
      continue
    }
    // Pares substitutos (emoji etc.) passam intactos para não desalinhar.
    if (codigo >= 0xd800 && codigo <= 0xdfff) {
      saida += c
      continue
    }
    const base = c.normalize('NFD')[0].toLowerCase()
    saida += base.length === 1 ? base : c
  }
  return saida
}

export interface Ocorrencia {
  pagina: number
  /** Trecho ao redor do termo, dividido para o termo poder ser realçado. */
  antes: string
  termo: string
  depois: string
}

const CONTEXTO = 48

/** Procura um termo no texto de uma página e devolve os trechos onde aparece. */
export function procurarNaPagina(pagina: number, texto: string, termoNormalizado: string, limite = 20): Ocorrencia[] {
  if (!termoNormalizado) return []
  const alvo = normalizar(texto)
  const achados: Ocorrencia[] = []
  let de = 0
  while (achados.length < limite) {
    const i = alvo.indexOf(termoNormalizado, de)
    if (i === -1) break
    const fim = i + termoNormalizado.length
    const inicioTrecho = Math.max(0, i - CONTEXTO)
    const fimTrecho = Math.min(texto.length, fim + CONTEXTO)
    achados.push({
      pagina,
      antes: (inicioTrecho > 0 ? '…' : '') + texto.slice(inicioTrecho, i).replace(/\s+/g, ' '),
      termo: texto.slice(i, fim),
      depois: texto.slice(fim, fimTrecho).replace(/\s+/g, ' ') + (fimTrecho < texto.length ? '…' : ''),
    })
    de = fim
  }
  return achados
}

/** Junta retângulos da mesma linha que se tocam (seleções vêm picadas por palavra). */
export function juntarRetangulos<R extends { x: number; y: number; l: number; a: number }>(lista: R[]): R[] {
  const ordenados = [...lista].filter((r) => r.l > 0.0005 && r.a > 0.0005).sort((p, q) => p.y - q.y || p.x - q.x)
  const saida: R[] = []
  for (const r of ordenados) {
    const ultimo = saida[saida.length - 1]
    const mesmaLinha =
      ultimo && Math.abs(ultimo.y - r.y) < ultimo.a * 0.5 && Math.abs(ultimo.a - r.a) < Math.max(ultimo.a, r.a) * 0.6
    if (mesmaLinha && r.x <= ultimo.x + ultimo.l + 0.012) {
      const direita = Math.max(ultimo.x + ultimo.l, r.x + r.l)
      const topo = Math.min(ultimo.y, r.y)
      const base = Math.max(ultimo.y + ultimo.a, r.y + r.a)
      ultimo.l = direita - ultimo.x
      ultimo.y = topo
      ultimo.a = base - topo
    } else {
      saida.push({ ...r })
    }
  }
  return saida
}
