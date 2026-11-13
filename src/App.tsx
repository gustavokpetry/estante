import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarraEstante } from './components/BarraEstante'
import { Cabecalho } from './components/Cabecalho'
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
import { useReordenar } from './components/useReordenar'
import { db, salvarConfiguracao } from './lib/db'
import { encaixarOrdem, filtrarLivros, moverNaLista, ordenarLivros, SEM_FILTROS, tagsEmUso, temFiltroAtivo, type Filtros } from './lib/filtros'
import { ehPdf, importarPdf } from './lib/importar'
import { indexarLivro, indexarPendentes, useIndexacao } from './lib/indexador'
import { abrirLivro, useRota } from './lib/rota'
import type { Ordenacao, VisualEstante } from './lib/types'

let proximoIdFila = 1

export function App() {
  const rota = useRota()
  const livros = useLiveQuery(() => db.livros.toArray(), [])
  const colecoes = useLiveQuery(() => db.colecoes.orderBy('nome').toArray(), []) ?? []
  const visual = useLiveQuery(() => db.configuracoes.get('visualEstante').then((c) => (c?.valor as VisualEstante | undefined) ?? 'madeira'), []) ?? 'madeira'
  const ordem = useLiveQuery(() => db.configuracoes.get('ordemEstante').then((c) => (c?.valor as Ordenacao | undefined) ?? 'manual'), []) ?? 'manual'
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
        mensagem: ehPdf(arquivo) ? undefined : 'Não é PDF',
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
            atualizarItem(item.id, { estado: 'duplicado', mensagem: 'Já está na estante' })
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

  // --- Arrumar a estante arrastando ---------------------------------------
  // Enquanto um livro é arrastado, a tela mostra uma ordem provisória; ao soltar, ela é gravada.
  const [arrasto, setArrasto] = useState<{ id: string; ordem: string[] } | null>(null)
  const arrastoRef = useRef(arrasto)
  arrastoRef.current = arrasto
  const situacao = useRef({ livros, visiveis, ordem })
  situacao.current = { livros, visiveis, ordem }

  const gravarOrdem = useCallback(async (visiveisNaNovaOrdem: string[]) => {
    const { livros: todos, ordem: ordemAtual } = situacao.current
    if (!todos) return
    const completa = encaixarOrdem(ordenarLivros(todos, ordemAtual).map((l) => l.id), visiveisNaNovaOrdem)
    await db.transaction('rw', db.livros, db.configuracoes, async () => {
      await Promise.all(completa.map((id, posicao) => db.livros.update(id, { ordem: posicao })))
      // Arrumar à mão passa a valer como a ordem da estante.
      await salvarConfiguracao('ordemEstante', 'manual')
    })
  }, [])

  const reordenar = useReordenar({
    aoComecar: (id) => setArrasto({ id, ordem: situacao.current.visiveis.map((l) => l.id) }),
    aoMover: (id, alvoId, depois) =>
      setArrasto((atual) => {
        if (!atual) return atual
        const nova = moverNaLista(atual.ordem, id, alvoId, depois)
        return nova === atual.ordem ? atual : { id, ordem: nova }
      }),
    aoSoltar: () => {
      const final = arrastoRef.current
      if (!final) return
      void gravarOrdem(final.ordem).finally(() => setArrasto(null))
    },
  })

  const moverPeloTeclado = useCallback(
    (id: string, direcao: 1 | -1) => {
      const ids = situacao.current.visiveis.map((l) => l.id)
      const i = ids.indexOf(id)
      const vizinho = ids[i + direcao]
      if (i < 0 || !vizinho) return
      void gravarOrdem(moverNaLista(ids, id, vizinho, direcao === 1))
    },
    [gravarOrdem],
  )

  const exibidos = useMemo(() => {
    if (!arrasto) return visiveis
    const porId = new Map(visiveis.map((l) => [l.id, l]))
    return arrasto.ordem.map((id) => porId.get(id)).filter((l) => l !== undefined)
  }, [arrasto, visiveis])

  if (rota.tela === 'leitor') return <Leitor key={rota.livroId} livroId={rota.livroId} />
  if (rota.tela === 'estatisticas') return <Estatisticas />

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
        {carregando && <p className="aviso-carregando">Abrindo…</p>}
        {vazia && <EstanteVazia aoAdicionar={escolherArquivos} />}
        {!carregando && !vazia && (
          <>
            <BarraEstante
              filtros={filtros}
              aoFiltrar={setFiltros}
              ordem={ordem}
              visual={visual}
              colecoes={colecoes}
              tags={tags}
              aoGerenciarColecoes={() => setColecoesAbertas(true)}
            />
            {filtrando && (
              <p className="contagem" role="status">
                {visiveis.length === 0 ? 'Nada encontrado' : `${visiveis.length} de ${livros.length}`}
              </p>
            )}
            {exibidos.length > 0 && visual === 'grade' && (
              <GradeLivros livros={exibidos} aoAbrir={abrirLivro} aoVerDetalhes={setLivroAbertoId} reordenar={reordenar} arrastandoId={arrasto?.id ?? null} aoMoverPeloTeclado={moverPeloTeclado} />
            )}
            {exibidos.length > 0 && visual !== 'grade' && (
              <Prateleiras livros={exibidos} tipo={visual} aoAbrir={abrirLivro} aoVerDetalhes={setLivroAbertoId} reordenar={reordenar} arrastandoId={arrasto?.id ?? null} aoMoverPeloTeclado={moverPeloTeclado} />
            )}
          </>
        )}
      </main>

      <footer className="rodape">
        {indexacao.livroId && (
          <p className="indexando" role="status">
            Preparando a busca: {indexacao.titulo} ({indexacao.feitas}/{indexacao.total})
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
