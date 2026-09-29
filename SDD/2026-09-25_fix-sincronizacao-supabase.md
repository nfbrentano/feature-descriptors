# [FIX] Sincronização com Supabase falha em silêncio e perde dados

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Fazer a sincronização local ↔ Supabase funcionar de ponta a ponta, com erros visíveis e sem sobrescrever edições.
- **Problema e evidência:**
  1. **IDs incompatíveis:** o app gera IDs como `ann-1727...-ab12`, `desc-...` e `msg-...` ([useDescriptors.ts:213](../src/hooks/useDescriptors.ts:213), [:337](../src/hooks/useDescriptors.ts:337), [ThreadPanel.tsx:44](../src/components/ThreadPanel.tsx:44)), e o usuário local é `local-user-xxxx`. As colunas do banco são `uuid`, então todo upsert falha com `invalid input syntax for type uuid`.
  2. **Erro engolido:** `saveSupabaseDescriptor` retorna `{ success: false }` em vez de lançar ([storage.ts:204](../src/lib/storage.ts:204)). Com isso o `withRetry` ([useDescriptors.ts:193](../src/hooks/useDescriptors.ts:193)) nunca tenta de novo e o usuário nunca fica sabendo que a sincronização falhou. O indicador do Header continua mostrando "sincronizado".
  3. **Exclusões não propagam:** `deleteAnnotation` e `removeDescriptor` só fazem upsert do que sobrou. Nada é apagado no banco, e depois do reload as anotações excluídas voltam.
  4. **Sync a cada tecla:** editar título ou descrição no `ThreadPanel` chama `updateAnnotation` a cada caractere, e cada chamada faz 2 selects + 1 upsert do descritivo + 1 upsert por anotação + 1 por mensagem.
  5. **Eco do realtime:** o próprio save dispara eventos realtime, que chamam `reloadFromSupabase(true)` ([useDescriptors.ts:413](../src/hooks/useDescriptors.ts:413)). Isso substitui o estado local enquanto o usuário ainda digita (perde caracteres) e empilha entradas no histórico de undo.
  6. **Realtime não liga após conectar:** o `useEffect` da inscrição depende só de `reloadFromSupabase`, e configurar o Supabase pelo `AuthModal` não muda essa referência. O realtime só começa a funcionar depois de recarregar a página.
  7. **Leitura N+1:** `fetchSupabaseDescriptors` faz uma query por descritivo e outra por anotação ([storage.ts:72](../src/lib/storage.ts:72)).
  8. **Reload descarta dados locais:** `setDescriptors(list)` troca a lista inteira. Descritivos que só existem no local somem da tela.
- **Impacto de não fazer:** A funcionalidade "sincronização em nuvem e colaboração em tempo real" anunciada no `AuthModal` não funciona, e o usuário pode perder trabalho achando que está salvo.
- **Para quem é destinado:** Usuários que conectam um projeto Supabase (PO e devs colaborando).
- **História de usuário:** Como PO, quero que minhas anotações fiquem salvas na nuvem e que eu seja avisado quando isso falhar, para não perder trabalho nem confiar num status falso.
- **Como saberemos que deu certo:** Com duas abas abertas no mesmo projeto, criar, editar e excluir anotações na aba A aparece na aba B em até 2 s, sem perda de caracteres na aba A e sem erros no console.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar todos os IDs novos com `crypto.randomUUID()` e migrar os IDs legados do localStorage para UUID na primeira carga, mantendo um mapa de referência | P0 | CA01 |
| RF02 | `saveSupabaseDescriptor` lança erro em falha; `syncDescriptor` mostra toast de erro e o Header exibe o estado "falha ao sincronizar" (`messages.header.syncError`) | P0 | CA02 |
| RF03 | Propagar exclusões: `delete` de anotações/mensagens removidas e do descritivo excluído | P0 | CA03 |
| RF04 | Debounce de 600 ms na gravação remota das edições de texto (título, descrição, campos meta). A gravação local continua imediata | P0 | CA04 |
| RF05 | Ignorar eventos realtime originados pela própria sessão (comparar `updated_at`/versão ou um `client_id` em `metadata`) e não aplicar reload remoto sobre um campo em edição | P0 | CA05 |
| RF06 | (Re)inscrever o canal realtime quando a configuração do Supabase mudar, sem precisar recarregar a página | P1 | CA06 |
| RF07 | Ler descritivos + anotações + mensagens com uma única query aninhada (`select('*, annotations(*, messages(*))')`) | P1 | CA07 |
| RF08 | O reload remoto faz merge por `id` + `updated_at` (o mais recente vence) em vez de trocar a lista, e não gera entrada no histórico de undo | P1 | CA08 |
| RF09 | Filtrar o canal realtime pelos `descriptor_id` do usuário | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Editar a descrição (≈100 teclas) gera no máximo 3 requisições de escrita ao Supabase | P0 | CA04 |
| RNF02 | 0 erros no console durante o fluxo criar → editar → excluir com Supabase configurado | P0 | CA01, CA03 |
| RNF03 | O app continua 100% funcional offline/sem Supabase (fallback local inalterado) | P0 | CA09 |

