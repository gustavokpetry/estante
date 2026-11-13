import { IconeMais } from './Icones'

export function EstanteVazia({ aoAdicionar }: { aoAdicionar: () => void }) {
  return (
    <section className="vazia">
      <svg className="vazia-desenho" viewBox="0 0 320 150" role="img" aria-label="Prateleira com poucos livros e um lugar vago">
        <g className="vazia-livros">
          <rect x="52" y="36" width="26" height="92" rx="2" className="lombada lombada-a" />
          <rect x="80" y="52" width="20" height="76" rx="2" className="lombada lombada-b" />
          <g transform="rotate(14 118 128)">
            <rect x="104" y="44" width="24" height="84" rx="2" className="lombada lombada-c" />
            <path d="M109 60h14M109 66h14" className="lombada-filete" />
          </g>
          <path d="M57 52h16M57 58h16M57 110h16" className="lombada-filete" />
          <path d="M84 66h12M84 114h12" className="lombada-filete" />
        </g>
        <rect x="150" y="40" width="118" height="88" rx="3" className="vaga" />
        <rect x="24" y="128" width="272" height="12" rx="2" className="prateleira" />
        <rect x="24" y="138" width="272" height="3" className="prateleira-sombra" />
      </svg>
      <h2 className="vazia-titulo">Adicione seus PDFs</h2>
      <button type="button" className="botao-redondo" onClick={aoAdicionar} aria-label="Adicionar PDFs" title="Adicionar PDFs">
        <IconeMais width={28} height={28} />
      </button>
    </section>
  )
}
