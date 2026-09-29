# [UI] Ajustes de interface e acessibilidade

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Corrigir problemas visuais e de acessibilidade espalhados pela interface.
- **Problema e evidência:**
  - **ErrorBoundary sem estilo:** o fallback usa classes Tailwind (`flex flex-col items-center ... bg-slate-900/90`, [ErrorBoundary.tsx:42](../src/components/ErrorBoundary.tsx:42)), mas o projeto não usa Tailwind. A tela de erro aparece como texto cru, sem layout.
  - **Exclusão sem confirmação:** a lixeira da sidebar e do `ThreadPanel` ([ThreadPanel.tsx:174](../src/components/ThreadPanel.tsx:174)) exclui na hora, embora exista `messages.thread.deleteConfirm` no i18n.
  - **Sidebar inacessível por teclado:** os itens de anotação são `<div onClick>` sem `role`, `tabIndex` ou `onKeyDown` ([AnnotationSidebar.tsx](../src/components/AnnotationSidebar.tsx)).
  - **Botões só com ícone sem nome acessível:** IA, excluir e fechar no `ThreadPanel`, "+" e olho/lixeira na sidebar, "×" da tag.
  - **Campos sem label associado:** `<label className="meta-label">` sem `htmlFor` no `ThreadPanel`, `AuthModal` e `DescriptorManagerModal`.
  - **Anotações do canvas invisíveis a leitores de tela:** o `<canvas role="img">` não expõe as anotações nem tem alternativa navegável.
  - **Toast ruidoso:** alternar o tema dispara um toast ("Tema alterado"), e o toast some em 4 s mesmo com erro (curto para ler mensagens de erro).
  - **Classe de tag com texto livre:** `tag-${tag}` com tags como "validação" ou com espaços gera classes inválidas ou sem estilo.
  - **Tag com `#`:** `replace('#', '')` remove só o primeiro `#`.
  - **Filtros da sidebar:** os botões de filtro não indicam o estado ativo para tecnologia assistiva (`aria-pressed`).
- **Impacto de não fazer:** Usuários de teclado e leitor de tela não conseguem usar a ferramenta; exclusões acidentais; tela de erro com aparência de quebrada.
- **Para quem é destinado:** Todos os usuários, em especial os que dependem de teclado ou leitor de tela.
- **História de usuário:** Como usuário de teclado, quero navegar pelas anotações e acionar todas as ações sem mouse, para usar a ferramenta com autonomia.
- **Como saberemos que deu certo:** 0 violações críticas/sérias no axe-core nas telas principais, e o fluxo "selecionar anotação → comentar → resolver" é feito só com teclado.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Reescrever o estilo do ErrorBoundary com as classes/variáveis CSS existentes em `index.css` | P0 | CA01 |
| RF02 | Confirmação antes de excluir anotação (sidebar, thread e atalho Delete) | P0 | CA02 |
| RF03 | Itens da sidebar como `<button>` (ou `role="button"` + `tabIndex` + Enter/Espaço), com `aria-current` no selecionado | P0 | CA03 |
| RF04 | `aria-label` em todos os botões só com ícone | P0 | CA04 |
| RF05 | `htmlFor`/`id` em todos os pares label/campo | P0 | CA04 |
| RF06 | Lista oculta (sr-only) sincronizada com as anotações do canvas, ou `aria-describedby` descrevendo quantas há e qual está selecionada | P1 | CA05 |
| RF07 | Remover o toast de troca de tema; toasts de erro ficam até serem fechados (ou 10 s) | P1 | CA06 |
| RF08 | Normalizar a tag para a classe CSS (slug) e remover todos os `#` | P1 | CA07 |
| RF09 | `aria-pressed` nos filtros da sidebar | P1 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | WCAG 2.1 AA: 0 violações críticas/sérias no axe-core (Header, sidebar, thread, modais) | P0 | CA04 |
| RNF02 | Contraste ≥ 4,5:1 nos textos dos temas claro e escuro | P1 | CA04 |
| RNF03 | Foco visível em todos os elementos interativos | P0 | CA03 |

### Dependências técnicas

- `ErrorBoundary.tsx`, `AnnotationSidebar.tsx`, `ThreadPanel.tsx`, `AuthModal.tsx`, `DescriptorManagerModal.tsx`, `Toast.tsx`, `App.tsx`, `index.css`.
- `@axe-core/react` ou `vitest-axe` para testes (dev dependency).

### Recursos necessários

- Leitor de tela para validação manual (VoiceOver/NVDA).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um erro lançado dentro da sidebar, quando o ErrorBoundary for exibido, então aparece um cartão centralizado, com ícone, título, mensagem e botão estilizados nos temas claro e escuro.
- [ ] **CA02:** Dado uma anotação, quando o usuário clicar na lixeira, então aparece uma confirmação e, se cancelar, nada é excluído.
- [ ] **CA03:** Dado o foco na sidebar, quando o usuário usar Tab até uma anotação e apertar Enter, então ela é selecionada e a thread abre.
- [ ] **CA04:** Dado as telas principais, quando o axe-core rodar, então não há violações críticas ou sérias.
- [ ] **CA05:** Dado um leitor de tela no canvas, quando o foco chegar nele, então é anunciado "Tela X com N anotações; selecionada: A3 – título".
- [ ] **CA06:** Dado uma troca de tema, quando ela acontecer, então nenhum toast aparece; e um toast de erro fica visível até ser fechado.
- [ ] **CA07:** Dado a tag digitada "##Validação UX", quando adicionada, então fica "validação ux" e recebe uma classe CSS válida. (caso negativo: nenhum `#` restante)

## O que a atividade não inclui

- Redesign visual completo: motivo: fora de escopo; só ajustes.
- Tradução para outros idiomas: motivo: ver [refactor-codigo-morto-e-tipagem](2026-09-25_refactor-codigo-morto-e-tipagem.md) (adoção do i18n); tradução é P2.
- Navegação por teclado entre anotações dentro do canvas: motivo: coberto por RF06 (alternativa) + setas de [feat-mover-e-redimensionar-anotacoes](2026-09-25_feat-mover-e-redimensionar-anotacoes.md).

### Considerado para o futuro (P2)

- Tema de alto contraste.
- Suporte a `prefers-reduced-motion` (confete, animações).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A confirmação de exclusão pode ser trocada por "excluído — desfazer" num toast (padrão Gmail)? | design | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Fallback estilizado | manual + unit | CA01 | Componente que lança erro | Classes existentes em `index.css` aplicadas |
| CT02 | Confirmação | integração | CA02 | Clicar na lixeira e cancelar | `onDeleteAnnotation` não chamado |
| CT03 | Teclado na sidebar | integração | CA03 | `userEvent.tab()` + Enter | `onSelectAnnotation` chamado |
| CT04 | axe | integração (vitest-axe) | CA04 | Renderizar App | 0 violações críticas/sérias |
| CT05 | Descrição do canvas | integração | CA05 | Verificar `aria-describedby` | Texto correto |
| CT06 | Toasts | integração | CA06 | `toggleTheme` e erro | Sem toast; erro persiste |
| CT07 | Normalização de tag | unit | CA07 | `normalizeTag('##Validação UX')` | 'validação ux' |

## URL Complementar

- Documentação técnica: https://www.w3.org/WAI/WCAG21/quickref/ · https://github.com/dequelabs/axe-core
- Protótipo / mockup: —
- Discussões relacionadas: commit `e6031fa` (classe `btn-ghost-icon`).
- Referências de design: —
- Requisitos originais: —
- Issue / PR relacionado: —
