# [FEAT] Servidor MCP remoto para IAs de codificação consultarem os descritivos

> **Status:** Aprovada
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** Natanael Fernando Gatti Brentano · **Criada em:** 2026-09-28 · **Atualizada em:** 2026-09-28

## Detalhes da Atividade

- **O que precisa ser feito:** Criar um servidor MCP (Model Context Protocol) **remoto**, hospedado numa Supabase Edge Function, para que IAs de codificação (Claude Code, Cursor, VS Code, ChatGPT etc.) consultem direto no Supabase os descritivos criados no app: a imagem da tela, as anotações, a thread de discussão, o status e a prioridade. A conexão é feita **toda pelo navegador**: o usuário cola uma URL no cliente MCP, faz login e aprova o acesso numa tela de consentimento do próprio app (OAuth 2.1 do Supabase Auth). Conexões e uso ficam **registrados no Supabase**, e o app tem uma tela para ver e revogar. Numa segunda fase, a IA também pode devolver o andamento (mudar status, comentar na thread).
- **Problema e evidência:**
  1. A exportação Markdown v2 ([markdownExporter.ts](../src/lib/markdownExporter.ts), spec [2026-09-25_exportacao-markdown-para-ia.md](2026-09-25_exportacao-markdown-para-ia.md)) gera um retrato congelado. Comentários, novas anotações e mudanças de prioridade feitos depois da exportação não chegam à IA.
  2. O fluxo é manual: alguém exporta o `.zip`, descompacta e anexa ou cola no chat da IA. Isso se repete a cada mudança no descritivo.
  3. A IA não tem como avisar o time do que implementou. O dev precisa voltar ao app e mudar o status de cada anotação à mão.
  4. As specs em `SDD/` não conseguem apontar para o descritivo "vivo". O campo "URL Complementar" só aceita links que a IA não sabe abrir.
  5. Não há visibilidade de quais IAs têm acesso aos dados do time nem do que elas fizeram.
- **Impacto de não fazer:** A IA implementa em cima de uma versão desatualizada da discussão. O status no app fica diferente do código, o time gasta tempo reexportando e reexplicando, e não existe auditoria do acesso de IAs.
- **Para quem é destinado:** Dev que implementa uma spec com uma IA de codificação; PO que acompanha o andamento das anotações e quer saber quais IAs acessam os descritivos.
- **História de usuário:** Como dev, quero conectar minha IA de codificação ao app só colando uma URL e aprovando no navegador, para que ela busque sozinha o descritivo atualizado a partir do link citado na spec, sem que eu precise instalar nada nem exportar arquivos.
- **Como saberemos que deu certo:**
  - Da tela "Conectar IA" até a primeira tool respondendo no Claude Code: no máximo 1 comando colado + 2 cliques no navegador (login e "Permitir").
  - `get_descriptor` devolve um Markdown igual ao da exportação v2 feita no mesmo momento, incluindo mensagens da thread criadas depois da última exportação manual.
  - Toda chamada de tool aparece em `mcp_usage_log`.

## Requisitos da Atividade

### Requisitos funcionais

**Conexão e autorização (pelo navegador)**

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Servidor MCP em Supabase Edge Function (`supabase/functions/mcp`), transporte HTTP streamable, stateless (um `McpServer` novo por requisição) | P0 | CA01 |
| RF02 | O servidor publica o *protected resource metadata* e responde `401` com `WWW-Authenticate` apontando para o authorization server do Supabase, para que o cliente MCP descubra o login sozinho, só com a URL | P0 | CA01 |
| RF03 | OAuth 2.1 Server do Supabase Auth habilitado, com **Dynamic Client Registration** ligado (o cliente MCP se registra sozinho) e *authorization path* apontando para a tela de consentimento do app | P0 | CA01 |
| RF04 | Tela de consentimento `oauth/consent/`: lê `authorization_id`, exige login (reaproveita o login da spec de autenticação), mostra nome do cliente, o que ele poderá acessar e a escolha de permissão **"Somente leitura"** (padrão) ou **"Leitura e escrita"**. Chama `supabase.auth.oauth.getAuthorizationDetails` → `approveAuthorization` / `denyAuthorization` | P0 | CA02, CA03 |
| RF05 | Ao aprovar, grava/atualiza `mcp_connections` (usuário, `client_id`, nome do cliente, permissão escolhida) **antes** de chamar `approveAuthorization` | P0 | CA02 |
| RF06 | Tela **"Conectar IA"** no app: mostra a URL do servidor e os comandos prontos com botão copiar (Claude Code: `claude mcp add --transport http feature-descriptors <url>`; JSON de config para Cursor/VS Code) | P0 | CA01 |
| RF07 | Tela **"Conexões de IA"** no app: lista as conexões do usuário (cliente, permissão, criada em, último uso, nº de chamadas nos últimos 7 dias). Ações: alterar permissão e **revogar** | P0 | CA04, CA05 |
| RF08 | Em toda requisição, o servidor valida o token (via helpers do Supabase) e consulta `mcp_connections` pelo par (`user_id`, `client_id` do token). Conexão inexistente ou revogada → `401` e o cliente precisa reautorizar | P0 | CA05 |

