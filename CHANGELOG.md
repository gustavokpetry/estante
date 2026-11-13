# Histórico de versões

## 1.2 (12 de novembro de 2026)

Livros horizontais.

- Três jeitos de abrir um livro de páginas deitadas, escolhidos por livro:
  - **Encadernação no topo:** a página sobe e some atrás do bloco, como num calendário de mesa. Vale arrastar pelos cantos de baixo, tocar, deslizar para cima e para baixo ou usar as setas ↓ e ↑.
  - **Uma página por vez:** a página vira para o lado.
  - **Duas páginas lado a lado:** como um álbum aberto.
- No automático, o app usa duas páginas só em telas bem largas; nas demais, uma por vez. A escolha manual é sempre respeitada.
- A escolha fica em "Aparência", dentro do leitor, e também nos detalhes do livro.
- Nos detalhes do livro dá para marcar qualquer livro como vertical ou horizontal, caso a detecção automática erre.
- Em livros horizontais, a virada com dobra e a troca simples funcionam nos três jeitos de abrir.

## 1.1 (12 de novembro de 2026)

O leitor.

- Clicar na capa abre o livro. Os detalhes ficam no botão "⋯" ao lado do título.
- Três modos de leitura, trocáveis a qualquer momento: virada de página com dobra, livro simples e página única.
  O modo vale para todos os livros ou só para o livro aberto, à sua escolha.
- Virada com dobra feita sob medida: a folha acompanha o dedo ou o mouse a partir de qualquer canto, com sombra e brilho do papel.
- A capa aparece sozinha e as páginas seguintes em pares. No celular em pé, uma página por vez.
- Navegação: toque, arrasto, deslize, setas do teclado, barra de posição, campo "ir para a página" e sumário do PDF.
- Zoom até 400% (pinça, Ctrl + roda do mouse, teclas) com a página redesenhada em alta resolução, e tela cheia.
- Cor das páginas: original, sépia ou noite.
- O livro abre na página onde você parou; a estante mostra o progresso e o atalho "Continuar lendo".
- Livros grandes: só as páginas visíveis e as vizinhas ficam na memória.
- Um livro aberto pela primeira vez passa de "Quero ler" para "Lendo" (a tela de status chega na 1.4).

Limitação desta versão: livros horizontais abrem sempre em página única. Os modos próprios deles chegam na 1.2.

## 1.0 (12 de novembro de 2026)

Primeira versão: a base do app e a estante.

- Projeto em React + Vite + TypeScript, com publicação automática no GitHub Pages.
- App instalável (PWA) que funciona sem internet.
- Identidade visual: madeira, papel e latão, com temas dia e noite.
- Adicionar PDFs por botão ou arrastando para a janela, vários de uma vez.
- Capa gerada a partir da primeira página do PDF.
- Título e autor lidos dos metadados do PDF, com o nome do arquivo como reserva.
- Detecção automática de livros horizontais.
- Bloqueio de duplicatas pelo conteúdo do arquivo (SHA-256).
- Avisos claros para PDF protegido por senha, arquivo corrompido e armazenamento cheio.
- Detalhes do livro: editar título e autor, excluir com confirmação.
- Tela "Sobre": espaço usado, situação do armazenamento e como instalar no celular.

Ficou para depois: leitor (1.1), livros horizontais no leitor (1.2), capas personalizadas e
outros visuais da estante (1.3), coleções, tags, status e avaliação (1.4), marcadores e
anotações (1.5), busca no texto e estatísticas (1.6), backup (1.7).
