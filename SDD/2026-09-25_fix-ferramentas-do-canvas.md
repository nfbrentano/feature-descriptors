# [FIX] Ferramentas do canvas: polígono duplicado, seleção incompleta e estados presos

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Corrigir os comportamentos incorretos das ferramentas de desenho e seleção em [CanvasViewport.tsx](../src/components/CanvasViewport.tsx).
- **Problema e evidência:**
  1. **Polígono com vértices duplicados:** o duplo clique que fecha o polígono dispara dois `mousedown` antes do `dblclick`, e cada um adiciona um ponto ([CanvasViewport.tsx:365](../src/components/CanvasViewport.tsx:365)). Todo polígono termina com 2 vértices extras repetidos.
  2. **Polígono e desenho livre não selecionáveis:** o hit-test da ferramenta Selecionar só trata `bbox` e `point` ([CanvasViewport.tsx:325](../src/components/CanvasViewport.tsx:325)). Clicar num polígono ou traço livre não abre a thread.
  3. **Estado preso ao sair do canvas:** não há `onMouseLeave` nem listener de `mouseup` em `window`. Se o usuário soltar o botão fora do canvas durante um bbox ou pan, o desenho/pan continua "grudado" no cursor.
  4. **Sem cancelamento:** não existe Esc para descartar polígono ou traço em andamento, e o traço livre só é salvo com duplo clique (nada indica isso na tela).
  5. **Scroll da página no zoom:** `onWheel` do React é passivo, então o `e.preventDefault()` ([CanvasViewport.tsx:439](../src/components/CanvasViewport.tsx:439)) é ignorado com warning no console.
  6. **Atalho `0` com closure antiga:** `handleFitZoom` é chamado dentro do `useEffect` de teclado sem estar nas dependências ([CanvasViewport.tsx:303](../src/components/CanvasViewport.tsx:303)), então usa `imageDimensions` desatualizado depois de trocar a imagem.
  7. **Cursor:** a ferramenta `freehand` usa o cursor `default` em vez de `crosshair`.
  8. **Selecionar anotação oculta:** o hit-test considera anotações com `hidden: true`, que não aparecem na tela.
- **Impacto de não fazer:** Dados de coordenadas incorretos no export (polígonos), anotações inacessíveis pelo canvas e sensação de ferramenta quebrada.
- **Para quem é destinado:** PO/designer que marca regiões nas telas.
- **História de usuário:** Como PO, quero desenhar e selecionar qualquer tipo de anotação de forma previsível, para marcar a tela sem retrabalho.
- **Como saberemos que deu certo:** Um polígono de 4 cliques + duplo clique é salvo com exatamente 4 vértices, e todos os 4 tipos de anotação podem ser selecionados clicando neles.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Ignorar o `mousedown` com `e.detail >= 2` na ferramenta polígono (ou deduplicar pontos a menos de 3 px) | P0 | CA01 |
| RF02 | Hit-test de polígono (point-in-polygon, ray casting) e de desenho livre (distância ao segmento ≤ 8 px na tela) | P0 | CA02 |
| RF03 | Ignorar anotações `hidden` no hit-test | P0 | CA03 |
| RF04 | Encerrar desenho/pan em `mouseup` global e em `mouseleave` | P0 | CA04 |
| RF05 | Esc cancela polígono ou traço em andamento; Enter finaliza polígono (≥ 3 pontos) ou desenho livre (≥ 1 traço) | P1 | CA05 |
| RF06 | Registrar o listener de `wheel` via `addEventListener(..., { passive: false })` | P1 | CA06 |
| RF07 | Corrigir as dependências do efeito de teclado (atalho `0` usa as dimensões atuais) | P1 | CA07 |
| RF08 | Mostrar dica contextual ("Duplo clique ou Enter para concluir · Esc para cancelar") enquanto houver polígono ou traço em andamento | P1 | CA05 |
| RF09 | Cursor `crosshair` também para `freehand` | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | 0 warnings de "passive event listener" no console | P1 | CA06 |
| RNF02 | O hit-test com 200 anotações roda em < 5 ms por clique | P2 | — |