**Tools de leitura (fase 1)**

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF09 | Tool `list_descriptors`: lista os descritivos que o usuário pode ver (dono ou colaborador), com `id`, `title`, `updated_at`, permalink, total de anotações e contagem por status. Filtros opcionais: `status`, `priority`, `query` (texto no título) | P0 | CA06, CA12 |
| RF10 | Tool `get_descriptor`: recebe `descriptor_id` **ou** um permalink (`#/d/{descriptorId}` ou `#/d/{descriptorId}/a/{annotationId}`) e devolve o Markdown v2 de `exportDescriptorToMarkdown`, com o link da imagem anotada apontando para a tool `get_screen_image` / resource | P0 | CA07, CA08, CA13 |
| RF11 | Tool `get_annotation`: recebe `descriptor_id` + `annotation_id` (ou o rótulo `A{n}`, ou um permalink de anotação) e devolve só a seção daquela observação (requisito, posição, região, status, prioridade, seletor CSS/XPath e thread completa) | P0 | CA09, CA14 |
| RF12 | Tool `get_screen_image`: devolve a imagem como conteúdo MCP `image` (base64 + mimeType). Parâmetro `annotated` (padrão `true`). A imagem anotada vem do Storage (RF14), sem render no servidor | P0 | CA10 |
| RF13 | Resources MCP: `descriptor://{id}` (Markdown v2) e `descriptor://{id}/image` (PNG anotado) | P1 | CA11 |
| RF14 | O app gera o PNG anotado (`renderAnnotatedImage`, já existe) e o envia ao Storage como `descriptors/{id}/annotated-v{image_version}.png` sempre que anotações ou imagem mudarem (com debounce, como o sync atual). Guarda em `descriptors.annotated_image_path` e `annotated_image_updated_at` | P0 | CA10, CA15 |
| RF15 | Se a imagem anotada estiver mais antiga que o último `updated_at` das anotações, `get_screen_image` devolve a mais recente disponível e avisa no texto: "Imagem anotada desatualizada: abra o descritivo no app para regenerar". Sem imagem anotada, devolve a original com o mesmo aviso | P1 | CA15 |

**Registro de uso**

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF16 | Toda chamada de tool grava uma linha em `mcp_usage_log` (usuário, conexão, tool, `descriptor_id`, `annotation_id`, `ok`/`error`, código do erro, duração em ms, data) e atualiza `mcp_connections.last_used_at` | P0 | CA16 |
| RF17 | O painel do descritivo mostra "Última leitura por IA: {cliente}, há {tempo}" a partir de `mcp_usage_log` | P2 | — |

