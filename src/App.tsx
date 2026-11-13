import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarraEstante } from './components/BarraEstante'
import { Cabecalho } from './components/Cabecalho'
import { ContinuarLendo } from './components/ContinuarLendo'
import { DialogoColecoes } from './components/DialogoColecoes'
import { DialogoLivro } from './components/DialogoLivro'
import { DialogoSobre } from './components/DialogoSobre'
import { EstanteVazia } from './components/EstanteVazia'
import { Estatisticas } from './components/Estatisticas'
import { FilaImportacao, type ItemFila } from './components/FilaImportacao'
import { GradeLivros } from './components/GradeLivros'
import { Leitor } from './components/Leitor'
import { Prateleiras } from './components/Prateleiras'
import { SoltarArquivos } from './components/SoltarArquivos'
import { pedirPersistencia } from './lib/armazenamento'
import { db } from './lib/db'
import { filtrarLivros, ordenarLivros, SEM_FILTROS, tagsEmUso, temFiltroAtivo, type Filtros } from './lib/filtros'
import { plural } from './lib/formato'
import { ehPdf, importarPdf } from './lib/importar'
import { indexarLivro, indexarPendentes, useIndexacao } from './lib/indexador'
import { abrirLivro, useRota } from './lib/rota'
import type { Ordenacao, VisualEstante } from './lib/types'

let proximoIdFila = 1

export function App() {
  const rota = useRota()
  const livros = useLiveQuery(() => db.livros.toArray(), [])
  const colecoes = useLiveQuery(() => db.colecoes.orderBy('nome').toArray(), []) ?? []
  const visual = useLiveQuery(() => db.configuracoes.get('visualEstante').then((c) => (c?.valor as VisualEstante | undefined) ?? 'grade'), []) ?? 'grade'
  const ordem = useLiveQuery(() => db.configuracoes.get('ordemEstante').then((c) => (c?.valor as Ordenacao | undefined) ?? 'recentes'), []) ?? 'recentes'
  const indexacao = useIndexacao()

  const [fila, setFila] = useState<ItemFila[]>([])
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS)
  const [livroAbertoId, setLivroAbertoId] = useState<string | null>(null)
  const [sobreAberto, setSobreAberto] = useState(false)
  const [colecoesAbertas, setColecoesAbertas] = useState(false)
  const seletorRef = useRef<HTMLInputElement>(null)
  const importando = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    void pedirPersistencia()
    // Livros adicionados antes da busca existir (ou vindos de backup) entram na fila aqui.
    void indexarPendentes()
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
            indexarLivro(resultado.livro.id)
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

  const visiveis = useMemo(() => (livros ? ordenarLivros(filtrarLivros(livros, filtros), ordem) : []), [livros, filtros, ordem])
  const tags = useMemo(() => (livros ? tagsEmUso(livros) : []), [livros])

  if (rota.tela === 'leitor') return <Leitor key={rota.livroId} livroId={rota.livroId} />
  if (rota.tela === 'estatisticas') return <Estatisticas />

  // O livro lido por último que ainda não terminou.
  const emLeitura = livros
    ?.filter((l) => l.ultimaLeitura !== null && l.status !== 'lido')
    .sort((a, b) => (b.ultimaLeitura ?? 0) - (a.ultimaLeitura ?? 0))[0]

  const livroAberto = livroAbertoId ? livros?.find((l) => l.id === livroAbertoId) : undefined
  const carregando = livros === undefined
  const vazia = !carregando && livros.length === 0
  const filtrando = temFiltroAtivo(filtros)

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
            {emLeitura && !filtrando && <ContinuarLendo livro={emLeitura} aoAbrir={abrirLivro} />}
            <BarraEstante
              filtros={filtros}
              aoFiltrar={setFiltros}
              ordem={ordem}
              visual={visual}
              colecoes={colecoes}
              tags={tags}
              aoGerenciarColecoes={() => setColecoesAbertas(true)}
            />
            <p className="contagem" role="status">
              {filtrando
                ? `${plural(visiveis.length, 'livro encontrado', 'livros encontrados')} de ${livros.length}`
                : `${plural(livros.length, 'livro', 'livros')} na estante`}
            </p>
            {visiveis.length === 0 && (
              <div className="sem-resultado">
                <p>Nenhum livro combina com a busca e os filtros.</p>
                <button type="button" className="botao" onClick={() => setFiltros(SEM_FILTROS)}>
                  Limpar filtros
                </button>
              </div>
            )}
            {visiveis.length > 0 && visual === 'grade' && <GradeLivros livros={visiveis} aoAbrir={abrirLivro} aoVerDetalhes={setLivroAbertoId} />}
            {visiveis.length > 0 && visual !== 'grade' && (
              <Prateleiras livros={visiveis} tipo={visual} aoAbrir={abrirLivro} aoVerDetalhes={setLivroAbertoId} />
            )}
          </>
        )}
      </main>

      <footer className="rodape">
        {indexacao.livroId && (
          <p className="indexando" role="status">
            Preparando a busca em “{indexacao.titulo}”: página {indexacao.feitas} de {indexacao.total}
            {indexacao.naFila > 0 ? ` (mais ${plural(indexacao.naFila, 'livro', 'livros')} na fila)` : ''}
          </p>
        )}
        <button type="button" className="link-discreto" onClick={() => setSobreAberto(true)}>
          Estante {__APP_VERSION__}
        </button>
      </footer>

      <SoltarArquivos aoSoltar={adicionarArquivos} />
      <FilaImportacao itens={fila} aoFechar={() => setFila([])} />

      {livroAberto && <DialogoLivro livro={livroAberto} aoFechar={() => setLivroAbertoId(null)} aoLer={abrirLivro} />}
      {sobreAberto && <DialogoSobre aoFechar={() => setSobreAberto(false)} />}
      {colecoesAbertas && <DialogoColecoes aoFechar={() => setColecoesAbertas(false)} />}
    </div>
  )
}
