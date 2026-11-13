# Estante

Biblioteca pessoal de PDFs: você adiciona os arquivos e lê cada um como se fosse um livro.

- Funciona inteiro no navegador. Os PDFs ficam guardados no próprio aparelho (IndexedDB) e nada é enviado para a internet.
- Pode ser instalado no celular e no computador (PWA) e funciona sem internet.
- Publicado no GitHub Pages: `https://gustavokpetry.github.io/estante/`

Versão atual: **1.7** (veja o [CHANGELOG](CHANGELOG.md)).

## O que o app faz

**Estante**
- Adicionar vários PDFs de uma vez (botão ou arrastar e soltar), sem duplicatas.
- Três visuais: grade de capas, estante de madeira e lombadas (o livro gira e mostra a capa).
- Capa de cada livro: primeira página do PDF, uma imagem sua ou uma capa criada no app (4 modelos, cor à escolha).
- Coleções, tags, status de leitura (quero ler, lendo, lido) e avaliação de meia em meia estrela.
- Busca por título ou autor, filtros e ordenação.
- Atalho "Continuar lendo" e barra de progresso em cada livro.

**Leitor**
- Três modos: virada de página com dobra, livro simples (duas páginas) e página única.
- Livros horizontais: encadernação no topo, uma página por vez ou duas lado a lado.
- Navegação por toque, arrasto do canto, deslize, teclado, barra de posição, "ir para a página" e sumário do PDF.
- Zoom (pinça, Ctrl + roda do mouse, teclas) e tela cheia. Cor das páginas: original, sépia ou noite.
- Marcadores, notas por página e destaques de texto em 4 cores, com nota opcional.
- Busca no texto do livro, ignorando acentos e maiúsculas.
- Abre sempre na página onde você parou.

**Geral**
- Estatísticas: tempo de leitura, páginas lidas, sequência de dias, tempo por livro e avaliações.
- Backup completo em .zip (ou só os dados, sem os PDFs) e importação que mescla sem duplicar.
- Tema dia, noite ou igual ao do aparelho.

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
  lib/         regras e dados, sem interface:
                 db.ts            banco local (IndexedDB)       importar.ts   entrada de PDFs
                 pdf.ts           abrir PDF e gerar capa        capas.ts      capas criadas e recortadas
                 folhas.ts        paginação                     dobra.ts      geometria da virada
                 paginas.ts       cache de páginas desenhadas   filtros.ts    busca, filtros e ordenação
                 indexador.ts     texto dos PDFs para a busca   texto.ts      normalização e trechos
                 estatisticas.ts  tempo e dias de leitura       backup.ts     exportar e importar
  components/  telas e peças da interface
                 App.tsx (em src/) é a estante; Leitor.tsx e Palco.tsx são o leitor
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
- **fflate**: leitura e escrita do .zip de backup.
- **Alegreya e Alegreya Sans** (`@fontsource`): fontes hospedadas junto com o app.

## Formato do backup

Um `.zip` com:

- `library.json`: livros, coleções, marcadores, notas, destaques, registro de leitura e configurações.
- `capas/<id>.jpg`: a capa de cada livro.
- `pdfs/<id>.pdf`: os arquivos (ausentes no backup "sem os PDFs").

O `id` é o SHA-256 do PDF, o que permite reconhecer o mesmo livro em outro aparelho. O texto usado
na busca não vai no backup; ele é refeito depois da importação.