**Escrita (fase 2)**

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF18 | Tool `update_annotation_status`: muda o status (`open` → `in_progress` → `resolved`). Só aparece e só funciona se a conexão tiver permissão "Leitura e escrita" **e** o usuário for dono, `editor` ou `admin` (RLS) | P1 | CA17, CA18 |
| RF19 | Tool `add_comment`: cria uma mensagem na thread. O autor é o usuário autenticado, e `meta` recebe `{ "source": "mcp", "client": <nome do cliente> }`. Mesmas regras de permissão do RF18 | P1 | CA19 |
| RF20 | O app mostra um selo "via IA ({cliente})" nas mensagens com `meta.source = "mcp"` | P1 | CA19 |
| RF21 | Mudanças feitas pelo MCP chegam aos clientes abertos pelo realtime que já existe (commit `5d8fffd`), sem recarregar | P1 | CA20 |
| RF22 | Tools de leitura com `readOnlyHint: true`. Tools de escrita com `readOnlyHint: false`, `destructiveHint: false`, e `idempotentHint: true` no `update_annotation_status` | P1 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Todo acesso aos dados usa o **token do próprio usuário** (RLS). A `service_role` key só é usada para gravar em `mcp_usage_log`, nunca para ler descritivos | P0 | CA12 |
| RNF02 | **Defesa em profundidade da permissão:** além da checagem no servidor (RF18), as policies de `INSERT`/`UPDATE` em `annotations` e `messages` negam escrita quando o JWT tem `client_id` e a conexão correspondente não tem permissão de escrita (função SQL `public.mcp_can_write()`) | P1 | CA18 |
| RNF03 | Nenhum token, `authorization_id` ou conteúdo de argumento livre (texto de comentário, query) é gravado em `mcp_usage_log` nem nos logs da Edge Function. Só metadados | P0 | CA16 |
| RNF04 | Uma única fonte de formatação: a Edge Function importa `markdownExporter.ts` e `types` do app (Deno aceita TS direto), sem duplicar código. O teste compara a saída do MCP com a exportação do app | P0 | CA07 |
| RNF05 | `get_descriptor` responde em < 2 s (p95) para um descritivo com 50 anotações e 200 mensagens | P1 | — |
| RNF06 | A imagem anotada é salva com no máximo 1568 px no maior lado, e o Markdown informa o fator de escala, para não estourar o contexto da IA | P1 | CA10 |
| RNF07 | Erros voltam como resultado de tool com `isError: true` e mensagem em português com a ação sugerida (ex.: "Descritivo não encontrado ou sem permissão"), nunca como stack trace | P0 | CA13, CA18 |
| RNF08 | `mcp_connections` e `mcp_usage_log` têm RLS: cada usuário lê só as próprias linhas; o dono de um descritivo também lê o uso sobre os descritivos dele. Ninguém edita `mcp_usage_log` pelo cliente | P0 | CA21 |
| RNF09 | Retenção do `mcp_usage_log`: 90 dias (job `pg_cron` que apaga linhas antigas) | P2 | — |
| RNF10 | Compatível com pelo menos Claude Code, Cursor e VS Code sem ponte. Clientes só stdio usam `mcp-remote`, documentado na tela "Conectar IA" | P1 | CA22 |

### Dependências técnicas

- **Bloqueantes:**
  - [2026-09-25_fix-migracao-supabase.md](2026-09-25_fix-migracao-supabase.md): sem as colunas `description`, `priority`, `hidden` etc. em `annotations`, o MCP devolve descritivos incompletos. Sem as policies corrigidas, a migração nem roda.
  - [2026-09-25_feat-autenticacao-supabase.md](2026-09-25_feat-autenticacao-supabase.md): a tela de consentimento exige um usuário logado no Supabase Auth, e o RLS depende de `auth.uid()`.
  - [2026-09-25_feat-storage-e-versoes-de-imagem.md](2026-09-25_feat-storage-e-versoes-de-imagem.md): o servidor remoto não tem acesso ao base64 local, então a imagem original e a anotada precisam estar no Storage.
- **Fortemente recomendada:**
  - [2026-09-25_feat-numeracao-estavel-e-permalinks.md](2026-09-25_feat-numeracao-estavel-e-permalinks.md): o formato `#/d/{id}/a/{id}` e o `seq` estável fazem "A3" significar a mesma coisa no app, na spec e no MCP. Sem ela, o RF10/RF11 aceitam só UUIDs.
- **Supabase (dashboard/config):**
  - Authentication → OAuth Server: habilitar o OAuth 2.1 Server (hoje **em beta**), ligar *Allow Dynamic OAuth Apps* e definir o *authorization path* como `/feature-descriptors/oauth/consent/`.
  - Se for usar o escopo `openid` (ID token), trocar para chaves JWT assimétricas (RS256/ES256).
  - Edge Function `mcp` com `verify_jwt` adequado ao fluxo OAuth (o próprio servidor responde o `401` de descoberta).
  - Os escopos do OAuth Server são só `openid`, `email` e `profile`, sem escopos customizados. Por isso a permissão leitura/escrita fica em `mcp_connections` (RF05), identificada pelo `client_id` que vem no token.
