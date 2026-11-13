import { useEffect, useState } from 'react'
import { lerArmazenamento, type EstadoArmazenamento } from '../lib/armazenamento'
import { formatarBytes } from '../lib/formato'
import { Dialogo } from './Dialogo'

export function DialogoSobre({ aoFechar }: { aoFechar: () => void }) {
  const [estado, setEstado] = useState<EstadoArmazenamento | null>(null)

  useEffect(() => {
    void lerArmazenamento().then(setEstado)
  }, [])

  const temMedida = estado?.usado != null && estado.disponivel != null && estado.disponivel > 0
  const fracao = temMedida ? Math.min(1, estado!.usado! / estado!.disponivel!) : 0

  return (
    <Dialogo titulo="Sobre a Estante" aoFechar={aoFechar}>
      <div className="sobre">
        <p>
          Sua biblioteca pessoal de PDFs, lidos como livros. Versão {__APP_VERSION__}.
        </p>

        <h3>Armazenamento</h3>
        {estado === null && <p>Medindo o espaço…</p>}
        {estado !== null && temMedida && (
          <>
            <div
              className="medidor"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fracao * 100)}
              aria-label="Espaço usado"
            >
              <span style={{ width: `${Math.max(fracao * 100, 1)}%` }} />
            </div>
            <p className="medidor-legenda">
              {formatarBytes(estado.usado!)} usados de {formatarBytes(estado.disponivel!)} disponíveis neste navegador.
            </p>
          </>
        )}
        {estado !== null && !temMedida && <p>Este navegador não informa o espaço usado.</p>}

        {estado !== null && estado.persistente === true && (
          <p className="selo selo-bom">O navegador vai manter a biblioteca guardada.</p>
        )}
        {estado !== null && estado.persistente === false && (
          <p className="selo selo-alerta">
            O navegador ainda pode apagar a biblioteca se faltar espaço. Instalar o app na tela inicial costuma resolver.
          </p>
        )}

        <h3>Onde ficam seus livros</h3>
        <p>
          Os PDFs e todos os seus dados ficam guardados só neste navegador, neste aparelho. Nada é enviado para a
          internet. Limpar os dados do site apaga a biblioteca, e cada aparelho tem a sua própria estante.
        </p>

        <h3>Instalar no celular</h3>
        <p>
          No iPhone (Safari): toque em Compartilhar e depois em “Adicionar à Tela de Início”. No Android (Chrome): abra
          o menu e toque em “Instalar app”. Instalado, o app abre em tela cheia, funciona sem internet e o iPhone deixa
          de apagar os dados por falta de uso.
        </p>
      </div>
    </Dialogo>
  )
}
