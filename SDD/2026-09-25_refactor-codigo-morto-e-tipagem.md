# [REFACTOR] Remover código morto, adotar i18n e eliminar `any`

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Limpar código não usado ou duplicado e fortalecer a tipagem, sem mudar o comportamento.
- **Problema e evidência:**
  - [useCanvasState.ts](../src/hooks/useCanvasState.ts) tem um estado de tema paralelo (`ThemeMode` com `wireframe`, `cyberpunk`…, chave `fd_theme`) que conflita com o tema real do `App.tsx` (chave `theme`). Também tem `showHeatmap`, `showRuler`, `filterTag` e `filterStatus`, que nunca são usados.
  - [i18n.ts](../src/lib/i18n.ts) não é importado em nenhum arquivo. Todos os textos estão fixos nos componentes, e o i18n está desatualizado (atalhos errados, ver [fix-atalhos-de-teclado](2026-09-25_fix-atalhos-de-teclado.md)).
  - [validators.ts](../src/lib/validators.ts) e [debounce.ts](../src/lib/debounce.ts) existem, mas não são usados no app (os validators só nos testes).
  - `MessageReaction` em `types/index.ts` não é usado (as reações são `Record<string, string[]>`).
  - `any` em pontos centrais: `handleCreateAnnotation(type: any, coords: any)` ([App.tsx](../src/App.tsx)), `createAnnotation(type, coords: any)`, `onUpdateAnnotation?: (ann: any)` na sidebar, `catch (err: any)`, `metadata: { [key: string]: any }`.
  - A lógica de "centro da anotação" está duplicada em `canvasUtils.ts` (heatmap), `markdownExporter.ts` (`generateHeatmapSummary`) e `exportUtils.ts` (COCO), cada uma tratando tipos diferentes.
  - `ExportModal.onShowToast` aceita um tipo sem `'warning'`, divergente do `addToast` do App.
  - Estilos inline extensos (`style={{...}}`) nos componentes duplicam o que deveria estar em `index.css`.
- **Impacto de não fazer:** Bugs por divergência (tema, atalhos, heatmap), dificuldade de manutenção e de onboarding, e erros de tipo que o compilador não pega.
- **Para quem é destinado:** Devs do projeto (humanos e agents).
- **História de usuário:** Como dev, quero uma única fonte para textos, geometria e tema, para mudar comportamento em um lugar só.
- **Como saberemos que deu certo:** `tsc --noEmit` passa com `noImplicitAny` e zero `any` explícitos em `src/` (exceto nos testes), e todos os testes existentes continuam passando.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Remover de `useCanvasState` o tema paralelo e os estados não usados | P0 | CA01 |
| RF02 | Decidir sobre `i18n.ts`: adotar em todos os componentes (hook `useT()`) ou remover. Recomendado: adotar | P1 | CA02 |
| RF03 | Criar `src/lib/geometry.ts` com `getAnnotationCentroid`, `getAnnotationBounds` e `hitTest`, usados por canvas, heatmap, exports e apresentação | P0 | CA03 |
| RF04 | Substituir `any` por tipos: `AnnotationCoords` discriminado por `type` (union `{type:'bbox', coords: BBoxCoords} | ...`), `unknown` nos `catch` | P0 | CA04 |
| RF05 | Remover `MessageReaction` ou passar a usá-lo | P1 | CA04 |
| RF06 | Tipo único `ToastType` compartilhado entre `App` e os modais | P1 | CA04 |
| RF07 | Mover os estilos inline repetidos para classes em `index.css` (pelo menos modais e `ThreadPanel`) | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhuma mudança de comportamento visível (refatoração pura) | P0 | CA05 |
| RNF02 | O tamanho do bundle não aumenta mais de 2% | P1 | CA05 |

### Dependências técnicas

- Deve ser feito antes ou junto com [fix-exportacao-csv-e-coco](2026-09-25_fix-exportacao-csv-e-coco.md) e [fix-modo-apresentacao](2026-09-25_fix-modo-apresentacao.md), que se beneficiam de `geometry.ts`.
- [chore-testes-e-lint](2026-09-25_chore-testes-e-lint.md): testes de regressão antes de refatorar.

### Recursos necessários

- N/A: sem dependências externas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o código, quando alguém buscar `fd_theme` ou `ThemeMode`, então não há ocorrências, e o tema claro/escuro continua funcionando e persistindo.
- [ ] **CA02:** Dado a decisão D01, quando concluída, então nenhum texto de UI fica fora de `i18n.ts` (se adotado) ou o arquivo foi removido (se não).
- [ ] **CA03:** Dado um polígono, quando o centroide for calculado para heatmap no canvas, no resumo Markdown e no COCO, então os três usam a mesma função e dão o mesmo resultado.
- [ ] **CA04:** Dado `strict` + `noImplicitAny`, quando rodar `npm run typecheck`, então passa, e `grep -rn ": any" src --include=*.ts* | grep -v test` retorna vazio.
- [ ] **CA05:** Dado a suíte de testes e um smoke test manual (criar, editar, exportar, apresentar), quando executados depois do refactor, então os resultados são idênticos aos de antes. (caso negativo: nenhuma regressão)

## O que a atividade não inclui

- Troca de canvas 2D por lib (Konva/Fabric): motivo: complexo demais agora, sem ganho imediato.
- State management externo (Zustand/Redux): motivo: prematuro.
- Tradução para inglês: motivo: P2; esta atividade só centraliza os textos.

### Considerado para o futuro (P2)

- Tradução en-US usando o `i18n.ts` centralizado.
- Separar `useDescriptors` (477 linhas) em hooks menores (persistência, realtime, CRUD).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Adotar ou remover `i18n.ts`? Há plano de oferecer outros idiomas? | PO | Sim | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Tema | integração | CA01 | Alternar tema e recarregar | Tema persistido via `theme` |
| CT02 | Textos centralizados | manual | CA02 | Buscar strings PT-BR nos `.tsx` | Nenhuma fora do i18n |
| CT03 | Centroide único | unit | CA03 | `getAnnotationCentroid` para 4 tipos | Valores esperados |
| CT04 | Tipagem | CI | CA04 | `npm run typecheck` | Passa |
| CT05 | Regressão | unit + manual | CA05 | `npm test` + smoke | Verde / idêntico |

## URL Complementar

- Documentação técnica: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: N/A
- Requisitos originais: N/A: iniciativa técnica.
- Issue / PR relacionado: —