- **Banco (nova migração `00X_mcp.sql`):**
  - `mcp_connections (id uuid pk, user_id uuid, client_id text, client_name text, permission text check in ('read','read_write'), created_at, last_used_at, revoked_at, unique(user_id, client_id))`.
  - `mcp_usage_log (id bigserial pk, user_id uuid, connection_id uuid fk, tool text, descriptor_id uuid null, annotation_id uuid null, status text check in ('ok','error'), error_code text null, duration_ms int, created_at timestamptz default now())`, com índices em `(user_id, created_at)` e `(descriptor_id, created_at)`.
  - `descriptors.annotated_image_path text`, `descriptors.annotated_image_updated_at timestamptz`.
  - Função `public.mcp_can_write()` e ajuste das policies de escrita (RNF02).
- **Código do app:**
  - Extrair de [storage.ts](../src/lib/storage.ts) (`fetchSupabaseDescriptors`) um mapeador puro `rowsToDescriptor(descriptorRow, annotationRows, messageRows)`, sem `localStorage`, reaproveitado pelo app e pela Edge Function.
  - [markdownExporter.ts](../src/lib/markdownExporter.ts): já é puro (só importa `../types`).
  - [annotatedImage.ts](../src/lib/annotatedImage.ts): `renderAnnotatedImage` passa a ser chamado também no fluxo de sync (RF14).
  - Nova entrada multipágina do Vite, `oauth/consent/index.html`: o deploy é no GitHub Pages (`base: '/feature-descriptors/'`), que não tem rewrite de rotas. A página precisa existir como arquivo estático.
  - Novos componentes: `ConnectAIModal` (RF06), `AIConnectionsPanel` (RF07), selo "via IA" no `ThreadPanel` (RF20).
- **Edge Function:** `@modelcontextprotocol/sdk` (ou `mcp-lite`, conforme o guia *Deploy MCP servers* do Supabase), `@supabase/supabase-js`, `zod`.

### Recursos necessários

