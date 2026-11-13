import { useEffect, useRef, useState } from 'react'
import { lerArmazenamento, type EstadoArmazenamento } from '../lib/armazenamento'
import { baixar, exportarBackup, importarBackup, nomeDoBackup, type ResumoImportacao } from '../lib/backup'
import { formatarBytes, plural } from '../lib/formato'
import { Dialogo } from './Dialogo'
import { IconeExportar, IconeImportar } from './Icones'

function descreverImportacao(r: ResumoImportacao): string {
  const partes = [
    r.livrosNovos ? plural(r.livrosNovos, 'livro novo', 'livros novos') : '',
    r.livrosAtualizados ? plural(r.livrosAtualizados, 'atualizado', 'atualizados') : '',
    r.anotacoes ? plural(r.anotacoes, 'anotação', 'anotações') : '',
    r.livrosSemPdf ? `${r.livrosSemPdf} sem PDF (de fora)` : '',
  ].filter(Boolean)
  return partes.length ? `Importado: ${partes.join(', ')}.` : 'Importado. Nada novo.'
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
    setOcupado('Preparando…')
    try {
      const blob = await exportarBackup(comPdfs, (feitos, total) => setOcupado(`Preparando ${feitos}/${total}`))
      baixar(blob, nomeDoBackup(comPdfs))
      setMensagem({ texto: `Backup pronto (${formatarBytes(blob.size)}).`, erro: false })
    } catch {
      setMensagem({ texto: 'Não deu para gerar o backup. Tente pelo computador.', erro: true })
    } finally {
      setOcupado(null)
    }
  }

  async function importar(arquivo: File | undefined) {
    if (!arquivo) return
    setMensagem(null)
    setOcupado('Lendo…')
    try {
      const resumo = await importarBackup(arquivo, (titulo) => setOcupado(titulo))
      setMensagem({ texto: descreverImportacao(resumo), erro: false })
      medir()
    } catch (e) {
      const motivo = e instanceof Error ? e.message : ''
      const texto =
        motivo === 'versao'
          ? 'Backup de uma versão mais nova. Atualize o app.'
          : motivo === 'formato'
            ? 'Este arquivo não é um backup da Estante.'
            : 'Não deu para importar: arquivo incompleto ou sem espaço.'
      setMensagem({ texto, erro: true })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Dialogo titulo={`Estante ${__APP_VERSION__}`} aoFechar={aoFechar}>
      <div className="sobre">
        <h3>Backup</h3>
        <p>Tudo fica só neste navegador. Guarde uma cópia.</p>
        <div className="backup-acoes">
          <button type="button" className="botao botao-principal" onClick={() => void exportar(true)} disabled={ocupado !== null}>
            <IconeExportar />
            Tudo
          </button>
          <button type="button" className="botao" onClick={() => void exportar(false)} disabled={ocupado !== null} title="Capas, progresso e anotações, sem os PDFs">
            <IconeExportar />
            Sem PDFs
          </button>
          <button type="button" className="botao" onClick={() => seletor.current?.click()} disabled={ocupado !== null}>
            <IconeImportar />
            Importar
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

        <h3>Espaço</h3>
        {estado !== null && temMedida && (
          <>
            <div className="medidor" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fracao * 100)} aria-label="Espaço usado">
              <span style={{ width: `${Math.max(fracao * 100, 1)}%` }} />
            </div>
            <p className="medidor-legenda">
              {formatarBytes(estado.usado!)} de {formatarBytes(estado.disponivel!)}
            </p>
          </>
        )}
        {estado !== null && !temMedida && <p className="medidor-legenda">O navegador não informa.</p>}
        {estado !== null && estado.persistente === false && <p className="selo selo-alerta">O navegador pode apagar os dados. Instale o app para evitar.</p>}

        <h3>Instalar</h3>
        <p>iPhone: Compartilhar, depois “Adicionar à Tela de Início”. Android: menu, depois “Instalar app”.</p>
      </div>
    </Dialogo>
  )
}
