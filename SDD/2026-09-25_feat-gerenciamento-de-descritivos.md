# [FEAT] Renomear, duplicar e organizar descritivos

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Completar o [DescriptorManagerModal](../src/components/DescriptorManagerModal.tsx) com as operações básicas que faltam e deixar claro o comportamento do descritivo de exemplo.
- **Problema e evidência:**
  - Não há como renomear um descritivo depois de criado. O título só é definido no formulário de criação.
  - Não há como duplicar (ex.: usar uma tela como base para uma variação).
  - O descritivo de exemplo "Cadastro de Usuário" ([useDescriptors.ts](../src/hooks/useDescriptors.ts), `createInitialSampleDescriptor`) ocupa 1 das 5 vagas e volta a ser criado sempre que a lista fica vazia e a página é recarregada.
  - A exclusão usa `confirm()` nativo e não informa quantas anotações/comentários serão perdidos.
  - A lista não mostra data de atualização nem ordena por ela.
  - O botão "+" do Header abre o mesmo modal da lista (`onNewDescriptor` = `onOpenDescriptorsList` em [App.tsx](../src/App.tsx)) em vez de ir direto ao formulário de criação.
- **Impacto de não fazer:** Usuários criam descritivos novos só para corrigir títulos (esbarrando no limite de 5) e perdem o exemplo ou são incomodados por ele.
- **Para quem é destinado:** Todo usuário que gerencia várias telas.
- **História de usuário:** Como PO, quero renomear e duplicar telas, para organizar meus descritivos sem retrabalho.
- **Como saberemos que deu certo:** Renomear leva ≤ 2 cliques e não gasta vaga do limite.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Renomear inline na lista e clicando no título do Header | P0 | CA01 |
| RF02 | Duplicar descritivo (imagem + anotações, com novos IDs, sem as threads por padrão), respeitando o limite | P1 | CA02, CA06 |
| RF03 | Confirmação de exclusão em modal próprio, informando a contagem de anotações e comentários | P0 | CA03 |
| RF04 | O exemplo é criado só no primeiro acesso (flag `sample_seen` no localStorage) e fica marcado como "Exemplo" | P1 | CA04 |
| RF05 | Lista ordenada por `updated_at` decrescente, mostrando "atualizado há X" | P1 | CA05 |
| RF06 | O "+" do Header abre direto o formulário de criação | P1 | CA07 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Título com 1 a 120 caracteres; título vazio é rejeitado | P0 | CA01 |

### Dependências técnicas

- `DescriptorManagerModal.tsx`, `Header.tsx`, `useDescriptors.ts`, `App.tsx`.
- Geração de UUID ([fix-sincronizacao-supabase](2026-09-25_fix-sincronizacao-supabase.md), RF01) para a duplicação.

### Recursos necessários

- N/A: sem dependências externas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o descritivo "Tela A", quando o usuário renomear para "Checkout" e confirmar, então o novo título aparece no Header, na lista e no export; um título vazio não é aceito.
- [ ] **CA02:** Dado 3 descritivos, quando o usuário duplicar um com 4 anotações, então surge "Cópia de …" com 4 anotações de IDs novos.
- [ ] **CA03:** Dado um descritivo com 4 anotações e 10 comentários, quando o usuário pedir para excluir, então o modal informa "4 anotações e 10 comentários serão excluídos".
- [ ] **CA04:** Dado que o usuário já viu e excluiu o exemplo, quando recarregar a página, então o exemplo não reaparece.
- [ ] **CA05:** Dado 3 descritivos, quando o usuário editar o mais antigo, então ele passa ao topo da lista.
- [ ] **CA06:** Dado 5 descritivos, quando o usuário tentar duplicar, então a ação fica desabilitada com o motivo "limite de 5 atingido". (caso negativo)
- [ ] **CA07:** Dado o Header, quando o usuário clicar em "+", então o formulário de nova tela já aparece aberto.

## O que a atividade não inclui

- Pastas/projetos para agrupar descritivos: motivo: prematuro com limite de 5.
- Lixeira com restauração: motivo: o undo já cobre a sessão ([fix-desfazer-refazer-persistencia](2026-09-25_fix-desfazer-refazer-persistencia.md)).

### Considerado para o futuro (P2)

- Agrupamento por projeto e busca entre descritivos.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O exemplo deve contar para o limite de 5? | PO | Não | |
| D02 | Duplicar deve copiar as threads também (opção)? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Renomear | integração | CA01 | Editar título | Título persistido; vazio rejeitado |
| CT02 | Duplicar | unit | CA02 | `duplicateDescriptor(d)` | IDs novos, 4 anotações |
| CT03 | Confirmação | integração | CA03 | Clicar em excluir | Texto com as contagens |
| CT04 | Exemplo único | unit | CA04 | Flag setada + lista vazia | Não cria o exemplo |
| CT05 | Ordenação | unit | CA05 | Atualizar o mais antigo | Índice 0 |
| CT06 | Limite | integração | CA06 | 5 descritivos | Botão desabilitado |
| CT07 | Botão + | integração | CA07 | Clicar | Formulário visível |

## URL Complementar

- Documentação técnica: —
- Protótipo / mockup: —
- Discussões relacionadas: —
- Referências de design: —
- Requisitos originais: README, "Limite de 5 descriptors".
- Issue / PR relacionado: —