- Acesso de admin ao projeto Supabase (habilitar o OAuth Server, deploy de Edge Functions, migrações).
- Projeto Supabase de desenvolvimento, ou `supabase start` local, com pelo menos dois usuários de teste: um dono de descritivos, outro colaborador `viewer`/`editor`.
- Clientes MCP para validação: Claude Code, Cursor e MCP Inspector.
- Texto da tela de consentimento revisado pelo PO (o que a IA acessa, como revogar).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um usuário logado no app, quando ele copiar o comando da tela "Conectar IA", rodar no Claude Code e chamar qualquer tool, então o navegador abre a tela de consentimento do app sem configuração manual de client ID ou segredo.
- [ ] **CA02:** Dado a tela de consentimento aberta, quando o usuário escolher "Somente leitura" e clicar em "Permitir", então é criada uma linha em `mcp_connections` com `permission = 'read'`, o `client_id` e o nome do cliente, e o Claude Code passa a responder às tools de leitura.
- [ ] **CA03:** Dado a tela de consentimento aberta, quando o usuário clicar em "Negar", então o cliente MCP recebe erro de autorização, e nenhuma linha é criada em `mcp_connections`. (caso negativo)
- [ ] **CA04:** Dado duas conexões ativas (Claude Code e Cursor), quando o usuário abrir "Conexões de IA", então vê as duas com permissão, data de criação, último uso e nº de chamadas nos últimos 7 dias.
- [ ] **CA05:** Dado uma conexão ativa, quando o usuário clicar em "Revogar", então a próxima chamada de tool desse cliente recebe `401` e só volta a funcionar depois de nova aprovação no navegador.
- [ ] **CA06:** Dado um usuário dono de 2 descritivos e colaborador de 1, quando a IA chamar `list_descriptors`, então recebe os 3, cada um com `id`, `title`, `updated_at`, permalink e contagem por status.
- [ ] **CA07:** Dado um descritivo com 3 anotações e 2 mensagens, quando a IA chamar `get_descriptor`, então o Markdown é igual ao de `exportDescriptorToMarkdown` para os mesmos dados, exceto por `exported_at` e pelo link da imagem.
- [ ] **CA08:** Dado um permalink `…#/d/{descriptorId}/a/{annotationId}` colado na spec, quando a IA chamar `get_descriptor` com esse link, então recebe o descritivo correto.
- [ ] **CA09:** Dado um descritivo com A1, A2 e A3, quando a IA chamar `get_annotation` com `A2`, então recebe só a seção da A2, com a thread completa em ordem cronológica.
- [ ] **CA10:** Dado um descritivo salvo com 3 anotações, quando a IA chamar `get_screen_image`, então recebe um `image/png` com no máximo 1568 px no maior lado e os marcadores A1, A2 e A3 nas posições informadas pelo `get_descriptor`.
- [ ] **CA11:** Dado um cliente MCP que lista resources, quando ele abrir `descriptor://{id}`, então recebe o mesmo Markdown do CA07.
- [ ] **CA12:** Dado um descritivo em que o usuário não é dono nem colaborador, quando a IA chamar `get_descriptor` com o id dele, então recebe `isError: true` com "Descritivo não encontrado ou sem permissão", e nenhum dado vaza (nem o título). (caso negativo)
- [ ] **CA13:** Dado um `descriptor_id` que não existe ou um link malformado, quando a IA chamar `get_descriptor`, então recebe `isError: true` com mensagem clara, e a chamada seguinte com id válido funciona. (erro)
- [ ] **CA14:** Dado um descritivo sem anotações, quando a IA chamar `get_descriptor`, então o Markdown informa "Nenhuma observação registrada". Quando chamar `get_annotation` com `A1`, recebe "Anotação não encontrada". (caso-limite)
- [ ] **CA15:** Dado uma anotação alterada por um cliente que ainda não regenerou a imagem anotada, quando a IA chamar `get_screen_image`, então recebe a última imagem disponível com o aviso "Imagem anotada desatualizada". (caso-limite)
- [ ] **CA16:** Dado 3 chamadas de tool (2 com sucesso, 1 com erro), quando o usuário consultar `mcp_usage_log`, então há 3 linhas com tool, status e duração, e nenhuma contém token, texto de comentário ou query.
- [ ] **CA17:** Dado uma conexão "Leitura e escrita" e um usuário `editor`, quando a IA chamar `update_annotation_status` com `resolved` na A1, então o status muda no banco e `get_annotation` devolve `resolved`.
- [ ] **CA18:** Dado uma conexão "Somente leitura" (ou um usuário `viewer`), quando a IA tentar `update_annotation_status`, então a tool não aparece em `tools/list` ou, se chamada direto, devolve `isError: true` com "Sem permissão de escrita". Uma escrita direta via API REST com o mesmo token também é bloqueada pelo RLS. (caso negativo)
- [ ] **CA19:** Dado uma conexão "Leitura e escrita", quando a IA chamar `add_comment` na A1, então a mensagem aparece na thread com o nome do usuário e o selo "via IA (Claude Code)".
- [ ] **CA20:** Dado o app aberto num descritivo, quando a IA mudar um status pelo MCP, então o app mostra o novo status em até 3 s, sem recarregar.
- [ ] **CA21:** Dado dois usuários com conexões de IA, quando o usuário A consultar `mcp_connections` e `mcp_usage_log` pela API, então vê só as próprias linhas (e o uso sobre os descritivos dos quais é dono). (caso negativo)
- [ ] **CA22:** Dado o Cursor e o VS Code, quando configurados só com a URL do servidor, então concluem o login pelo navegador e listam as tools, igual ao Claude Code.

## O que a atividade não inclui

