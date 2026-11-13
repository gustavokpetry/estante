/** "12,4 MB", "830 KB"… */
export function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let valor = bytes
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i++
  }
  const casas = valor >= 100 || i <= 1 ? 0 : 1
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${unidades[i]}`
}

/** Título de reserva a partir do nome do arquivo: "meu_livro.pdf" → "meu livro". */
export function tituloDoArquivo(nome: string): string {
  const semExtensao = nome.replace(/\.pdf$/i, '')
  const limpo = semExtensao.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim()
  return limpo || 'Sem título'
}

/**
 * Muitos PDFs trazem no campo "título" o nome do programa ou do arquivo
 * original ("Microsoft Word - cap1.docx", "untitled"). Nesses casos o nome
 * do arquivo costuma ser melhor.
 */
export function tituloConfiavel(titulo: string | undefined | null): string | null {
  const t = (titulo ?? '').trim()
  if (t.length < 2) return null
  if (/^(untitled|sem t[ií]tulo|document\d*|documento\d*)$/i.test(t)) return null
  if (/\.(docx?|pdf|indd|pptx?|odt|rtf|tex|qxd)$/i.test(t)) return null
  if (/^microsoft (word|powerpoint)/i.test(t)) return null
  return t
}

/** Descarta autores de enfeite deixados por programas ("anonymous", "unknown"…). */
export function autorConfiavel(autor: string | undefined | null): string {
  const a = (autor ?? '').trim()
  if (/^(anonymous|an[oô]nimo|unknown|desconhecido|user|usu[aá]rio|admin|owner)$/i.test(a)) return ''
  return a
}

export function formatarData(ms: number): string {
  return new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function plural(n: number, singular: string, pluralStr: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralStr}`
}
