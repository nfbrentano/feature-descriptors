# [FIX] Migração Supabase inválida e schema incompleto

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Corrigir `supabase/migrations/001_init.sql` (ou criar `002_*.sql`) para que a migração rode sem erro e o schema guarde todos os campos que o app usa.
- **Problema e evidência:**
  - As policies de `annotations` e `messages` usam `NEW.descriptor_id` / `NEW.annotation_id` ([001_init.sql:169](../supabase/migrations/001_init.sql:169), [:185](../supabase/migrations/001_init.sql:185), [:213](../supabase/migrations/001_init.sql:213)). `NEW` não existe em expressões de `CREATE POLICY` (só em triggers), então o Postgres dá erro `missing FROM-clause entry for table "new"` e a migração para no meio.
  - Não existe policy `FOR UPDATE` em `messages`. O app faz `upsert` de mensagens já existentes (ex.: ao reagir com emoji), e o RLS bloqueia.
  - As colunas `description`, `estimate_source`, `suggested_assignee`, `priority`, `color`, `label`, `hidden` e `votes` não existem em `annotations`, mas fazem parte de `Annotation` ([types/index.ts](../src/types/index.ts)). Depois de sincronizar e recarregar, esses dados se perdem ([storage.ts:72](../src/lib/storage.ts:72) nem tenta lê-los).
  - O limite de 5 descritivos está fixo em dois lugares (trigger SQL e `MAX_DESCRIPTORS_LIMIT`).
- **Impacto de não fazer:** Nenhum ambiente Supabase novo consegue ser provisionado. A sincronização em nuvem descrita no README não funciona, e parte dos dados some sem aviso.
- **Para quem é destinado:** Devs que sobem o ambiente Supabase; usuários que ativam a sincronização em nuvem.
- **História de usuário:** Como dev, quero rodar a migração num projeto Supabase limpo sem erros, para que a sincronização e o RLS funcionem logo de início.
- **Como saberemos que deu certo:** `supabase db reset` roda sem erro, e um descritivo com todos os campos preenchidos volta idêntico depois de salvo e recarregado.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Trocar `NEW.<coluna>` pela referência direta à coluna (`descriptor_id`, `annotation_id`) em todas as policies | P0 | CA01 |
| RF02 | Criar policy `FOR UPDATE` em `messages` que permita ao autor editar a própria mensagem e a quem pode comentar atualizar `meta` (reações) | P0 | CA02 |
| RF03 | Adicionar em `annotations` as colunas `description text`, `estimate_source text`, `suggested_assignee text`, `priority text`, `color text`, `label text`, `hidden boolean default false`, `votes jsonb default '{}'` | P0 | CA03 |
| RF04 | Adicionar `CHECK` para `type` (`bbox/point/polygon/freehand`), `status` (`open/in_progress/resolved`) e `role` (`viewer/editor/admin`) | P1 | CA04 |
| RF05 | Adicionar índices em `annotations(descriptor_id)`, `messages(annotation_id)` e `collaborators(descriptor_id, user_id)` | P1 | CA05 |
| RF06 | Adicionar trigger `set_updated_at` em `messages` (coluna `updated_at`) | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | A migração é idempotente (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`) e pode ser reaplicada sem erro | P0 | CA01 |
| RNF02 | Nenhuma policy nova amplia acesso: usuários sem vínculo com o descritivo continuam sem ler nem escrever nada | P0 | CA06 |

### Dependências técnicas

- Supabase CLI local (`supabase start` / `supabase db reset`).
- Atividade relacionada: [2026-09-25_fix-sincronizacao-supabase.md](2026-09-25_fix-sincronizacao-supabase.md) (o client precisa gravar e ler as colunas novas).

### Recursos necessários

- Projeto Supabase de teste (local ou staging).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um banco Supabase vazio, quando a migração for aplicada duas vezes seguidas, então as duas execuções terminam sem erro.
- [ ] **CA02:** Dado um usuário editor de um descritivo, quando ele reagir a uma mensagem já existente (upsert em `messages`), então a linha é atualizada e o RLS não bloqueia.
- [ ] **CA03:** Dado uma anotação com descrição, prioridade, cor, rótulo, responsável, `hidden` e votos, quando ela for salva e relida do banco, então todos esses campos voltam com os mesmos valores.
- [ ] **CA04:** Dado um insert com `status = 'foo'`, quando ele for executado, então o banco o rejeita por violar o `CHECK`.
- [ ] **CA05:** Dado um descritivo com 200 anotações, quando o app buscar as anotações por `descriptor_id`, então o `EXPLAIN` mostra uso de índice.
- [ ] **CA06:** Dado um usuário autenticado sem vínculo com o descritivo X, quando ele tentar `select`/`update` em anotações ou mensagens de X, então recebe zero linhas ou erro de RLS. (caso negativo)

## O que a atividade não inclui

- Mudanças no client (`storage.ts`) para ler e gravar as colunas novas: motivo: outra iniciativa ([fix-sincronizacao-supabase](2026-09-25_fix-sincronizacao-supabase.md)).
- Tabela separada para votos e reações: motivo: prematuro; `jsonb` atende o volume atual.
- Bucket do Supabase Storage: motivo: outra iniciativa ([feat-storage-e-versoes-de-imagem](2026-09-25_feat-storage-e-versoes-de-imagem.md)).

### Considerado para o futuro (P2)

- Tornar o limite de descritivos configurável (tabela `plans` ou setting), sem valor fixo no trigger.
- Tabela `audit_log` para governança (README, "Logs de auditoria").

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Corrigir a `001_init.sql` direto ou criar `002_fix_policies.sql`? Depende de alguém já ter aplicado a 001 em algum ambiente | dev | Sim | |
| D02 | Viewer pode reagir (update em `meta`) ou só comentar? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Migração limpa e reaplicada | integração | CA01 | `supabase db reset` e reaplicar a migração | Sem erros |
| CT02 | Reação em mensagem existente | integração | CA02 | Autenticar como editor, fazer upsert de mensagem com `meta.reactions` alterado | Linha atualizada |
| CT03 | Round-trip de campos | integração | CA03 | Inserir anotação com todos os campos, fazer select | Valores idênticos |
| CT04 | CHECK de status | integração | CA04 | Inserir `status='foo'` | Erro de constraint |
| CT05 | Índices | manual | CA05 | `EXPLAIN SELECT * FROM annotations WHERE descriptor_id = ...` | Index Scan |
| CT06 | Isolamento RLS | integração | CA06 | Autenticar como usuário sem vínculo e consultar | 0 linhas / erro |

## URL Complementar

- Documentação técnica: https://supabase.com/docs/guides/database/postgres/row-level-security
- Protótipo / mockup: N/A — mudança só de banco.
- Discussões relacionadas: README, seção "Banco de dados (tabelas principais)".
- Referências de design: N/A
- Requisitos originais: README, "Regras de negócio / RLS".
- Issue / PR relacionado: —