- Servidor MCP local via stdio / comando `login` no terminal: motivo: substituído pelo servidor remoto com OAuth no navegador (decisão da D01). Clientes só stdio usam `mcp-remote`.
- Criar, editar ou excluir descritivos e anotações pelo MCP (coordenadas, título, descrição): motivo: a spec é autoria do time. A IA consome e informa o andamento, não reescreve o requisito.
- Upload ou troca da imagem da tela pelo MCP: motivo: baixo impacto e risco de sobrescrever a referência visual do time.
- Render da imagem anotada no servidor: motivo: a Edge Function (Deno) não tem canvas nativo. O app já renderiza e envia ao Storage (RF14).
- Votos, reações e estimativas pela IA: motivo: são sinais humanos de priorização.
- Uso do MCP no modo local (descritivos só no `localStorage`): motivo: o servidor remoto não tem acesso ao navegador. Para esse caso, a exportação Markdown v2 continua sendo o caminho.
- MCP sampling e elicitation: motivo: a Edge Function é stateless e não mantém canal aberto com o cliente.
- Gerar a spec SDD automaticamente: motivo: outra iniciativa. O MCP só fornece os dados.

### Considerado para o futuro (P2)

- "Última leitura por IA" no painel do descritivo (RF17) e dashboard de uso por descritivo/cliente.
- Retenção automática de 90 dias do `mcp_usage_log` (RNF09).
- Prompts MCP `implement_descriptor` e `write_spec_from_descriptor` (gera a spec no formato de `SDD/modelo_feature.md`).
- Tool `link_pull_request`: associar PR/commit a uma anotação (integra com [2026-09-25_feat-integracao-github-issues.md](2026-09-25_feat-integracao-github-issues.md)).
- Filtro `since` em `get_descriptor` para devolver só o que mudou desde uma data.
- Client ID Metadata Documents (CIMD) no lugar de Dynamic Client Registration, quando o Supabase suportar.
- Regerar a imagem anotada no servidor (ex.: worker com canvas), eliminando o caso "desatualizada" do RF15.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Como o usuário autentica o MCP? | dev | Sim | **Decidido em 2026-09-28:** servidor MCP remoto (Supabase Edge Function, HTTP streamable) com OAuth 2.1 do Supabase Auth. Login e consentimento pelo navegador, no próprio app, com escolha "Somente leitura" / "Leitura e escrita". Conexões e uso salvos em `mcp_connections` e `mcp_usage_log`, com tela para ver e revogar. O stdio local sai do escopo. |
| D02 | Comentários da IA saem com o nome do usuário + selo "via IA", ou com um usuário "bot" separado? | PO | Não (fase 2) | Proposta: nome do usuário + selo com o nome do cliente, para manter a responsabilidade humana. |
| D03 | Anotações `hidden` aparecem para a IA? | PO | Não | Proposta: incluir, igual à exportação v2 (RF13 daquela spec). |
| D04 | A IA pode marcar `resolved` direto, ou só `in_progress`, deixando `resolved` para um humano validar? | PO | Não (fase 2) | |
| D05 | O OAuth 2.1 Server do Supabase está em beta. Aceitamos o risco de mudanças na API, ou esperamos o GA? | dev/PO | Não | Proposta: seguir. A dependência fica isolada na tela de consentimento e no middleware da Edge Function. |
| D06 | Quanto tempo o token de acesso emitido para a IA deve durar antes do refresh? | dev | Não | Proposta: manter o padrão do projeto (1 h) com refresh automático pelo cliente MCP. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Descoberta OAuth | integração | CA01 | `POST /mcp` sem token | `401` com `WWW-Authenticate` apontando para o metadata; metadata aponta para o authorization server do Supabase |
| CT02 | Conexão ponta a ponta no Claude Code | manual | CA01, CA02 | Copiar o comando de "Conectar IA" → rodar → chamar `list_descriptors` → login → "Somente leitura" → "Permitir" | Tool responde; linha em `mcp_connections` com `read` |
| CT03 | Negar consentimento | e2e (Playwright/manual) | CA03 | Abrir a tela com `authorization_id` válido → "Negar" | Cliente recebe erro; nenhuma linha nova em `mcp_connections` |
| CT04 | Tela de conexões e revogação | integração + manual | CA04, CA05 | Duas conexões → abrir "Conexões de IA" → revogar a do Cursor → chamar tool no Cursor | Lista correta; Cursor recebe `401` até reaprovar; Claude Code segue funcionando |
| CT05 | Listagem com dono e colaborador | integração (Supabase local) | CA06 | Usuário com 2 descritivos próprios e 1 compartilhado → `list_descriptors` | 3 itens com contagem por status correta |
| CT06 | Paridade com a exportação do app | unit | CA07, CA11 | Mesma fixture → `exportDescriptorToMarkdown` × `get_descriptor` × `descriptor://{id}` | Textos iguais, ignorando `exported_at` e o link da imagem |
| CT07 | Parse de permalink | unit | CA08, CA13 | `#/d/{uuid}`, `#/d/{uuid}/a/{uuid}`, URL completa com `/feature-descriptors/`, string vazia, `#/x/abc` | Os 3 primeiros resolvem os ids; os 2 últimos dão erro de link inválido |
| CT08 | Anotação por rótulo e descritivo vazio | unit | CA09, CA14 | Fixture A1–A3 → `get_annotation("A2")`; descritivo vazio → `get_annotation("A1")` | Só a A2; erro "Anotação não encontrada" |
| CT09 | Imagem anotada gerada no sync | integração | CA10 | Salvar descritivo 3840×2160 com 3 anotações no app → `get_screen_image` | PNG ≤ 1568 px com marcadores nas posições escaladas |
| CT10 | Imagem desatualizada | integração | CA15 | Alterar anotação direto no banco (sem passar pelo app) → `get_screen_image` | Última imagem + aviso "desatualizada" |
| CT11 | RLS: descritivo de outro usuário | integração (Supabase local) | CA12 | Usuário B → `get_descriptor` de um descritivo do usuário A | `isError: true`; resposta sem título nem dados |
| CT12 | Log de uso sem dados sensíveis | integração | CA16 | 2 chamadas OK + 1 com erro (incluindo `add_comment` com texto) → ler `mcp_usage_log` | 3 linhas; nenhuma coluna com token, texto do comentário ou query |
| CT13 | Permissão de escrita: servidor e RLS | integração (Supabase local) | CA17, CA18 | Conexão `read` → `tools/list` e `update_annotation_status`; mesmo token → `PATCH` REST em `annotations`; depois trocar para `read_write` e repetir | Com `read`: tool ausente, erro na chamada direta e RLS bloqueando o REST. Com `read_write` + `editor`: status muda |
| CT14 | Comentário via IA | integração + manual | CA19 | Conexão `read_write` → `add_comment` → abrir a thread no app | Mensagem com nome do usuário, selo "via IA (Claude Code)" e `meta.source = "mcp"` |
| CT15 | Realtime | manual | CA20 | App aberto → mudar status pelo Claude Code | App atualiza em até 3 s sem reload |
| CT16 | RLS das tabelas de MCP | integração (Supabase local) | CA21 | Usuário A consulta `mcp_connections` e `mcp_usage_log` via REST | Só linhas próprias e o uso sobre os próprios descritivos |
| CT17 | Outros clientes | manual | CA22 | Configurar Cursor, VS Code e MCP Inspector só com a URL | Login pelo navegador e tools listadas em todos |

