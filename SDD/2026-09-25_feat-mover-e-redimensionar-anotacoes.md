# [FEAT] Mover e redimensionar anotações no canvas

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir ajustar a posição e o tamanho de anotações já criadas, direto no canvas.
- **Problema e evidência:** A ferramenta se chama "Selecionar / Mover Elemento (V)" ([i18n.ts](../src/lib/i18n.ts)), mas só seleciona ([CanvasViewport.tsx:325](../src/components/CanvasViewport.tsx:325)). Para corrigir um retângulo desenhado alguns pixels fora, é preciso excluir e desenhar de novo, perdendo a thread, as tags e a estimativa.
- **Impacto de não fazer:** Retrabalho e perda de discussões sempre que a marcação precisa de ajuste fino, que é o caso mais comum.
- **Para quem é destinado:** PO/designer que marca regiões.
- **História de usuário:** Como PO, quero arrastar e redimensionar uma marcação existente, para corrigir a região sem perder a discussão associada.
- **Como saberemos que deu certo:** Ajustar um bbox leva 1 arraste (antes: excluir + redesenhar + recriar metadados).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Com a ferramenta Selecionar, arrastar uma anotação selecionada move a anotação (todos os tipos) | P0 | CA01 |
| RF02 | O bbox selecionado mostra 8 alças de redimensionamento, com cursores adequados | P0 | CA02 |
| RF03 | As coordenadas ficam presas aos limites da imagem (0..1) | P0 | CA03 |
| RF04 | Mover/redimensionar gera uma única entrada de undo por gesto (no `mouseup`) | P0 | CA04 |
| RF05 | Setas movem a anotação selecionada 1 px (Shift: 10 px) | P1 | CA05 |
| RF06 | Arrastar vértices de polígono | P1 | CA06 |
| RF07 | Anotações `resolved` podem ser movidas; anotações `hidden` não | P1 | CA07 |
| RF08 | Shift durante o redimensionamento mantém a proporção | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O arraste renderiza a ≥ 50 fps com 100 anotações | P1 | — |
| RNF02 | Sync remoto só ao soltar, não durante o arraste | P0 | CA04 |

### Dependências técnicas

- Hit-test completo de [fix-ferramentas-do-canvas](2026-09-25_fix-ferramentas-do-canvas.md) (RF02).
- Agrupamento de undo de [fix-desfazer-refazer-persistencia](2026-09-25_fix-desfazer-refazer-persistencia.md).

### Recursos necessários

- Definição visual das alças (tamanho/cor) com design.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um ponto selecionado, quando o usuário arrastá-lo 50 px à direita, então as coordenadas são atualizadas e a thread continua a mesma.
- [ ] **CA02:** Dado um bbox selecionado, quando o usuário arrastar a alça inferior direita, então largura e altura mudam e o canto superior esquerdo fica fixo.
- [ ] **CA03:** Dado um bbox perto da borda, quando o usuário arrastar para fora da imagem, então ele para na borda.
- [ ] **CA04:** Dado um bbox movido em um gesto, quando o usuário apertar Ctrl+Z uma vez, então ele volta à posição original.
- [ ] **CA05:** Dado uma anotação selecionada e o foco no canvas, quando o usuário apertar Shift+→, então ela se move 10 px da imagem.
- [ ] **CA06:** Dado um polígono selecionado, quando o usuário arrastar um vértice, então só aquele vértice muda.
- [ ] **CA07:** Dado uma anotação oculta, quando o usuário arrastar sobre a área dela, então nada se move. (caso negativo)

## O que a atividade não inclui

- Rotação de anotações: motivo: baixo impacto para telas de UI.
- Seleção múltipla / mover em grupo: motivo: fica como P2.
- Edição de traços livres: motivo: complexo demais agora.

### Considerado para o futuro (P2)

- Seleção múltipla (Shift+clique / laço) e alinhamento/distribuição.
- Snap à grade e a bordas de outras anotações.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Arrastar uma anotação não selecionada deve selecionar e mover no mesmo gesto? | design | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Mover ponto | integração | CA01 | mousedown/move/up | `onUpdateAnnotation` com as coords novas |
| CT02 | Redimensionar | unit | CA02 | `resizeBBox(b, 'se', dx, dy)` | x/y fixos, w/h alterados |
| CT03 | Clamp | unit | CA03 | Mover além de 1 | Coords ≤ 1 |
| CT04 | Undo único | integração | CA04 | Gesto com 20 moves e undo | Posição original |
| CT05 | Setas | integração | CA05 | `keydown ArrowRight + shift` | +10 px |
| CT06 | Vértice | unit | CA06 | `moveVertex(poly, 2, dx, dy)` | Só o índice 2 muda |
| CT07 | Oculta | integração | CA07 | Arrastar sobre oculta | Nenhum update |

## URL Complementar

- Documentação técnica: —
- Protótipo / mockup: —
- Discussões relacionadas: —
- Referências de design: alças de transformação do Figma/Excalidraw.
- Requisitos originais: `canvas.tools.select` em [i18n.ts](../src/lib/i18n.ts).
- Issue / PR relacionado: —
