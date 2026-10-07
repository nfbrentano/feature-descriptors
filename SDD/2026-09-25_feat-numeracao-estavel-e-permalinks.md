# [FEAT] Numeração estável das anotações e permalinks

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Dar a cada anotação um número fixo (A1, A2…) que não muda quando outras são excluídas, e um link direto que abre o descritivo já com a anotação selecionada.
- **Problema e evidência:**
  - O rótulo `A{n}` é calculado pela posição no array: no canvas (`labelNumber = A${idx + 1}` em [canvasUtils.ts](../src/lib/canvasUtils.ts)), na sidebar (`originalIndex + 1`), no export Markdown e na apresentação (posição do slide). Excluir a A2 transforma a A3 em A2. Um export ou issue que citava "A3" passa a apontar para outra coisa.
  - O novo título padrão usa `annotations.length + 1` ([useDescriptors.ts](../src/hooks/useDescriptors.ts), `createAnnotation`). Depois de uma exclusão, dá para ter dois "Nova Anotação A3".
  - O README pede "Links diretos/permalinks para cada anotação (para inclusão em PRs/Issues)" e isso não existe: não há roteamento nem leitura de URL.
- **Impacto de não fazer:** Referências cruzadas (issues, PRs, conversas, exports) ficam erradas depois de qualquer exclusão.
- **Para quem é destinado:** PO e devs que citam anotações em issues/PRs.
- **História de usuário:** Como dev, quero colar um link para a anotação A4 num PR, para que o revisor abra exatamente aquela marcação.
- **Como saberemos que deu certo:** Depois de excluir anotações, todos os números existentes continuam iguais, e o link copiado abre a anotação certa em outra aba.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Campo `seq` (inteiro) na anotação, atribuído como `max(seq) + 1` na criação e nunca reutilizado no descritivo | P0 | CA01 |
| RF02 | Canvas, sidebar, thread, apresentação e exports usam `A{seq}` | P0 | CA01 |
| RF03 | Migrar anotações existentes atribuindo `seq` pela ordem atual | P0 | CA02 |
| RF04 | Hash de URL `#/d/{descriptorId}/a/{annotationId}`: ao abrir, seleciona o descritivo e a anotação e centraliza o canvas nela | P0 | CA03 |
| RF05 | Botão "Copiar link" no `ThreadPanel` | P0 | CA03 |
| RF06 | A URL acompanha a seleção atual (`history.replaceState`), sem poluir o histórico do navegador | P1 | CA04 |
| RF07 | Link para anotação inexistente mostra toast "Anotação não encontrada" e abre o descritivo | P1 | CA05 |
| RF08 | O export Markdown inclui o permalink de cada anotação quando houver URL pública configurada | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Funciona no GitHub Pages (roteamento por hash, sem precisar de fallback 404) | P0 | CA03 |
| RNF02 | Links de descritivos locais só funcionam no mesmo navegador. A UI avisa isso ao copiar sem login | P1 | CA06 |

### Dependências técnicas

- Coluna `seq integer` em `annotations` ([fix-migracao-supabase](2026-09-25_fix-migracao-supabase.md) ou migração nova).
- `App.tsx` (leitura do hash), `ThreadPanel.tsx`, `canvasUtils.ts`, `markdownExporter.ts`, `PresentationModal.tsx`, `AnnotationSidebar.tsx`.

### Recursos necessários

- N/A: sem dependências externas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado A1, A2 e A3, quando o usuário excluir a A2 e criar uma nova, então as existentes continuam A1 e A3 e a nova é A4, em todos os lugares (canvas, sidebar, export, apresentação).
- [ ] **CA02:** Dado um localStorage com anotações sem `seq`, quando o app carregar, então elas recebem A1..An na ordem atual.
- [ ] **CA03:** Dado o link copiado de A3, quando aberto em outra aba do mesmo navegador (ou em outro, com login), então o descritivo abre com a A3 selecionada e centralizada.
- [ ] **CA04:** Dado que o usuário selecionou várias anotações em sequência, quando apertar "voltar" no navegador, então sai do app (ou da página anterior), e não passa por cada seleção.
- [ ] **CA05:** Dado um link para anotação excluída, quando aberto, então aparece o toast de não encontrada e nenhuma anotação fica selecionada. (caso negativo)
- [ ] **CA06:** Dado o modo local sem login, quando o usuário clicar em "Copiar link", então o toast avisa que o link só funciona neste navegador.

## O que a atividade não inclui

- Roteador completo (react-router): motivo: um hash simples basta e evita dependência nova.
- Links públicos para quem não tem conta: motivo: depende de permissões/compartilhamento (futuro).

### Considerado para o futuro (P2)

- Links públicos somente leitura.
- Prefixo configurável por descritivo (ex.: `CAD-4`).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O rótulo deve mudar de "A{n}" para algo com prefixo do descritivo? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Seq estável | unit | CA01 | Criar 3, excluir a 2ª, criar 1 | seqs [1,3,4] |
| CT02 | Migração de seq | unit | CA02 | Carregar dados sem `seq` | seqs 1..n |
| CT03 | Deep link | e2e | CA03 | Abrir `#/d/x/a/y` | Anotação y selecionada |
| CT04 | replaceState | unit | CA04 | Selecionar 3x | `history.length` inalterado |
| CT05 | Link inválido | integração | CA05 | Hash com id inexistente | Toast exibido |
| CT06 | Aviso local | integração | CA06 | Copiar link sem sessão | Toast de aviso |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/docs/Web/API/History/replaceState
- Protótipo / mockup: —
- Discussões relacionadas: —
- Referências de design: links de comentário do Figma/Google Docs.
- Requisitos originais: README, "Links diretos/permalinks para cada anotação".
- Issue / PR relacionado: —
