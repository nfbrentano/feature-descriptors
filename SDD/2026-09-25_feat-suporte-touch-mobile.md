# [FEAT] Suporte a toque e layout responsivo (tablet/mobile)

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Tornar o canvas utilizável com toque (desenhar, selecionar, pan e pinch-zoom) e adaptar o layout de 3 colunas a telas estreitas.
- **Problema e evidência:**
  - O canvas escuta só eventos de mouse (`onMouseDown/Move/Up`, `onWheel` em [CanvasViewport.tsx](../src/components/CanvasViewport.tsx)). Num iPad ou celular não é possível desenhar, dar zoom nem mover a imagem, e o arraste rola a página.
  - O layout tem sidebar esquerda + canvas + thread à direita. Em telas < 768 px, o canvas fica espremido ou inexistente.
  - O README promete "Atalhos de teclado e suporte mobile-friendly (gestos para seleção/zoom)".
- **Impacto de não fazer:** PO em reuniões (tablet) e stakeholders que abrem um link no celular não conseguem revisar nem comentar.
- **Para quem é destinado:** PO/stakeholders revisando em tablet ou celular.
- **História de usuário:** Como PO, quero revisar e comentar as anotações no iPad durante a reunião, para não depender do notebook.
- **Como saberemos que deu certo:** Todas as ações principais (ver, selecionar, comentar, criar ponto/retângulo, zoom) funcionam num iPad e num celular de 375 px de largura.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Migrar os eventos do canvas para Pointer Events (`pointerdown/move/up/cancel`, `setPointerCapture`), unificando mouse, toque e caneta | P0 | CA01 |
| RF02 | Pinch com dois dedos = zoom centrado entre os dedos; arraste com dois dedos = pan | P0 | CA02 |
| RF03 | `touch-action: none` no canvas para não rolar a página durante o gesto | P0 | CA02 |
| RF04 | Toque longo (500 ms) em anotação = selecionar; duplo toque finaliza polígono | P1 | CA03 |
| RF05 | Layout < 768 px: sidebar e thread viram drawers/bottom-sheet sobre o canvas, com botões para abrir | P0 | CA04 |
| RF06 | Toolbar do canvas rolável/compacta em telas estreitas, com alvos de toque ≥ 44×44 px | P1 | CA05 |
| RF07 | Header compacto: ações secundárias num menu "⋯" em < 768 px | P1 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Alvos de toque ≥ 44×44 px (WCAG 2.5.5) | P1 | CA05 |
| RNF02 | Sem scroll horizontal da página em 375 px | P0 | CA04 |
| RNF03 | O comportamento com mouse no desktop não regride | P0 | CA06 |

### Dependências técnicas

- [fix-ferramentas-do-canvas](2026-09-25_fix-ferramentas-do-canvas.md) (listeners globais e wheel não passivo) deve vir antes.
- `src/index.css` (media queries), `App.tsx` (estado dos drawers).

### Recursos necessários

- Dispositivos reais para teste: iPad (Safari) e Android (Chrome).
- Mockup mobile do layout com drawers (design).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um iPad com a ferramenta retângulo, quando o usuário arrastar o dedo sobre a imagem, então um bbox é criado.
- [ ] **CA02:** Dado a imagem no canvas, quando o usuário fizer pinch, então o zoom muda centrado entre os dedos e a página não rola.
- [ ] **CA03:** Dado uma anotação no canvas, quando o usuário fizer toque longo sobre ela, então ela é selecionada e a thread abre.
- [ ] **CA04:** Dado um celular de 375 px, quando o app abrir, então o canvas ocupa a largura toda, sidebar e thread abrem como painéis sobrepostos e não há scroll horizontal.
- [ ] **CA05:** Dado a toolbar no celular, quando medidos os botões, então todos têm ao menos 44×44 px.
- [ ] **CA06:** Dado o desktop com mouse, quando o usuário usar todas as ferramentas, então o comportamento é igual ao anterior. (caso negativo: sem regressão)

## O que a atividade não inclui

- App nativo/PWA instalável: motivo: prematuro.
- Pressão da caneta (Apple Pencil) no desenho livre: motivo: baixo impacto.

### Considerado para o futuro (P2)

- PWA com uso offline.
- Espessura variável por pressão da caneta.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | No celular, a criação de anotações deve ser suportada ou só visualizar e comentar? | PO | Sim | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Desenho por toque | manual (iPad) | CA01 | Arrastar com retângulo | Bbox criado |
| CT02 | Pinch | manual | CA02 | Pinch in/out | Zoom sem scroll da página |
| CT03 | Toque longo | manual | CA03 | Segurar 500 ms | Seleção |
| CT04 | Layout 375 px | e2e (viewport) | CA04 | Playwright 375×812 | `scrollWidth <= innerWidth` |
| CT05 | Alvos | e2e | CA05 | Medir `getBoundingClientRect` dos botões | ≥ 44 |
| CT06 | Regressão desktop | e2e | CA06 | Suíte das ferramentas com mouse | Passa |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/docs/Web/API/Pointer_events · https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- Protótipo / mockup: — (a produzir)
- Discussões relacionadas: —
- Referências de design: Excalidraw mobile.
- Requisitos originais: README, "Atalhos de teclado e suporte mobile-friendly (gestos para seleção/zoom)".
- Issue / PR relacionado: —
