import { describe, expect, it } from 'vitest'
import { autorConfiavel, formatarBytes, plural, tituloConfiavel, tituloDoArquivo } from '../src/lib/formato'

describe('tituloDoArquivo', () => {
  it('remove a extensão e os sublinhados', () => {
    expect(tituloDoArquivo('dom_casmurro.pdf')).toBe('dom casmurro')
    expect(tituloDoArquivo('Livro.PDF')).toBe('Livro')
  })
  it('nunca devolve vazio', () => {
    expect(tituloDoArquivo('.pdf')).toBe('Sem título')
  })
})

describe('tituloConfiavel', () => {
  it('aceita títulos de verdade', () => {
    expect(tituloConfiavel('  Memórias Póstumas de Brás Cubas ')).toBe('Memórias Póstumas de Brás Cubas')
  })
  it('recusa títulos gerados por programas', () => {
    expect(tituloConfiavel('Microsoft Word - cap1.docx')).toBeNull()
    expect(tituloConfiavel('untitled')).toBeNull()
    expect(tituloConfiavel('relatorio.indd')).toBeNull()
    expect(tituloConfiavel('')).toBeNull()
    expect(tituloConfiavel(undefined)).toBeNull()
  })
})

describe('formatarBytes', () => {
  it('escolhe a unidade certa', () => {
    expect(formatarBytes(0)).toBe('0 KB')
    expect(formatarBytes(2048)).toBe('2 KB')
    expect(formatarBytes(5.5 * 1024 * 1024)).toBe('5,5 MB')
  })
})

describe('plural', () => {
  it('concorda com o número', () => {
    expect(plural(1, 'página', 'páginas')).toBe('1 página')
    expect(plural(320, 'página', 'páginas')).toBe('320 páginas')
  })
})

describe('autorConfiavel', () => {
  it('mantém autores de verdade e descarta os de enfeite', () => {
    expect(autorConfiavel(' Machado de Assis ')).toBe('Machado de Assis')
    expect(autorConfiavel('anonymous')).toBe('')
    expect(autorConfiavel(null)).toBe('')
  })
})
