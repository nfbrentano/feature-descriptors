# [FEAT] Colaboração na thread: editar/excluir comentário, menções e votação por consenso

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Completar os recursos de discussão prometidos no README: editar/excluir o próprio comentário, mencionar colegas e votar para chegar a uma decisão.
- **Problema e evidência:**
  - Não há como editar ou excluir um comentário no [ThreadPanel](../src/components/ThreadPanel.tsx). Um erro de digitação fica para sempre (e vai para o export).
  - O README cita "Menções de usuários (@usuario)" e "Resolução por consenso: votos, reações e transformação de voto em decisão". O tipo `Annotation.votes` existe, mas não há UI.
  - As mensagens mostram só a hora (`toLocaleTimeString`), sem data. Discussões de dias diferentes ficam ambíguas.
  - As reações são limitadas a 👍 🚀 ❤️, e os botões não têm `aria-label`.
- **Impacto de não fazer:** As discussões ficam menos confiáveis e as decisões não ficam registradas de forma estruturada.
- **Para quem é destinado:** PO e devs discutindo requisitos.
- **História de usuário:** Como dev, quero votar numa proposta e mencionar o PO, para que a decisão fique registrada e a pessoa certa seja avisada.
- **Como saberemos que deu certo:** Toda anotação pode ter uma decisão registrada por votação, e comentários podem ser corrigidos pelo autor.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | O autor pode editar o próprio comentário. O comentário mostra "(editado)" e ganha `updated_at` | P0 | CA01 |
| RF02 | O autor pode excluir o próprio comentário, com confirmação | P0 | CA02 |
| RF03 | Data + hora nas mensagens ("hoje 09:12", "ontem 14:03", "14/08 09:12") | P0 | CA03 |
| RF04 | Autocomplete de `@` com os autores que já participaram do descritivo (e colaboradores, quando houver). A menção é destacada no texto | P1 | CA04 |
| RF05 | Votação na anotação: 👍 Aprovar / 👎 Rejeitar, um voto por usuário (`votes.votedBy`), placar visível | P1 | CA05 |
| RF06 | Ação "Registrar decisão": grava um comentário de sistema com o placar e muda o status para Resolvido | P1 | CA06 |
| RF07 | `aria-label` e `aria-pressed` nas reações; seletor com mais emojis | P1 | CA07 |
| RF08 | Exports incluem votos, decisão e "(editado)" | P1 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Um usuário não consegue editar/excluir comentário de outro (validado na UI e no RLS) | P0 | CA09 |
| RNF02 | O conteúdo dos comentários é renderizado como texto (sem HTML) para evitar XSS | P0 | CA09 |

### Dependências técnicas

- Policies de UPDATE/DELETE em `messages` e a coluna `votes` ([fix-migracao-supabase](2026-09-25_fix-migracao-supabase.md)).
- Identidade real do usuário ([feat-autenticacao-supabase](2026-09-25_feat-autenticacao-supabase.md)) para garantir o "um voto por usuário" entre dispositivos.

### Recursos necessários

- N/A: sem dependências externas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um comentário meu, quando eu editar o texto e salvar, então o novo texto aparece com "(editado)".
- [ ] **CA02:** Dado um comentário meu, quando eu excluí-lo e confirmar, então ele some da thread e do export.
- [ ] **CA03:** Dado um comentário de ontem, quando exibido, então mostra "ontem HH:MM".
- [ ] **CA04:** Dado que "Ana" já comentou no descritivo, quando eu digitar "@an", então aparece a sugestão "@Ana" e, ao escolher, a menção fica destacada.
- [ ] **CA05:** Dado que votei "Aprovar", quando eu clicar em "Rejeitar", então meu voto muda (não soma dois) e o placar fica 0 × 1.
- [ ] **CA06:** Dado um placar 3 × 0, quando o PO clicar em "Registrar decisão", então aparece o comentário de sistema "Decisão: aprovado (3 × 0)" e a anotação vai para Resolvido.
- [ ] **CA07:** Dado um leitor de tela, quando focar numa reação, então ouve "Reagir com foguete, 2 reações, pressionado".
- [ ] **CA08:** Dado uma anotação com votos e decisão, quando exportada em Markdown, então votos e decisão aparecem.
- [ ] **CA09:** Dado um comentário de outro usuário, quando eu o visualizar, então não aparecem as ações editar/excluir, e um comentário com `<img onerror>` é exibido como texto. (caso negativo)

## O que a atividade não inclui

- Notificações por e-mail/Slack das menções: motivo: depende de backend/Edge Functions; fica como P2.
- Respostas aninhadas (sub-threads): motivo: baixo impacto; a thread linear atende.
- Formatação rica (Markdown) nos comentários: motivo: prematuro.

### Considerado para o futuro (P2)

- Notificações de menção (e-mail, Slack, Teams).
- Resumo automático da thread por AI.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Quem pode registrar decisão: qualquer editor ou só o dono do descritivo? | PO | Sim | |
| D02 | Excluir comentário deve ser soft-delete ("comentário removido") para manter o histórico? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Editar | integração | CA01 | Editar e salvar | Texto novo + "(editado)" |
| CT02 | Excluir | integração | CA02 | Excluir e confirmar | Mensagem removida |
| CT03 | Data relativa | unit | CA03 | `formatMessageDate(ontem)` | "ontem HH:MM" |
| CT04 | Menção | integração | CA04 | Digitar "@an" | Sugestão exibida |
| CT05 | Troca de voto | unit | CA05 | `toggleVote(ann, user, 'no')` após 'yes' | yes 0, no 1 |
| CT06 | Decisão | integração | CA06 | Clicar em registrar | Mensagem de sistema + status resolved |
| CT07 | A11y reações | integração | CA07 | Query `getByRole('button', { name: /foguete/ })` | Encontrado com `aria-pressed` |
| CT08 | Export | unit | CA08 | Export com votos | Contém o placar |
| CT09 | Permissão/XSS | integração | CA09 | Renderizar mensagem de outro autor com HTML | Sem botões; texto literal |

## URL Complementar

- Documentação técnica: —
- Protótipo / mockup: —
- Discussões relacionadas: —
- Referências de design: comentários do Google Docs; reações do GitHub.
- Requisitos originais: README, "Menções de usuários", "Resolução por consenso".
- Issue / PR relacionado: —
