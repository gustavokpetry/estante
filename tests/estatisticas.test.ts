import { describe, expect, it } from 'vitest'
import { chaveDoDia, formatarDuracao, sequenciaDeDias, ultimosDias } from '../src/lib/estatisticas'

describe('estatísticas', () => {
  it('formata a data local', () => {
    expect(chaveDoDia(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('lista os últimos dias atravessando o mês', () => {
    expect(ultimosDias(4, '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
  })
  it('conta a sequência de dias lendo', () => {
    expect(sequenciaDeDias(['2026-03-01', '2026-03-02', '2026-03-03'], '2026-03-03')).toBe(3)
    // Hoje ainda sem leitura: vale a sequência até ontem.
    expect(sequenciaDeDias(['2026-03-01', '2026-03-02'], '2026-03-03')).toBe(2)
    // Um dia pulado zera.
    expect(sequenciaDeDias(['2026-03-01'], '2026-03-03')).toBe(0)
    expect(sequenciaDeDias([], '2026-03-03')).toBe(0)
  })
  it('formata durações', () => {
    expect(formatarDuracao(30)).toBe('30 s')
    expect(formatarDuracao(45 * 60)).toBe('45 min')
    expect(formatarDuracao(2 * 3600 + 15 * 60)).toBe('2 h 15 min')
    expect(formatarDuracao(3 * 3600)).toBe('3 h')
  })
})