## URL Complementar

- Documentação técnica:
  - Supabase: OAuth 2.1 Server (beta), https://supabase.com/docs/guides/auth/oauth-server
  - Supabase: OAuth 2.1 Server, primeiros passos (tela de consentimento, `getAuthorizationDetails`/`approveAuthorization`/`denyAuthorization`), https://supabase.com/docs/guides/auth/oauth-server/getting-started
  - Supabase: MCP Authentication, https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
  - Supabase: Deploy MCP servers em Edge Functions, https://supabase.com/docs/guides/ai-tools/byo-mcp
  - Model Context Protocol: especificação e autorização, https://modelcontextprotocol.io
- Protótipo / mockup: N/A por enquanto. As telas "Conectar IA", "Conexões de IA" e consentimento seguem o padrão visual dos modais atuais (`ExportModal`, `AuthModal`).
- Discussões relacionadas: conversa de 2026-09-28 que definiu a D01 (MCP remoto com OAuth no navegador + registro de uso no Supabase, no lugar do stdio com `login` no terminal).
- Referências de design: telas de "Aplicativos autorizados" do GitHub e do Google (lista de conexões com revogar).
- Requisitos originais: [2026-09-25_exportacao-markdown-para-ia.md](2026-09-25_exportacao-markdown-para-ia.md) (formato v2 que o MCP reaproveita).
- Issue / PR relacionado: commit `979fe2b` (exportação Markdown v2), commit `5d8fffd` (realtime Supabase).
