# [FIX] Modo apresentação ignora polígonos/desenho livre e quebra ao trocar de descritivo

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Fazer o [PresentationModal](../src/components/PresentationModal.tsx) destacar corretamente todos os tipos de anotação e lidar com mudanças de estado.
- **Problema e evidência:**
  - `drawPresentation` só trata `bbox` e `point`. Em slides de `polygon` e `freehand` aparece apenas a imagem escurecida, sem destaque.
  - `currentIndex` não é resetado ao abrir o modal nem ao trocar de descritivo. Se o descritivo anterior tinha 5 anotações e o atual tem 2, o modal abre em "5 de 2" sem slide.
  - O canvas só é redesenhado em mudança de índice. Redimensionar a janela ou alternar fullscreen deixa o canvas esticado/borrado. Também não usa `devicePixelRatio`, então fica borrado em telas Retina.
  - A imagem pode carregar depois do primeiro render (`drawPresentation` usa closure antiga de `currentAnn`).
  - O horário das mensagens usa `created_at.substring(11, 16)` ([PresentationModal.tsx:253](../src/components/PresentationModal.tsx:253)), ou seja, hora UTC e não local.
  - Anotações `hidden` aparecem na apresentação, e não há opção de pular as resolvidas.
  - O badge `A{n}` usa a posição do slide, que pode diferir do número mostrado na sidebar.
  - Não há modo tela cheia real (`requestFullscreen`), embora o i18n cite "Modo Apresentação (F5)".
- **Impacto de não fazer:** A demo para stakeholders, que é o propósito do modo, fica com slides vazios e numeração errada.
- **Para quem é destinado:** PO apresentando requisitos para o time ou clientes.
- **História de usuário:** Como PO, quero percorrer todas as anotações com destaque visual correto, para apresentar os requisitos sem precisar explicar falhas da ferramenta.
- **Como saberemos que deu certo:** Todos os 4 tipos de anotação têm destaque visível em apresentação, e o índice nunca passa do total.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Destacar `polygon` (clip + contorno) e `freehand` (traços realçados) como já é feito com `bbox` | P0 | CA01 |
| RF02 | Resetar `currentIndex` para 0 ao abrir e limitar ao intervalo válido quando a lista mudar | P0 | CA02 |
| RF03 | Redesenhar em `resize` e considerar `devicePixelRatio` | P1 | CA03 |
| RF04 | Mostrar data e hora local (`toLocaleString`) nas mensagens | P1 | CA04 |
| RF05 | Excluir anotações `hidden` e oferecer o toggle "Pular resolvidas" | P1 | CA05 |
| RF06 | O número do badge usa a mesma numeração da sidebar (ver [feat-numeracao-estavel-e-permalinks](2026-09-25_feat-numeracao-estavel-e-permalinks.md)) | P1 | CA06 |
| RF07 | Botão de tela cheia (`requestFullscreen`) | P2 | — |
| RF08 | Reaproveitar as funções de desenho de `canvasUtils.ts` em vez de duplicar a lógica | P1 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Trocar de slide redesenha em < 16 ms (60 fps) com imagem 1920×1080 | P2 | — |
| RNF02 | As setas do teclado continuam funcionando, e o foco fica preso no modal (já existe `useFocusTrap`) | P0 | CA02 |

### Dependências técnicas

- `src/components/PresentationModal.tsx`, `src/lib/canvasUtils.ts`.

### Recursos necessários

- N/A: sem dependências externas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um descritivo com um polígono e um traço livre, quando o usuário navegar até esses slides, então a região aparece nítida com contorno destacado e o restante da imagem escurecido.
- [ ] **CA02:** Dado que a apresentação estava no slide 5 do descritivo A, quando o usuário trocar para o descritivo B (2 anotações) e abrir a apresentação, então ela começa em "1 de 2".
- [ ] **CA03:** Dado a apresentação aberta, quando o usuário redimensionar a janela, então o slide é redesenhado proporcional e nítido.
- [ ] **CA04:** Dado uma mensagem criada às 09:12 no horário de Brasília, quando exibida na apresentação, então mostra 09:12 (e não 12:12).
- [ ] **CA05:** Dado 3 anotações, sendo uma oculta, quando a apresentação abrir, então mostra "1 de 2" e a oculta nunca aparece.
- [ ] **CA06:** Dado a anotação exibida como A3 na sidebar, quando ela aparecer na apresentação, então o badge mostra A3. (caso negativo: nunca um número diferente)

## O que a atividade não inclui

- Notas do apresentador / segundo monitor: motivo: baixo impacto.
- Exportar a apresentação como PDF/slides: motivo: outra iniciativa futura.

### Considerado para o futuro (P2)

- Exportar a apresentação como PDF.
- Transição animada de zoom até a região da anotação.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | "Pular resolvidas" deve vir ligado por padrão? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Destaque de polígono/freehand | manual | CA01 | Criar e apresentar | Região destacada |
| CT02 | Reset de índice | integração | CA02 | Renderizar com 5 anotações, avançar até a 5, rerender com 2 | Texto "1 de 2" |
| CT03 | Resize | manual | CA03 | Redimensionar a janela | Canvas nítido |
| CT04 | Hora local | unit | CA04 | Formatar `2026-08-14T12:12:00Z` em TZ America/Sao_Paulo | "09:12" |
| CT05 | Ocultas | integração | CA05 | 3 anotações com 1 `hidden` | "1 de 2" |
| CT06 | Numeração | integração | CA06 | Comparar o badge com a sidebar | Iguais |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/docs/Web/API/Window/devicePixelRatio
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: —
- Requisitos originais: README, "Modo apresentação (focar anotações para demo / fullscreen)".
- Issue / PR relacionado: —