### Dependências técnicas

- [2026-09-25_fix-migracao-supabase.md](2026-09-25_fix-migracao-supabase.md): policies válidas e colunas novas.
- [2026-09-25_feat-autenticacao-supabase.md](2026-09-25_feat-autenticacao-supabase.md): `owner_id` precisa ser o `auth.uid()` real para o RLS aceitar escritas.
- `src/lib/storage.ts`, `src/hooks/useDescriptors.ts`, `src/lib/debounce.ts` (já existe e não é usado).

### Recursos necessários

- Projeto Supabase de teste com a migração corrigida aplicada.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o Supabase configurado e um usuário autenticado, quando ele criar um descritivo, uma anotação e um comentário, então as três linhas aparecem no banco com IDs UUID válidos e não há erro no console.
- [ ] **CA02:** Dado o Supabase fora do ar (URL inválida), quando o usuário editar uma anotação, então aparece um toast de erro de sincronização, o Header mostra o estado de falha e a alteração continua salva localmente.
- [ ] **CA03:** Dado uma anotação sincronizada, quando o usuário excluí-la e recarregar a página, então ela não volta.
- [ ] **CA04:** Dado o painel de uma anotação aberto, quando o usuário digitar 100 caracteres na descrição, então saem no máximo 3 requisições de escrita ao Supabase.
- [ ] **CA05:** Dado o usuário digitando no título, quando chegar o eco realtime do próprio save, então nenhum caractere se perde e o cursor não pula.
- [ ] **CA06:** Dado o app aberto sem Supabase, quando o usuário conectar pelo `AuthModal` e outra aba alterar uma anotação, então a mudança aparece sem recarregar a página.
- [ ] **CA07:** Dado 5 descritivos com 20 anotações cada, quando o app carregar do Supabase, então é feita 1 requisição de leitura (não 1 + 5 + 100).
- [ ] **CA08:** Dado um reload remoto, quando o usuário apertar Ctrl+Z, então a última edição local é desfeita, e não o reload.
- [ ] **CA09:** Dado o Supabase não configurado, quando o usuário usar o app, então nenhuma requisição de rede ao Supabase é feita e tudo funciona como hoje. (caso negativo)

## O que a atividade não inclui

- Resolução de conflitos com CRDT/OT (edição simultânea do mesmo campo): motivo: complexo demais agora; last-write-wins por `updated_at` basta para o MVP.
- Fila offline persistente com reenvio automático: motivo: prematuro; o toast de erro + o dado local cobrem o essencial.
- Upload de imagens para o Storage: motivo: outra iniciativa ([feat-storage-e-versoes-de-imagem](2026-09-25_feat-storage-e-versoes-de-imagem.md)).

### Considerado para o futuro (P2)

- Presença em tempo real (quem está vendo o descritivo) via Supabase Presence.
- Fila offline com retry exponencial persistido em IndexedDB.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Ao conectar o Supabase pela primeira vez, subir os descritivos locais existentes ou começar vazio? | PO | Sim | |
| D02 | Se o usuário local tiver 5 descritivos e a nuvem também tiver 5, qual lista prevalece? | PO | Sim | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | IDs UUID | unit | CA01 | Chamar `createAnnotation` e validar o id com regex UUID v4 | Match |
| CT02 | Migração de IDs legados | unit | CA01 | Popular o localStorage com `ann-123-abcd` e carregar o hook | IDs convertidos, referências `descriptor_id`/`annotation_id` consistentes |
| CT03 | Erro visível | unit (mock supabase) | CA02 | Mock de upsert retornando erro | `withRetry` tenta 2x e o toast de erro é chamado |
| CT04 | Exclusão propagada | integração | CA03 | Criar, excluir e fazer fetch | Anotação ausente |
| CT05 | Debounce | unit (fake timers) | CA04 | 100 `updateAnnotation` em 5 s | ≤ 3 chamadas a `saveSupabaseDescriptor` |
| CT06 | Eco realtime | e2e | CA05 | Digitar continuamente com Supabase ativo | Texto final idêntico ao digitado |
| CT07 | Reinscrição | e2e | CA06 | Conectar via modal e alterar em outra aba | Atualiza sem reload |
| CT08 | Query única | unit (spy) | CA07 | Espionar `supabase.from` no fetch | 1 chamada |
| CT09 | Undo após reload | unit | CA08 | Editar, disparar reload remoto e dar undo | A edição local é desfeita |
| CT10 | Sem Supabase | unit | CA09 | Sem config, executar o fluxo completo | `getSupabase` retorna null, zero chamadas de rede |

## URL Complementar

- Documentação técnica: https://supabase.com/docs/guides/realtime/postgres-changes · https://supabase.com/docs/reference/javascript/select
- Protótipo / mockup: N/A
- Discussões relacionadas: commit `5d8fffd` (realtime com debounce).
- Referências de design: N/A
- Requisitos originais: README, "Integração com Supabase".
- Issue / PR relacionado: —
