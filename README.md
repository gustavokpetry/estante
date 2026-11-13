# Estante

Biblioteca pessoal de PDFs: você adiciona os arquivos e lê cada um como se fosse um livro.

- Funciona inteiro no navegador. Os PDFs ficam guardados no próprio aparelho (IndexedDB) e nada é enviado para a internet.
- Pode ser instalado no celular e no computador (PWA) e funciona sem internet.
- Publicado no GitHub Pages: `https://gustavokpetry.github.io/estante/`

Versão atual: **1.0** (veja o [CHANGELOG](CHANGELOG.md)).

## O que já funciona

- Adicionar vários PDFs de uma vez (botão ou arrastar e soltar).
- Estante em grade com a primeira página de cada PDF como capa.
- Título e autor lidos do PDF, com edição manual.
- Detecção de livros horizontais (páginas deitadas).
- Sem duplicatas: o mesmo arquivo nunca entra duas vezes.
- Tema dia, noite ou igual ao do aparelho.
- Medidor do espaço usado e pedido para o navegador manter os dados.

O leitor em formato de livro chega na versão 1.1.

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
  lib/         regras e dados: banco local, leitura de PDF, importação, tema
  components/  telas e peças da interface
  styles/      identidade visual (madeira, papel, temas dia e noite)
tests/         testes automatizados
scripts/       copia os arquivos auxiliares do PDF.js antes do build
public/        ícones do app
```

## Tecnologias

- **React + Vite + TypeScript**: base do app.
- **PDF.js** (`pdfjs-dist`): abre e desenha os PDFs.
- **Dexie**: camada simples sobre o IndexedDB.
- **vite-plugin-pwa**: instalação e funcionamento offline.
- **Alegreya e Alegreya Sans** (`@fontsource`): fontes hospedadas junto com o app.
