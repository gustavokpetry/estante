# Histórico de versões

## 1.8 (13 de novembro de 2026)

- **Menos texto:** explicações longas saíram e o que ficou foi resumido, na estante, no leitor e nas janelas.
- **Ícones no lugar de botões com texto:** adicionar, ler, detalhes, filtros, trocar capa, excluir, salvar nota e outros.
  Todo ícone tem dica ao passar o mouse e nome para leitores de tela.
- **Estante de madeira como visual padrão.** Quem já tinha escolhido outro visual continua com ele.
- **Três livros por fileira no celular:** o tamanho dos livros passou a sair da largura da tela. Em telas largas cabem mais.
  Livros horizontais ocupam mais espaço, então a fileira deles leva menos.
- **Arrumar a estante arrastando**, nos três visuais. Com o mouse, é só arrastar. No toque, segure o livro um instante
  e arraste. No teclado, Alt + seta para a esquerda ou direita. A ordem fica guardada como "Minha ordem", que virou a
  ordenação padrão; livros novos entram no começo.
- O cartão "Você parou aqui" saiu da estante. O progresso continua na barra de cada livro.

## 1.7 (12 de novembro de 2026)

Esta entrega reúne as etapas 1.3 a 1.7 do plano.

**Capas e visuais da estante (etapa 1.3)**
- Capa de cada livro à escolha: primeira página do PDF, uma imagem (com zoom e posição) ou uma capa criada no app.
- Capa criada: título, autor, cor de fundo e 4 modelos (clássico, minimalista, faixa, geométrico). Dá para reeditar depois.
- Dois visuais novos além da grade: estante de madeira e lombadas. Na lombada, a espessura acompanha o número de
  páginas e a cor vem da capa; ao passar o mouse ou tocar, o livro gira e mostra a capa. No toque, o segundo toque abre.

**Organização (etapa 1.4)**
- Coleções (um livro pode estar em várias) e tags livres com sugestão das já usadas.
- Status de leitura: quero ler, lendo, lido. Ao chegar à última página, o app pergunta se quer marcar como lido.
- Avaliação de meia em meia estrela.
- Busca por título ou autor, filtros por coleção, tag, status e avaliação, e cinco ordenações.

**Anotações (etapa 1.5)**
- Marcadores de página com nome, e uma fita no canto da página marcada.
- Notas de texto por página.
- Destaques em 4 cores com nota opcional. Para destacar, ligue o modo anotação (ícone de caneta): as páginas param
  de virar com o toque e o texto fica selecionável. Os destaques aparecem em todos os modos de leitura.
- Painel de anotações com tudo do livro e salto até cada item.

**Busca no texto e estatísticas (etapa 1.6)**
- Busca dentro do livro, ignorando acentos e maiúsculas, com trecho, número da página e realce do termo.
- O texto é preparado em segundo plano depois que o livro entra na estante; o rodapé mostra o andamento.
- PDFs só de imagem são detectados e avisam que não têm busca.
- Tela de estatísticas: tempo total, páginas lidas, dias seguidos, gráfico dos últimos 30 dias, tempo por livro
  e distribuição das avaliações. O tempo só conta com o livro aberto, a aba à vista e atividade recente.

**Backup (etapa 1.7)**
- Exportar tudo em um .zip, ou só os dados e as capas, sem os PDFs.
- Importar mescla com a biblioteca atual: nada é apagado e nenhum livro duplica.
- O backup fica em "Sobre" (ícone de informação no topo).

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