### Dependências técnicas

- `src/components/CanvasViewport.tsx`, `src/lib/canvasUtils.ts` (colocar as funções de hit-test aqui para testar em unit).

### Recursos necessários

- N/A: sem dependências externas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado a ferramenta polígono ativa, quando o usuário clicar em 4 pontos distintos e der duplo clique no último, então a anotação é salva com exatamente 4 vértices.
- [ ] **CA02:** Dado um polígono e um traço livre existentes, quando o usuário clicar dentro do polígono / sobre o traço com a ferramenta Selecionar, então a anotação correspondente é selecionada e a thread abre.
- [ ] **CA03:** Dado uma anotação oculta, quando o usuário clicar na área dela, então ela não é selecionada. (caso negativo)
- [ ] **CA04:** Dado um bbox em desenho, quando o usuário arrastar para fora do canvas e soltar o botão, então o desenho termina (criado se tiver tamanho mínimo, descartado se não) e mover o mouse de volta não altera nada.
- [ ] **CA05:** Dado um polígono com 2 pontos em andamento, quando o usuário apertar Esc, então os pontos somem e nenhuma anotação é criada; com 3+ pontos, Enter cria a anotação.
- [ ] **CA06:** Dado o canvas com imagem, quando o usuário usar a roda do mouse sobre ele, então só o zoom muda, a página não rola e não há warning no console.
- [ ] **CA07:** Dado que o usuário trocou a imagem por outra de dimensões diferentes, quando apertar `0`, então a nova imagem é enquadrada corretamente.

## O que a atividade não inclui

- Mover/redimensionar anotações existentes: motivo: outra iniciativa ([feat-mover-e-redimensionar-anotacoes](2026-09-25_feat-mover-e-redimensionar-anotacoes.md)).
- Gestos de toque: motivo: outra iniciativa ([feat-suporte-touch-mobile](2026-09-25_feat-suporte-touch-mobile.md)).
- Snap à grade: motivo: baixo impacto.

### Considerado para o futuro (P2)

- Editar vértices de polígono depois de criado.
- Suavização (simplificação Douglas-Peucker) dos traços livres para reduzir o tamanho do JSON.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O traço livre deve ser salvo ao soltar o mouse (1 traço = 1 anotação) em vez de exigir duplo clique? | PO/design | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Polígono sem duplicatas | integração (RTL + fireEvent com `detail`) | CA01 | 4 mousedowns + 2 mousedowns `detail=2` + dblclick | `onCreateAnnotation` com 4 pontos |
| CT02 | Point-in-polygon | unit | CA02 | `hitTestPolygon` com pontos dentro/fora/na borda | true/false corretos |
| CT03 | Hit em traço livre | unit | CA02 | `hitTestFreehand` a 5 px e a 20 px do traço | true / false |
| CT04 | Oculta não seleciona | unit | CA03 | Hit-test com `hidden: true` | null |
| CT05 | Soltar fora | integração | CA04 | mousedown no canvas, mouseup no `window` | `isDrawing` false |
| CT06 | Esc/Enter | integração | CA05 | 2 cliques + Esc; 3 cliques + Enter | 0 criações; 1 criação |
| CT07 | Wheel | manual | CA06 | Rolar sobre o canvas numa página com scroll | Sem scroll, sem warning |
| CT08 | Fit após troca | manual | CA07 | Trocar imagem 1200x800 por 400x2000 e apertar `0` | Imagem inteira visível |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/docs/Web/API/UIEvent/detail · https://github.com/facebook/react/issues/14856 (wheel passivo)
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: comportamento da ferramenta caneta do Figma (Enter/Esc).
- Requisitos originais: README, "Canvas com overlay para selecionar regiões (retângulo, polígono, ponto)".
- Issue / PR relacionado: —
