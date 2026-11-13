import type { SVGProps } from 'react'

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  )
}

type P = SVGProps<SVGSVGElement>

export const IconeMais = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)
export const IconeMenos = (p: P) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
)
export const IconeSol = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
)
export const IconeLua = (p: P) => (
  <Base {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Base>
)
export const IconeAuto = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4v16" />
    <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
  </Base>
)
export const IconeInfo = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </Base>
)
export const IconeFechar = (p: P) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
)
export const IconeCerto = (p: P) => (
  <Base {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
)
export const IconeAlerta = (p: P) => (
  <Base {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17v.5" />
  </Base>
)
export const IconeVoltar = (p: P) => (
  <Base {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
)
export const IconeAvancar = (p: P) => (
  <Base {...p}>
    <path d="M9 5l7 7-7 7" />
  </Base>
)
export const IconeSumario = (p: P) => (
  <Base {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Base>
)
export const IconeAparencia = (p: P) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Base>
)
export const IconeTelaCheia = (p: P) => (
  <Base {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Base>
)
export const IconeSairTelaCheia = (p: P) => (
  <Base {...p}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </Base>
)
export const IconeDetalhes = (p: P) => (
  <Base {...p}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" />
  </Base>
)
export const IconeBusca = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Base>
)
export const IconeFiltro = (p: P) => (
  <Base {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Base>
)
export const IconeGrade = (p: P) => (
  <Base {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </Base>
)
export const IconePrateleira = (p: P) => (
  <Base {...p}>
    <path d="M3 20h18M6 20V8h4v12M10 20V5h4v15M14 20v-9h4v9" />
  </Base>
)
export const IconeLombadas = (p: P) => (
  <Base {...p}>
    <path d="M3 20h18M5 20V5h2.5v15M9.5 20V7H12v13M14 20V4h2v16M18 20V8h1.5v12" />
  </Base>
)
export const IconeGrafico = (p: P) => (
  <Base {...p}>
    <path d="M4 20h16M7 20v-6M12 20V6M17 20v-9" />
  </Base>
)
export const IconeMarcador = (p: P & { cheio?: boolean }) => {
  const { cheio, ...resto } = p
  return (
    <Base {...resto} fill={cheio ? 'currentColor' : 'none'}>
      <path d="M7 4h10v16l-5-4-5 4z" />
    </Base>
  )
}
export const IconeCaneta = (p: P) => (
  <Base {...p}>
    <path d="M4 20l1-4L16 5l3 3L8 19z" />
    <path d="M14 7l3 3" />
  </Base>
)
export const IconeAnotacoes = (p: P) => (
  <Base {...p}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M9 10h7M9 14h7M9 18h4" />
  </Base>
)
export const IconeLixeira = (p: P) => (
  <Base {...p}>
    <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />
  </Base>
)
export const IconeLer = (p: P) => (
  <Base {...p}>
    <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
    <path d="M12 6.5V19.5" />
  </Base>
)
export const IconeExportar = (p: P) => (
  <Base {...p}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" />
  </Base>
)
export const IconeImportar = (p: P) => (
  <Base {...p}>
    <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19h14" />
  </Base>
)
export const IconePasta = (p: P) => (
  <Base {...p}>
    <path d="M3.5 7.5v10.5h17V8.5h-8l-2-2.5h-7z" />
  </Base>
)
