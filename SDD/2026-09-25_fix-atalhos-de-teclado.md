# [FIX] Atalhos de teclado inconsistentes e ativos com modal aberto

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Unificar a fonte de verdade dos atalhos e garantir que eles só funcionem no contexto certo.
- **Problema e evidência:**
  - Três fontes dizem coisas diferentes para a mesma ação:
    | Ação | Handler real ([CanvasViewport.tsx:259](../src/components/CanvasViewport.tsx:259)) | [ShortcutsModal](../src/components/ShortcutsModal.tsx) | [i18n.ts](../src/lib/i18n.ts) |
    |---|---|---|---|
    | Retângulo | B | B | R |
    | Polígono | L | L | G |
    | Desenho livre | F | F | D |
    | Pan | (nenhum) | — | H |
    | Heatmap | H | H | — |
    | Apresentação | (nenhum) | — | F5 |
    | Ajuda | (nenhum) | — | ? |
  - Os atalhos continuam ativos com modal aberto: apertar `B` com foco num botão do modal de exportação troca a ferramenta por trás. O filtro só ignora `INPUT/TEXTAREA/SELECT`.
  - Com `PresentationModal` aberto, as setas funcionam, mas `H`, `G` etc. também alteram o canvas escondido.
  - Espaço + arrastar (pan temporário, padrão em ferramentas de design) não existe.
  - `Delete`/`Backspace` não excluem a anotação selecionada.
- **Impacto de não fazer:** O usuário aprende o atalho errado pela ajuda ou tooltip e perde a confiança na ferramenta; ações acontecem sem querer.
- **Para quem é destinado:** Usuários frequentes (PO/designers) que usam o teclado.
- **História de usuário:** Como PO, quero que os atalhos exibidos sejam exatamente os que funcionam, para trabalhar rápido sem surpresas.
- **Como saberemos que deu certo:** Um teste automatizado garante que a lista do `ShortcutsModal` e os tooltips vêm do mesmo mapa usado pelo handler.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Criar `src/lib/shortcuts.ts` com o mapa único `{ ação, tecla, descrição }`, consumido pelo handler, pelo `ShortcutsModal` e pelos `title` dos botões | P0 | CA01 |
| RF02 | Suspender os atalhos do canvas quando houver `[aria-modal="true"]` aberto | P0 | CA02 |
| RF03 | Corrigir `i18n.ts` para refletir o mapa (ou gerar os textos a partir dele) | P0 | CA01 |
| RF04 | Adicionar `?` (abrir ajuda) e `Delete`/`Backspace` (excluir a anotação selecionada, com a confirmação de [ui-ajustes-de-interface-e-acessibilidade](2026-09-25_ui-ajustes-de-interface-e-acessibilidade.md)) | P1 | CA03, CA04 |
| RF05 | Espaço pressionado ativa pan temporário e, ao soltar, volta à ferramenta anterior | P1 | CA05 |
| RF06 | Mostrar ⌘ em macOS e Ctrl nos demais sistemas nos textos de ajuda | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhum atalho de uma letra dispara com foco em campo editável | P0 | CA06 |
| RNF02 | Não sobrescrever atalhos nativos do navegador/SO (Ctrl+S, Ctrl+P, F5) | P0 | CA06 |

### Dependências técnicas

- `CanvasViewport.tsx`, `ShortcutsModal.tsx`, `Header.tsx`, `i18n.ts`.

### Recursos necessários

- Validação com o PO da tabela final de teclas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o mapa de atalhos, quando o `ShortcutsModal` for aberto, então cada linha mostra a mesma tecla que o handler usa e que aparece no `title` do botão correspondente.
- [ ] **CA02:** Dado o modal de exportação aberto, quando o usuário apertar `B`, então a ferramenta ativa não muda.
- [ ] **CA03:** Dado o canvas focado, quando o usuário apertar `?`, então o `ShortcutsModal` abre.
- [ ] **CA04:** Dado uma anotação selecionada, quando o usuário apertar `Delete` e confirmar, então a anotação é excluída.
- [ ] **CA05:** Dado a ferramenta retângulo ativa, quando o usuário segurar Espaço e arrastar, então a imagem se move e, ao soltar Espaço, a ferramenta retângulo volta.
- [ ] **CA06:** Dado o foco no campo de título da anotação, quando o usuário digitar "bph", então o texto é inserido e nenhuma ferramenta muda. (caso negativo)

## O que a atividade não inclui

- Atalhos configuráveis pelo usuário: motivo: prematuro.
- Command palette (Ctrl+K): motivo: baixo impacto agora.

### Considerado para o futuro (P2)

- Paleta de comandos buscável reutilizando o mesmo mapa de `shortcuts.ts`.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Manter B/L/F (atual) ou migrar para R/P/D (i18n, mais próximo do Figma)? | PO/design | Sim | |
| D02 | Abrir o modo apresentação por atalho (ex.: Shift+P), já que F5 é do navegador? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Fonte única | unit | CA01 | Renderizar `ShortcutsModal` e comparar com `SHORTCUTS` | Mesmas teclas |
| CT02 | Modal bloqueia | integração | CA02 | Abrir ExportModal, `keydown 'b'` | `onSelectTool` não chamado |
| CT03 | Ajuda | integração | CA03 | `keydown '?'` | Modal visível |
| CT04 | Delete | integração | CA04 | Selecionar, `keydown 'Delete'`, confirmar | `onDeleteAnnotation` chamado |
| CT05 | Pan temporário | manual | CA05 | Segurar espaço e arrastar | Pan e depois retorno à ferramenta |
| CT06 | Campo editável | integração | CA06 | Focar input e digitar 'b' | Ferramenta inalterada |

## URL Complementar

- Documentação técnica: —
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: https://help.figma.com/hc/en-us/articles/360040328653 (atalhos do Figma)
- Requisitos originais: README, "Atalhos de teclado e suporte mobile-friendly".
- Issue / PR relacionado: —
