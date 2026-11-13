import { useEffect, useRef, useState } from 'react'
import {
  corDaCapa,
  CORES_DE_CAPA,
  criarCapaDeImagem,
  criarCapaDoPdf,
  criarCapaGerada,
  desenharCapa,
  desenharRecorte,
  MODELOS,
  prepararFontes,
  type Enquadramento,
} from '../lib/capas'
import { db } from '../lib/db'
import type { Livro, ParametrosCapa, TipoCapa } from '../lib/types'
import { Dialogo } from './Dialogo'
import { useCapa, versaoDaCapa } from './useCapa'

const TIPOS: Array<{ valor: TipoCapa; nome: string }> = [
  { valor: 'pdf', nome: 'Primeira página' },
  { valor: 'image', nome: 'Imagem' },
  { valor: 'generated', nome: 'Criar capa' },
]

export function DialogoCapa({ livro, aoFechar }: { livro: Livro; aoFechar: () => void }) {
  const atual = useCapa(livro.id, versaoDaCapa(livro))
  const [tipo, setTipo] = useState<TipoCapa>(livro.tipoCapa)
  const [parametros, setParametros] = useState<ParametrosCapa>(
    livro.parametrosCapa ?? { titulo: livro.titulo, autor: livro.autor, cor: livro.corLombada ?? CORES_DE_CAPA[0], modelo: 'classico' },
  )
  const [imagem, setImagem] = useState<ImageBitmap | null>(null)
  const [enquadramento, setEnquadramento] = useState<Enquadramento>({ zoom: 1, x: 0.5, y: 0.5 })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const previa = useRef<HTMLCanvasElement>(null)

  // A capa segue o formato das páginas do livro.
  const proporcao = Math.min(2.2, Math.max(0.4, livro.proporcaoCapa || 0.7))
  const larguraPrevia = proporcao >= 1 ? 520 : Math.round(520 * proporcao)
  const alturaPrevia = proporcao >= 1 ? Math.round(520 / proporcao) : 520

  useEffect(() => {
    const canvas = previa.current
    if (!canvas) return
    if (tipo === 'generated') {
      let vivo = true
      desenharCapa(canvas, parametros)
      void prepararFontes().then(() => vivo && desenharCapa(canvas, parametros))
      return () => {
        vivo = false
      }
    }
    if (tipo === 'image' && imagem) desenharRecorte(canvas, imagem, enquadramento)
  }, [tipo, parametros, imagem, enquadramento])

  useEffect(() => () => imagem?.close(), [imagem])

  async function escolherImagem(arquivo: File | undefined) {
    if (!arquivo) return
    setErro(null)
    try {
      setImagem(await createImageBitmap(arquivo))
      setEnquadramento({ zoom: 1, x: 0.5, y: 0.5 })
    } catch {
      setErro('Não foi possível abrir essa imagem. Use um arquivo JPG, PNG ou WebP.')
    }
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      let blob: Blob
      let novaProporcao = livro.proporcaoCapa
      if (tipo === 'pdf') {
        const capa = await criarCapaDoPdf(livro.id)
        if (!capa) throw new Error('sem pdf')
        blob = capa.blob
        novaProporcao = capa.proporcao
      } else if (tipo === 'image') {
        if (!imagem) return
        blob = await criarCapaDeImagem(imagem, proporcao, enquadramento)
      } else {
        blob = await criarCapaGerada(parametros, proporcao)
      }
      const corLombada = tipo === 'generated' ? parametros.cor : await corDaCapa(blob)
      await db.transaction('rw', db.livros, db.capas, async () => {
        await db.capas.put({ livroId: livro.id, blob })
        await db.livros.update(livro.id, {
          tipoCapa: tipo,
          proporcaoCapa: novaProporcao,
          corLombada,
          // Os parâmetros ficam guardados mesmo trocando de tipo, para reeditar depois.
          parametrosCapa: tipo === 'generated' ? parametros : (livro.parametrosCapa ?? null),
        })
      })
      aoFechar()
    } catch {
      setErro('Não foi possível salvar a capa.')
    } finally {
      setSalvando(false)
    }
  }

  const podeSalvar = !salvando && (tipo !== 'image' || imagem !== null)

  return (
    <Dialogo titulo="Capa do livro" aoFechar={aoFechar} largo>
      <div className="editor-capa">
        <div className="segmentos" role="radiogroup" aria-label="Tipo de capa">
          {TIPOS.map((t) => (
            <label key={t.valor} className={`segmento${tipo === t.valor ? ' ativo' : ''}`}>
              <input type="radio" name="tipo-capa" checked={tipo === t.valor} onChange={() => setTipo(t.valor)} />
              {t.nome}
            </label>
          ))}
        </div>

        <div className="editor-capa-meio">
          <div className="editor-capa-previa" style={{ aspectRatio: String(proporcao) }}>
            {tipo === 'pdf' || (tipo === 'image' && !imagem) ? (
              atual && <img src={atual} alt="Capa atual" />
            ) : (
              <canvas ref={previa} width={larguraPrevia} height={alturaPrevia} aria-label="Prévia da capa" role="img" />
            )}
          </div>

          <div className="editor-capa-controles">
            {tipo === 'pdf' && <p>A capa será a primeira página do PDF, como quando o livro foi adicionado.</p>}

            {tipo === 'image' && (
              <>
                <label className="campo">
                  <span>Imagem (JPG, PNG ou WebP)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void escolherImagem(e.target.files?.[0])} />
                </label>
                {imagem && (
                  <>
                    <label className="campo">
                      <span>Aproximar</span>
                      <input type="range" min={1} max={3} step={0.01} value={enquadramento.zoom} onChange={(e) => setEnquadramento({ ...enquadramento, zoom: Number(e.target.value) })} />
                    </label>
                    <label className="campo">
                      <span>Posição horizontal</span>
                      <input type="range" min={0} max={1} step={0.01} value={enquadramento.x} onChange={(e) => setEnquadramento({ ...enquadramento, x: Number(e.target.value) })} />
                    </label>
                    <label className="campo">
                      <span>Posição vertical</span>
                      <input type="range" min={0} max={1} step={0.01} value={enquadramento.y} onChange={(e) => setEnquadramento({ ...enquadramento, y: Number(e.target.value) })} />
                    </label>
                  </>
                )}
              </>
            )}

            {tipo === 'generated' && (
              <>
                <label className="campo">
                  <span>Título na capa</span>
                  <input type="text" value={parametros.titulo} onChange={(e) => setParametros({ ...parametros, titulo: e.target.value })} />
                </label>
                <label className="campo">
                  <span>Autor na capa (opcional)</span>
                  <input type="text" value={parametros.autor} onChange={(e) => setParametros({ ...parametros, autor: e.target.value })} />
                </label>
                <fieldset className="opcoes">
                  <legend>Modelo</legend>
                  <div className="segmentos segmentos-4">
                    {MODELOS.map((m) => (
                      <label key={m.valor} className={`segmento${parametros.modelo === m.valor ? ' ativo' : ''}`}>
                        <input type="radio" name="modelo-capa" checked={parametros.modelo === m.valor} onChange={() => setParametros({ ...parametros, modelo: m.valor })} />
                        {m.nome}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="opcoes">
                  <legend>Cor de fundo</legend>
                  <div className="paleta">
                    {CORES_DE_CAPA.map((cor) => (
                      <label key={cor} className={`amostra${parametros.cor === cor ? ' ativa' : ''}`} style={{ background: cor }}>
                        <input type="radio" name="cor-capa" checked={parametros.cor === cor} onChange={() => setParametros({ ...parametros, cor })} aria-label={`Cor ${cor}`} />
                      </label>
                    ))}
                    <label className="amostra amostra-livre" title="Outra cor">
                      <input type="color" value={parametros.cor} onChange={(e) => setParametros({ ...parametros, cor: e.target.value })} aria-label="Outra cor" />
                    </label>
                  </div>
                </fieldset>
              </>
            )}

            {erro && (
              <p className="selo selo-alerta" role="alert">
                {erro}
              </p>
            )}
          </div>
        </div>

        <div className="detalhes-acoes editor-capa-acoes">
          <button type="button" className="botao botao-principal" onClick={() => void salvar()} disabled={!podeSalvar}>
            {salvando ? 'Salvando…' : 'Salvar capa'}
          </button>
          <button type="button" className="botao" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </div>
    </Dialogo>
  )
}
