/**
 * Geometria da virada de página "com dobra".
 *
 * Coordenadas do palco: a origem fica no alto da lombada, x cresce para a
 * direita e y para baixo. A folha que vira ocupa x de 0 a L (lado = 1, página
 * da direita) ou de -L a 0 (lado = -1, página da esquerda).
 *
 * A ideia: o canto da folha é levado até o ponto `p` (o dedo ou o mouse).
 * A dobra é a mediatriz entre o canto original e `p`. O pedaço da folha que
 * fica do lado do canto é "rebatido" sobre a dobra e mostra o verso.
 */

export interface Ponto {
  x: number
  y: number
}

export type Canto = 'topo' | 'base'
export type Lado = 1 | -1

export interface EntradaDobra {
  largura: number
  altura: number
  lado: Lado
  canto: Canto
  p: Ponto
}

export interface Dobra {
  /** true quando a folha está praticamente deitada (nada a dobrar). */
  plana: boolean
  /** Quanto da virada já aconteceu, de 0 a 1. */
  progresso: number
  /** Ponto do canto depois de respeitar os limites do papel. */
  p: Ponto
  /** Ponto médio e normal (apontando para o canto) da linha de dobra. */
  meio: Ponto
  normal: Ponto
  /** Parte ainda visível da frente da folha, em coordenadas da própria página. */
  recorteFrente: Ponto[]
  /** Parte dobrada, em coordenadas da página do verso. */
  recorteVerso: Ponto[]
  /** Região descoberta (onde aparece a página de baixo), em coordenadas da página. */
  recorteFundo: Ponto[]
  /** matrix(a, b, c, d, e, f) que leva a página do verso até o lugar dela no palco. */
  matrizVerso: [number, number, number, number, number, number]
}

const sub = (a: Ponto, b: Ponto): Ponto => ({ x: a.x - b.x, y: a.y - b.y })
const escalar = (a: Ponto, b: Ponto): number => a.x * b.x + a.y * b.y
const norma = (a: Ponto): number => Math.hypot(a.x, a.y)

/** Mantém `p` a no máximo `raio` de `centro` (o papel não estica). */
function prender(p: Ponto, centro: Ponto, raio: number): Ponto {
  const d = sub(p, centro)
  const n = norma(d)
  if (n <= raio) return p
  const k = raio / n
  return { x: centro.x + d.x * k, y: centro.y + d.y * k }
}

/** Recorta um polígono por um semiplano (Sutherland–Hodgman com uma reta só). */
export function recortar(poligono: Ponto[], meio: Ponto, normal: Ponto, sinal: 1 | -1): Ponto[] {
  const dentro = (q: Ponto) => sinal * escalar(sub(q, meio), normal) >= -1e-9
  const saida: Ponto[] = []
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i]
    const b = poligono[(i + 1) % poligono.length]
    const aDentro = dentro(a)
    const bDentro = dentro(b)
    if (aDentro) saida.push(a)
    if (aDentro !== bDentro) {
      const da = escalar(sub(a, meio), normal)
      const db = escalar(sub(b, meio), normal)
      const t = da / (da - db)
      saida.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  return saida
}

export function cantoDaFolha(largura: number, altura: number, lado: Lado, canto: Canto): Ponto {
  return { x: lado * largura, y: canto === 'base' ? altura : 0 }
}

/** Para onde o canto vai quando a virada termina: o canto espelhado na lombada. */
export function cantoOposto(largura: number, altura: number, lado: Lado, canto: Canto): Ponto {
  return { x: -lado * largura, y: canto === 'base' ? altura : 0 }
}

export function calcularDobra({ largura: L, altura: A, lado, canto, p: entrada }: EntradaDobra): Dobra {
  const c = cantoDaFolha(L, A, lado, canto)
  const lombadaPerto: Ponto = { x: 0, y: c.y }
  const lombadaLonge: Ponto = { x: 0, y: A - c.y }
  const diagonal = Math.hypot(L, A)

  // O canto não pode se afastar da lombada mais do que o tamanho do papel.
  let p = prender(entrada, lombadaPerto, L)
  p = prender(p, lombadaLonge, diagonal)
  p = prender(p, lombadaPerto, L)

  const esquerda = lado > 0 ? 0 : -L
  const retangulo: Ponto[] = [
    { x: esquerda, y: 0 },
    { x: esquerda + L, y: 0 },
    { x: esquerda + L, y: A },
    { x: esquerda, y: A },
  ]
  const paraPagina = (q: Ponto): Ponto => ({ x: q.x - esquerda, y: q.y })

  const afastamento = norma(sub(c, p))
  const progresso = Math.min(1, afastamento / (2 * L))

  if (afastamento < 0.5) {
    return {
      plana: true,
      progresso: 0,
      p,
      meio: c,
      normal: { x: lado, y: 0 },
      recorteFrente: retangulo.map(paraPagina),
      recorteVerso: [],
      recorteFundo: [],
      matrizVerso: [1, 0, 0, 1, 0, 0],
    }
  }

  const meio: Ponto = { x: (p.x + c.x) / 2, y: (p.y + c.y) / 2 }
  const normal: Ponto = { x: (c.x - p.x) / afastamento, y: (c.y - p.y) / afastamento }
  const refletir = (q: Ponto): Ponto => {
    const k = 2 * escalar(sub(q, meio), normal)
    return { x: q.x - k * normal.x, y: q.y - k * normal.y }
  }

  const ladoDoCanto = recortar(retangulo, meio, normal, 1)
  const ladoQueFica = recortar(retangulo, meio, normal, -1)

  // No verso, a borda da lombada troca de lado: u = x0 - x.
  const x0 = lado > 0 ? L : 0
  const origem = refletir({ x: x0, y: 0 })
  const ex = sub(refletir({ x: x0 - 1, y: 0 }), origem)
  const ey = sub(refletir({ x: x0, y: 1 }), origem)

  return {
    plana: false,
    progresso,
    p,
    meio,
    normal,
    recorteFrente: ladoQueFica.map(paraPagina),
    recorteFundo: ladoDoCanto.map(paraPagina),
    recorteVerso: ladoDoCanto.map((q) => ({ x: x0 - q.x, y: q.y })),
    matrizVerso: [ex.x, ex.y, ey.x, ey.y, origem.x, origem.y],
  }
}

/** Polígono → valor de `clip-path`. */
export function poligonoCss(pontos: Ponto[]): string {
  if (pontos.length < 3) return 'polygon(0 0, 0 0, 0 0)'
  return `polygon(${pontos.map((q) => `${q.x.toFixed(2)}px ${q.y.toFixed(2)}px`).join(', ')})`
}

/**
 * Degradê linear cujas paradas são dadas em pixels a partir de uma reta
 * (ponto + direção), dentro de uma caixa de `largura` x `altura`.
 */
export function degradeAPartirDaReta(
  largura: number,
  altura: number,
  ponto: Ponto,
  direcao: Ponto,
  paradas: Array<[cor: string, distanciaPx: number]>,
): string {
  const comprimento = Math.abs(largura * direcao.x) + Math.abs(altura * direcao.y) || 1
  const centro = { x: largura / 2, y: altura / 2 }
  const base = escalar(sub(ponto, centro), direcao) / comprimento + 0.5
  const angulo = (Math.atan2(direcao.x, -direcao.y) * 180) / Math.PI
  const partes = paradas.map(([cor, d]) => `${cor} ${((base + d / comprimento) * 100).toFixed(2)}%`)
  return `linear-gradient(${angulo.toFixed(2)}deg, ${partes.join(', ')})`
}
