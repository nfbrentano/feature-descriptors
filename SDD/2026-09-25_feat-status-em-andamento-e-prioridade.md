# [FEAT] Status "Em andamento", prioridade e filtros completos

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Expor na interface os campos que já existem no modelo (`status: 'in_progress'` e `priority`) e completar os filtros da sidebar.
- **Problema e evidência:**
  - `AnnotationStatus` inclui `'in_progress'` ([types/index.ts](../src/types/index.ts)), mas o `ThreadPanel` só alterna aberto ↔ resolvido (`handleToggleResolved`). O filtro da sidebar só tem Todas/Abertas/Resolvidas ([AnnotationSidebar.tsx](../src/components/AnnotationSidebar.tsx)), embora o i18n tenha `filterInProgress`. Anotações importadas com `in_progress` não aparecem em nenhum filtro além de "Todas".
  - `priority: 'low' | 'medium' | 'high' | 'critical'` existe no tipo e não aparece em nenhuma tela.
  - O filtro de tags é um único valor, e não há filtro por responsável nem ordenação (o README pede "filtros (tags, status, responsável, estimativa)").
  - A sidebar não mostra a soma de pontos, informação útil para o planejamento.
- **Impacto de não fazer:** O PO não consegue acompanhar o progresso nem priorizar dentro da ferramenta, e precisa exportar para uma planilha.
- **Para quem é destinado:** PO e tech lead fazendo triagem e acompanhamento.
- **História de usuário:** Como PO, quero marcar prioridade e status "em andamento" e filtrar por eles, para ver rapidamente o que está sendo feito e o que é crítico.
- **Como saberemos que deu certo:** Todo valor de status e prioridade do modelo pode ser definido e filtrado pela UI.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Seletor de status (Aberto · Em andamento · Resolvido) no `ThreadPanel`, substituindo o toggle. O confete continua ao resolver | P0 | CA01 |
| RF02 | Seletor de prioridade (Baixa · Média · Alta · Crítica) no `ThreadPanel` | P0 | CA02 |
| RF03 | Filtro "Em andamento" na sidebar, com contador | P0 | CA03 |
| RF04 | Indicador visual de prioridade no item da sidebar (ícone/cor, não só cor) | P1 | CA04 |
| RF05 | Ordenação da lista: número, prioridade, estimativa, última atualização | P1 | CA05 |
| RF06 | Filtro por responsável e seleção de várias tags | P1 | CA06 |
| RF07 | Rodapé da sidebar com o total de pontos das anotações filtradas | P1 | CA07 |
| RF08 | Prioridade e status incluídos nos exports (Markdown/CSV) | P1 | CA08 |
| RF09 | Persistir os filtros escolhidos por descritivo (sessionStorage) | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | A prioridade é distinguível sem depender de cor (WCAG 1.4.1) | P0 | CA04 |
| RNF02 | Filtrar 500 anotações responde em < 50 ms | P2 | — |

### Dependências técnicas

- Coluna `priority` em `annotations` ([fix-migracao-supabase](2026-09-25_fix-migracao-supabase.md), RF03).
- `ThreadPanel.tsx`, `AnnotationSidebar.tsx`, `markdownExporter.ts`, `exportUtils.ts`.

### Recursos necessários

- Ícones de prioridade (lucide: `ChevronsUp`, `ArrowUp`, `Minus`, `ArrowDown`).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado uma anotação aberta, quando o usuário escolher "Em andamento", então o status é salvo, a sidebar mostra o selo correspondente e não há confete.
- [ ] **CA02:** Dado uma anotação sem prioridade, quando o usuário escolher "Crítica", então ela é salva e aparece no item da sidebar.
- [ ] **CA03:** Dado 2 anotações em andamento, quando o usuário clicar em "Em andamento (2)", então só essas duas aparecem.
- [ ] **CA04:** Dado a sidebar em escala de cinza, quando o usuário olhar os itens, então consegue distinguir as prioridades pelo ícone/texto.
- [ ] **CA05:** Dado a ordenação "Prioridade", quando aplicada, então Crítica > Alta > Média > Baixa > sem prioridade.
- [ ] **CA06:** Dado as tags `bug` e `ux` selecionadas, quando o filtro for aplicado, então aparecem anotações com qualquer uma delas.
- [ ] **CA07:** Dado 3 anotações filtradas com 2, 3 e sem estimativa, quando exibido o rodapé, então mostra "5 pts".
- [ ] **CA08:** Dado uma anotação sem prioridade, quando exportada em Markdown, então não aparece uma linha "Prioridade" vazia. (caso negativo)

## O que a atividade não inclui

- Kanban/board de anotações: motivo: prematuro; a ferramenta é centrada na tela.
- Campos customizáveis: motivo: complexo demais agora.

### Considerado para o futuro (P2)

- Visão Kanban por status.
- Sprint/milestone por anotação.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A cor da anotação no canvas deve refletir a prioridade quando não houver cor customizada? | design | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Status em andamento | integração | CA01 | Selecionar opção | `status === 'in_progress'`, confete não chamado |
| CT02 | Prioridade | integração | CA02 | Selecionar Crítica | `priority === 'critical'` |
| CT03 | Filtro | integração | CA03 | Clicar no filtro | 2 itens |
| CT04 | Sem cor | manual | CA04 | DevTools > emular acromatopsia | Distinguível |
| CT05 | Ordenação | unit | CA05 | `sortAnnotations(list, 'priority')` | Ordem correta |
| CT06 | Várias tags | unit | CA06 | Filtro `['bug','ux']` | União |
| CT07 | Soma de pontos | unit | CA07 | [2,3,undefined] | 5 |
| CT08 | Export sem prioridade | unit | CA08 | Export | Sem linha vazia |

## URL Complementar

- Documentação técnica: https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html
- Protótipo / mockup: —
- Discussões relacionadas: —
- Referências de design: seletor de prioridade do Linear.
- Requisitos originais: README, "Lado esquerdo: lista de anotações / filtros (tags, status, responsável, estimativa)".
- Issue / PR relacionado: —
