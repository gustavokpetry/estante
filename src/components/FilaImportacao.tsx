import { IconeAlerta, IconeCerto, IconeFechar } from './Icones'

export interface ItemFila {
  id: number
  nome: string
  estado: 'esperando' | 'lendo' | 'adicionado' | 'duplicado' | 'erro'
  mensagem?: string
}

const TEXTO: Record<ItemFila['estado'], string> = {
  esperando: 'Na fila',
  lendo: 'Guardando na estante…',
  adicionado: 'Adicionado',
  duplicado: 'Já está na estante.',
  erro: 'Não foi possível adicionar.',
}

interface Props {
  itens: ItemFila[]
  aoFechar: () => void
}

export function FilaImportacao({ itens, aoFechar }: Props) {
  if (itens.length === 0) return null
  const pendentes = itens.filter((i) => i.estado === 'esperando' || i.estado === 'lendo').length
  const prontos = itens.length - pendentes
  const titulo = pendentes > 0 ? `Adicionando ${prontos + 1} de ${itens.length}` : 'Pronto'

  return (
    <section className="fila" aria-label="Arquivos sendo adicionados">
      <header className="fila-topo">
        <h2 aria-live="polite">{titulo}</h2>
        {pendentes === 0 && (
          <button type="button" className="botao-icone botao-icone-pequeno" onClick={aoFechar} aria-label="Fechar lista">
            <IconeFechar />
          </button>
        )}
      </header>
      <ul className="fila-lista">
        {itens.map((item) => (
          <li key={item.id} className={`fila-item fila-${item.estado}`}>
            <span className="fila-marca">
              {item.estado === 'adicionado' && <IconeCerto />}
              {(item.estado === 'erro' || item.estado === 'duplicado') && <IconeAlerta />}
              {item.estado === 'lendo' && <span className="girando" />}
            </span>
            <span className="fila-texto">
              <span className="fila-nome">{item.nome}</span>
              <span className="fila-estado">{item.mensagem ?? TEXTO[item.estado]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
