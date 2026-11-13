import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Cabecalho } from './components/Cabecalho'
import { DialogoLivro } from './components/DialogoLivro'
import { DialogoSobre } from './components/DialogoSobre'
import { EstanteVazia } from './components/EstanteVazia'
import { FilaImportacao, type ItemFila } from './components/FilaImportacao'
import { GradeLivros } from './components/GradeLivros'
import { SoltarArquivos } from './components/SoltarArquivos'
import { pedirPersistencia } from './lib/armazenamento'
import { db } from './lib/db'
import { plural } from './lib/formato'
import { ehPdf, importarPdf } from './lib/importar'

let proximoIdFila = 1

export function App() {
  const livros = useLiveQuery(() => db.livros.orderBy('adicionadoEm').reverse().toArray(), [])
  const [fila, setFila] = useState<ItemFila[]>([])
  const [livroAbertoId, setLivroAbertoId] = useState<string | null>(null)
  const [sobreAberto, setSobreAberto] = useState(false)
  const seletorRef = useRef<HTMLInputElement>(null)
  const importando = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    void pedirPersistencia()
  }, [])

  const atualizarItem = useCallback((id: number, mudanca: Partial<ItemFila>) => {
    setFila((atual) => atual.map((item) => (item.id === id ? { ...item, ...mudanca } : item)))
  }, [])

  const adicionarArquivos = useCallback(
    (arquivos: File[]) => {
      if (arquivos.length === 0) return
      const itens: ItemFila[] = arquivos.map((arquivo) => ({
        id: proximoIdFila++,
        nome: arquivo.name,
        estado: ehPdf(arquivo) ? 'esperando' : 'erro',
        mensagem: ehPdf(arquivo) ? undefined : 'Não é um arquivo PDF.',
      }))
      setFila((atual) => [...atual, ...itens])

      // Um PDF por vez: importar vários ao mesmo tempo estoura a memória no celular.
      importando.current = importando.current.then(async () => {
        for (let i = 0; i < arquivos.length; i++) {
          const item = itens[i]
          if (item.estado === 'erro') continue
          atualizarItem(item.id, { estado: 'lendo' })
          const resultado = await importarPdf(arquivos[i])
          if (resultado.tipo === 'adicionado') {
            atualizarItem(item.id, { estado: 'adicionado', nome: resultado.livro.titulo })
          } else if (resultado.tipo === 'duplicado') {
            atualizarItem(item.id, { estado: 'duplicado', mensagem: 'Já está na estante.' })
          } else {
            atualizarItem(item.id, { estado: 'erro', mensagem: resultado.mensagem })
          }
        }
      })
    },
    [atualizarItem],
  )

  const escolherArquivos = useCallback(() => seletorRef.current?.click(), [])

  const livroAberto = livroAbertoId ? livros?.find((l) => l.id === livroAbertoId) : undefined
  const carregando = livros === undefined
  const vazia = !carregando && livros.length === 0

  return (
    <div className="app">
      <Cabecalho aoAdicionar={escolherArquivos} aoAbrirSobre={() => setSobreAberto(true)} />

      <input
        ref={seletorRef}
        className="so-leitor-de-tela"
        type="file"
        accept="application/pdf,.pdf"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          adicionarArquivos(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />

      <main className="parede">
        {carregando && <p className="aviso-carregando">Abrindo a estante…</p>}
        {vazia && <EstanteVazia aoAdicionar={escolherArquivos} />}
        {!carregando && !vazia && (
          <>
            <p className="contagem">{plural(livros.length, 'livro', 'livros')} na estante</p>
            <GradeLivros livros={livros} aoAbrir={setLivroAbertoId} />
          </>
        )}
      </main>

      <footer className="rodape">
        <button type="button" className="link-discreto" onClick={() => setSobreAberto(true)}>
          Estante {__APP_VERSION__}
        </button>
      </footer>

      <SoltarArquivos aoSoltar={adicionarArquivos} />
      <FilaImportacao itens={fila} aoFechar={() => setFila([])} />

      {livroAberto && <DialogoLivro livro={livroAberto} aoFechar={() => setLivroAbertoId(null)} />}
      {sobreAberto && <DialogoSobre aoFechar={() => setSobreAberto(false)} />}
    </div>
  )
}
