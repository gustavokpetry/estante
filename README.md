# Estante

Biblioteca pessoal de PDFs: você adiciona os arquivos e lê cada um como se fosse um livro.

- Funciona inteiro no navegador. Os PDFs ficam guardados no próprio aparelho (IndexedDB) e nada é enviado para a internet.
- Pode ser instalado no celular e no computador (PWA) e funciona sem internet.
- Publicado no GitHub Pages: `https://gustavokpetry.github.io/estante/`

Versão atual: **1.2** (veja o [CHANGELOG](CHANGELOG.md)).

## O que já funciona

**Estante**
- Adicionar vários PDFs de uma vez (botão ou arrastar e soltar).
- Estante em grade com a primeira página de cada PDF como capa e barra de progresso.
- Atalho "Continuar lendo" para o último livro aberto.
- Título e autor lidos do PDF, com edição manual.
- Sem duplicatas: o mesmo arquivo nunca entra duas vezes.

**Leitor**
- Três modos: virada de página com dobra, livro simples (duas páginas) e página única.
- A capa aparece sozinha; depois as páginas seguem em pares.
- No celular em pé aparece uma página por vez; deitado, duas.
- Livros horizontais (páginas deitadas) abrem de três jeitos, à escolha por livro: encadernação no topo, uma página por vez ou duas lado a lado.
- Navegação por toque, arrasto do canto, deslize, setas do teclado, barra de posição, "ir para a página" e sumário do PDF.
- Zoom (pinça, Ctrl + roda do mouse, teclas + e -) e tela cheia.
- Cor das páginas: original, sépia ou noite.
- Abre sempre na página onde você parou.

**Geral**
- Tema dia, noite ou igual ao do aparelho.
- Medidor do espaço usado e pedido para o navegador manter os dados.

### Atalhos do leitor

| Tecla | Ação |
| --- | --- |
| → / Page Down / Espaço | Próxima página |
| ↓ / ↑ | Próxima / anterior, em livros com encadernação no topo |
| ← / Page Up / Shift + Espaço | Página anterior |
| Home / End | Primeira / última página |
| + / - / 0 | Aumentar / diminuir / tirar o zoom |

## Rodar no computador

Precisa do [Node.js](https://nodejs.org) 22 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (`http://localhost:5173/estante/`).

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Confere os tipos e gera o site em `dist/` |
| `npm run preview` | Serve o `dist/` localmente, como no GitHub Pages |
| `npm test` | Roda os testes |

## Publicar

A publicação é automática. A cada envio para a branch `main`, o GitHub Actions
(`.github/workflows/deploy.yml`) roda os testes, gera o site e publica no GitHub Pages.

Configuração única no repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Se o repositório mudar de nome, troque a constante `base` em `vite.config.ts` para `/novo-nome/`.

## Organização

```
src/
  lib/         regras e dados: banco local, leitura de PDF, importação, tema,
               paginação (folhas.ts), geometria da virada (dobra.ts), cache de páginas (paginas.ts)
  components/  telas e peças da interface (Leitor.tsx e Palco.tsx são o leitor)
  styles/      identidade visual (madeira, papel, temas dia e noite)
tests/         testes automatizados
scripts/       copia os arquivos auxiliares do PDF.js antes do build
public/        ícones do app
```

## Tecnologias

- **React + Vite + TypeScript**: base do app.
- **PDF.js** (`pdfjs-dist`): abre e desenha os PDFs.
- **Virada de página própria** (`src/lib/dobra.ts`): sem biblioteca externa. A StPageFlip foi avaliada e descartada (sem manutenção desde 2022, redesenha todas as páginas a cada quadro e não mostra páginas em canvas durante a virada).
- **Dexie**: camada simples sobre o IndexedDB.
- **vite-plugin-pwa**: instalação e funcionamento offline.
- **Alegreya e Alegreya Sans** (`@fontsource`): fontes hospedadas junto com o app.
