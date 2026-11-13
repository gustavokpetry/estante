// Copia os arquivos auxiliares do PDF.js (CMaps, fontes padrão, decodificadores
// WASM e perfis ICC) para public/pdfjs/. Sem eles, alguns PDFs aparecem com
// letras erradas ou imagens em branco. A pasta é gerada, por isso fica no .gitignore.
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = resolve(root, 'node_modules/pdfjs-dist')
const to = resolve(root, 'public/pdfjs')

rmSync(to, { recursive: true, force: true })
mkdirSync(to, { recursive: true })
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(resolve(from, dir), resolve(to, dir), { recursive: true })
}
console.log('PDF.js: arquivos auxiliares copiados para public/pdfjs/')
