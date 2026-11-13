import { useEffect, useRef, useState } from 'react'
import { lerArmazenamento, type EstadoArmazenamento } from '../lib/armazenamento'
import { baixar, exportarBackup, importarBackup, nomeDoBackup, type ResumoImportacao } from '../lib/backup'
import { formatarBytes, plural } from '../lib/formato'
import { Dialogo } from './Dialogo'

function descreverImportacao(r: ResumoImportacao): string {
  const partes = [
    r.livrosNovos ? `${plural(r.livrosNovos, 'livro novo', 'livros novos')}` : '',
    r.livrosAtualizados ? `${plural(r.livrosAtualizados, 'livro atualizado', 'livros atualizados')}` : '',
    r.anotacoes ? `${plural(r.anotacoes, 'anotação', 'anotações')}` : '',
  ].filter(Boolean)
  const base = partes.length ? `Backup importado: ${partes.join(', ')}.` : 'Backup importado. Não havia nada novo.'
  return r.livrosSemPdf
    ? `${base} ${plural(r.livrosSemPdf, 'livro ficou de fora', 'livros ficaram de fora')} porque o backup não trazia o PDF.`
    : base
}

export function DialogoSobre({ aoFechar }: { aoFechar: () => void }) {
  const [estado, setEstado] = useState<EstadoArmazenamento | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null)
  const seletor = useRef<HTMLInputElement>(null)

  const medir = () => void lerArmazenamento().then(setEstado)
  useEffect(medir, [])

  const temMedida = estado?.usado != null && estado.disponivel != null && estado.disponivel > 0
  const fracao = temMedida ? Math.min(1, estado!.usado! / estado!.disponivel!) : 0

  async function exportar(comPdfs: boolean) {
    setMensagem(null)
    setOcupado('Preparando o backup…')
    try {
      const blob = await exportarBackup(comPdfs, (feitos, total) => setOcupado(`Preparando o backup: ${feitos} de ${total} livros`))
      baixar(blob, nomeDoBackup(comPdfs))
      setMensagem({ texto: `Backup pronto (${formatarBytes(blob.size)}). Guarde o arquivo num lugar seguro.`, erro: false })
    } catch {
      setMensagem({ texto: 'Não foi possível gerar o backup. Se a biblioteca for muito grande, tente pelo computador.', erro: true })
    } finally {
      setOcupado(null)
    }
  }

  async function importar(arquivo: File | undefined) {
    if (!arquivo) return
    setMensagem(null)
    setOcupado('Lendo o backup…')
    try {
      const resumo = await importarBackup(arquivo, (titulo) => setOcupado(`Guardando: ${titulo}`))
      setMensagem({ texto: descreverImportacao(resumo), erro: false })
      medir()
    } catch (e) {
      const motivo = e instanceof Error ? e.message : ''
      const texto =
        motivo === 'versao'
          ? 'Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.'
          : motivo === 'formato'
            ? 'Este arquivo não é um backup da Estante.'
            : 'Não foi possível importar o backup. O arquivo pode estar incompleto ou o armazenamento, cheio.'
      setMensagem({ texto, erro: true })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Dialogo titulo="Sobre a Estante" aoFechar={aoFechar}>
      <div className="sobre">
        <p>Sua biblioteca pessoal de PDFs, lidos como livros. Versão {__APP_VERSION__}.</p>

        <h3>Backup</h3>
        <p>
          Os livros e todos os seus dados ficam guardados só neste navegador, neste aparelho. Limpar os dados do site apaga
          tudo. Faça um backup de vez em quando, e use-o também para levar a biblioteca para outro aparelho.
        </p>
        <div className="backup-acoes">
          <button type="button" className="botao botao-principal" onClick={() => void exportar(true)} disabled={ocupado !== null}>
            Exportar tudo (.zip)
          </button>
          <button type="button" className="botao" onClick={() => void exportar(false)} disabled={ocupado !== null}>
            Exportar sem os PDFs
          </button>
          <button type="button" className="botao" onClick={() => seletor.current?.click()} disabled={ocupado !== null}>
            Importar backup
          </button>
          <input
            ref={seletor}
            className="so-leitor-de-tela"
            type="file"
            accept=".zip,application/zip"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void importar(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        <p className="medidor-legenda">
          “Sem os PDFs” leva só capas, progresso, anotações, coleções e estatísticas: serve para atualizar um aparelho que
          já tem os mesmos livros. Importar nunca apaga nem duplica nada.
        </p>
        {ocupado && (
          <p className="selo" role="status">
            {ocupado}
          </p>
        )}
        {mensagem && (
          <p className={`selo ${mensagem.erro ? 'selo-alerta' : 'selo-bom'}`} role={mensagem.erro ? 'alert' : 'status'}>
            {mensagem.texto}
          </p>
        )}

        <h3>Armazenamento</h3>
        {estado === null && <p>Medindo o espaço…</p>}
        {estado !== null && temMedida && (
          <>
            <div className="medidor" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fracao * 100)} aria-label="Espaço usado">
              <span style={{ width: `${Math.max(fracao * 100, 1)}%` }} />
            </div>
            <p className="medidor-legenda">
              {formatarBytes(estado.usado!)} usados de {formatarBytes(estado.disponivel!)} disponíveis neste navegador.
            </p>
          </>
        )}
        {estado !== null && !temMedida && <p>Este navegador não informa o espaço usado.</p>}
        {estado !== null && estado.persistente === true && <p className="selo selo-bom">O navegador vai manter a biblioteca guardada.</p>}
        {estado !== null && estado.persistente === false && (
          <p className="selo selo-alerta">
            O navegador ainda pode apagar a biblioteca se faltar espaço. Instalar o app na tela inicial costuma resolver.
          </p>
        )}

        <h3>Instalar no celular</h3>
        <p>
          No iPhone (Safari): toque em Compartilhar e depois em “Adicionar à Tela de Início”. No Android (Chrome): abra o
          menu e toque em “Instalar app”. Instalado, o app abre em tela cheia, funciona sem internet e o iPhone deixa de
          apagar os dados por falta de uso.
        </p>
      </div>
    </Dialogo>
  )
}
