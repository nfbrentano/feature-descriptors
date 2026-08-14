# Ferramenta de Descritivos Técnicos (Anotações em Tela)

Resumo
- Página colaborativa para elaborar descritivos técnicos sobre telas da aplicação.
- Permite colar/arrastar uma imagem da tela, selecionar regiões/elementos, abrir threads de comentário (como no Google Docs), discutir e evoluir requisitos.
- Exporta todo o conteúdo anotado e as referências de tela para um arquivo Markdown, pronto para alimentar tarefas/agents de AI ou gerar issues/PRs.

Objetivos
- Facilitar comunicação entre Product Owner e desenvolvedores sobre telas específicas.
- Manter histórico de decisões e comentários ligados a pontos visuais da interface.
- Permitir exportação estruturada em Markdown para automações (AI agents, geração de issues, integração com ferramentas externas).

Como usar (fluxo do usuário)
1. Abra a página e cole/arraste a imagem da tela da aplicação.
2. Use a ferramenta de seleção (retângulo / polígono / anotação por ponto) para marcar um elemento ou região.
3. Ao selecionar, crie um comentário/thread associado àquela região:
   - título curto (ex: "Componente: Header - comportamento X")
   - descrição detalhada (ex: requisito, aceitação, dúvidas)
   - tags (ex: bug, enhancement, ux)
   - estimativa de esforço (pontos) sugerida manualmente ou por AI
   - responsável sugerido e prioridade
4. Outros membros (dev, PO) respondem na thread; cada resposta registra autor e timestamp. Reações, votos e resoluções por consenso são suportados.
5. Threads podem ser resolvidas/arquivadas, reabertas, ou transformadas em tasks (export/integração com Jira/Trello/GitHub).
6. Quando pronto, clique em "Exportar Markdown" para gerar um arquivo `.md` com toda a imagem referenciada e as anotações estruturadas.

Uso sem login vs com login
- Uso anonimizado: qualquer usuário pode criar e editar um descritivo temporário localmente (sessionStorage/localStorage). Não há persistência no servidor e o compartilhamento é limitado (download/export manual).
- Uso com login (recomendado): login via Supabase (credenciais, OAuth GitHub/Google). Usuários autenticados podem persistir até 5 telas/descritivos próprios no servidor, convidar outros colaboradores por e-mail ou link de acesso, e gerenciar permissões por descriptor.

Funcionalidades principais (MVP + melhorias solicitadas)
- Upload/colar de imagem (PNG/JPG/SVG) e histórico de versões da imagem (versioning).
- Canvas com overlay para selecionar regiões (retângulo, polígono, ponto).
- Threads de comentário aninhados por região (criar, responder, editar, resolver).
- Menções de usuários (@usuario), tags, e classificação automática de tag (bug/ux/enhancement) via análise de texto.
- Estimativas de esforço (pontos) — campo manual + sugestão automática por AI.
- Resolução por consenso: votos, reações (👍, 👎, etc.) e transformação de voto em decisão.
- Histórico de versões das anotações com diff visual (comparar duas versões da imagem/anotações).
- Modo apresentação (focar anotações para demo / fullscreen).
- Atalhos de teclado e suporte mobile-friendly (gestos para seleção/zoom).
- Captura automática do CSS selector / XPath do elemento (quando aplicável) para correlacionar com o código.
- Heatmap de comentários/áreas mais discutidas (visualização agregada).
- Links diretos/permalinks para cada anotação (para inclusão em PRs/Issues).
- Exportador Markdown (imagem + lista de anotações com coordenadas, threads, metas).
- Controle de permissões: leitura, escrita, administrador.
- Integração/sincronização com Jira / Trello e criação automática de issues/cards a partir de anotações marcadas.
- Persistência e autenticação via Supabase (ver seção abaixo).

Exemplo de Export (formato Markdown gerado)

```markdown
# Tela: Cadastro de Usuário
![cadastro](assets/cadastro_v1.png)

## Anotações
### A1 — "Campo Email - validação" (bbox: x=120,y=80,w=340,h=48)
Tags: bug, validação  (classificado automaticamente)  
Estimativa: 3 pontos  (sugestão AI: 3)  
Responsável sugerido: @dev-ana  
Status: aberto

- PO (2026-08-14 09:12): "Registrar que o campo deve aceitar emails com subdomínios e exibir erro inline."
- Dev (2026-08-14 09:20): "Ok — qual mensagem de erro exatamente? Sugiro: 'Insira um e‑mail válido'."
- PO (2026-08-14 09:25): "Usar: 'Insira um e‑mail válido (ex: nome@exemplo.com)'."

Metadados técnicos: css_selector: "#signup-form input[name='email']", xpath: "/html/body/..."
---

### A2 — "Botão Enviar - loading" (point: x=560,y=420)
Tags: enhancement, ux  
Estimativa: 2 pontos  
Status: resolvido

- PO (2026-08-14 10:00): "Adicionar feedback visual de loading."
- Dev (2026-08-14 11:15): "Implementado, ver PR #123."

---

## Heatmap
- Áreas mais comentadas: topo-esquerdo (formulário), rodapé (botões secundários)

## Metadados
- Exportado por: @nfbrentano
- Exportado em: 2026-08-14T11:35:00Z
- Versão imagem: cadastro_v1.png
```

Dados exportados incluídos
- Referência da imagem (path/URL ou base64 inline, opcional) e versão.
- Para cada anotação:
  - id, tipo (bbox/ponto/polígono), coordenadas relativas (x,y,w,h ou array de pontos).
  - título, tags (incluindo classificação automática), responsável, estimativa de esforço (pontos), status.
  - css_selector / xpath (quando aplicável).
  - thread: lista de mensagens (autor, timestamp, conteúdo) e reações/votos.
- Metadata do documento: autor da exportação, timestamp, versão da imagem.
- Heatmap agregado das áreas mais comentadas.

Integração com Supabase (autenticação e persistência)
- Objetivo: permitir login (opcional) e persistir até 5 descritivos por usuário autenticado, além de oferecer convite/compartilhamento colaborativo.

Arquitetura resumida
- Client (frontend React/TS): usa Supabase JS client para autenticação (email/password, OAuth GitHub/Google) e para chamadas à DB via Row Level Security (RLS) configurada.
- Backend (opcional): endpoints serverless para ações específicas (ex: exportação em lote, processamento por LLM); pode ser implementado com Supabase Functions ou outro backend.
- Storage: imagens armazenadas no Supabase Storage (buckets) ou em S3/Cloud Storage externo; o DB guarda referências (url, path, version).

Banco de dados (tabelas principais)
- users (mantido pelo Supabase Auth)
- descriptors
  - id (uuid)
  - owner_id (auth.uid)
  - title
  - image_path
  - image_version
  - metadata (jsonb)
  - created_at, updated_at
- annotations
  - id (uuid)
  - descriptor_id (fk)
  - type (bbox/point/polygon)
  - coords (jsonb)
  - title, tags (text[]), estimate_points
  - css_selector, xpath
  - status, owner (user id)
  - created_at, updated_at
- threads/messages
  - id, annotation_id, author_id, content, created_at
- collaborators
  - id, descriptor_id, user_id, role (viewer/editor/admin), invited_by, accepted_at

Regras de negócio / RLS
- Usuarios autenticados podem criar descriptors até um limite de 5 (enforced por trigger ou policy que conta descriptors por owner_id).
- Dono do descriptor e colaboradores com role editor/admin podem criar/editar annotations e threads.
- Acesso público (sem login): leitura/uso em sessão local; criação de descriptor salva apenas localmente até o login.

Fluxos principais
- Criar descriptor (usuário autenticado): faz upload da imagem para Storage, cria registro em descriptors, set owner_id.
- Convidar colaborador: insere linha em collaborators com role e envia e-mail/link de convite via Supabase Functions / external service.
- Limite de 5 descriptors: ao criar novo descriptor, checar contador; se exceder, oferecer opção de remover descriptor antigo ou fazer upgrade (se houver modelo de pagamento).

Exemplo de código (frontend) - esboço

```ts
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// sign in
await supabase.auth.signInWithOAuth({ provider: 'github' })

// upload image
const { data, error } = await supabase.storage
  .from('descriptors-images')
  .upload(`users/${user.id}/${descriptorId}/v1.png`, file)

// insert descriptor
await supabase.from('descriptors').insert([{ id: descriptorId, owner_id: user.id, title, image_path: data.path }])
```

Boas práticas de implementação com Supabase
- Use Row Level Security (RLS) para garantir que apenas donos/colaboradores acessem ou modifiquem registros.
- Crie uma policy que valide o limite de 5 descriptors por usuário (trigger ou function que retorna erro ao exceder).
- Use Supabase Storage para imagens com CORS configurado e políticas de privatização por padrão (public/readonly quando compartilhado via link).
- Envie convites por email via SMTP/SendGrid ou via Supabase Edge Functions integradas.
- Periodicamente garbage-collect imagens órfãs quando descriptors são excluídos.

Modelo de dados (exemplo JSON estendido)

```json
{
  "docId": "tela-123",
  "owner_id": "user-uuid",
  "image": {
    "url": "https://.../cadastro_v1.png",
    "width": 1440,
    "height": 900,
    "version": 3
  },
  "annotations": [
    {
      "id": "A1",
      "type": "bbox",
      "coords": { "x": 0.083, "y": 0.089, "w": 0.236, "h": 0.053 },
      "title": "Campo Email - validação",
      "tags": ["bug","validação"],
      "tag_confidence": 0.92,
      "estimate_points": 3,
      "estimate_source": "ai_suggestion",
      "owner": "dev-ana",
      "status": "open",
      "css_selector": "#signup-form input[name='email']",
      "xpath": "/html/body/...",
      "thread": [
        { "author": "po-joao", "ts": "2026-08-14T09:12:00Z", "text": "Registrar que..." }
      ],
      "votes": { "yes": 3, "no": 0 },
      "reactions": { "thumbs_up": 2 }
    }
  ],
  "collaborators": [
    { "user_id": "user-uuid-2", "role": "editor", "invited_by": "user-uuid", "accepted_at": "2026-08-14T10:00:00Z" }
  ],
  "heatmap": { "buckets": [] },
  "metadata": { "createdBy": "nfbrentano", "createdAt": "2026-08-14T09:10:00Z" }
}
```

Possíveis integrações e melhorias (priorizadas)
- Integrações imediatas:
  - Sincronização / criação automática de cards: Jira / Trello.
  - Criar GitHub Issue/PR automaticamente com link para a anotação.
  - Notificações em Slack / MS Teams ao criar/atualizar anotações.
- AI features:
  - Classificação automática de tag (bug/ux/enhancement) por texto.
  - Sugestão de estimativas de esforço (pontos) com justificativa.
  - Resumo automático de threads e geração de critérios de aceitação.
  - Geração de tasks ou testes de aceitação (BDD) a partir das anotações.
- Colaboração e UX:
  - Resolução por consenso (votos), reações em comentários.
  - Histórico de versões e diff visual entre versões da imagem/anotações.
  - Modo apresentação (focar anotações para demo).
  - Atalhos de teclado e versão mobile-friendly.
- Dados enriquecidos:
  - Captura automática do CSS selector / XPath do elemento.
  - Integração com Figma / design system para mapear componentes.
  - Heatmap das áreas mais discutidas.
- Governança:
  - Logs de auditoria, políticas de retenção e compliance export.

Pequeno wireframe/estrutura de página (texto)
- Header: nome do projeto + botão "Exportar Markdown" + botão "Salvar versão" + botão "Modo apresentação"
- Lado esquerdo: lista de anotações / filtros (tags, status, responsável, estimativa)
- Centro: imagem com overlay (canvas) e toolbar (retângulo, polígono, ponto, mover, zoom, heatmap toggle)
- Lado direito: thread de comentários (quando uma anotação está selecionada) com reações, votos e ações rápidas (transformar em issue/card)
- Footer: histórico de versões (dropdown) + link para integrações (Jira/Trello/GitHub/Slack)

Boas práticas e recomendações (essenciais)
- Salve coordenadas relativas (percentual) para manter anotações consistentes entre tamanhos/resoluções.
- Mantenha exportação legível e estruturada para facilitar ingestion por agents (Markdown + JSON).
- Versione imagens e anotações; permita diff visual e restauração de versões.
- Forneça permalinks para anotações (facilita inclusão em PRs e comunicação).
- Valide e saneie uploads (tamanho/formatos) e controle acesso às imagens sensíveis.
- Log de mudanças para auditoria (quem alterou, o quê e quando).
- Ao capturar CSS/XPath, indique confiança/qualificador (ex: capturado por extensão, manual, heurística).

Próximos passos que posso ajudar a fazer agora
- Gerar o arquivo `index.md` ou `README.md` pronto com esse conteúdo para colar no GitHub Pages.
- Criar um esqueleto front-end (React + Konva) com upload de imagem, seleção de bbox, thread simples e exportador Markdown, integrado com Supabase auth/storage.
- Gerar snippets para integração com Jira/Trello e um exemplo de webhook para criar cards automaticamente.

O que eu fiz e o que vem a seguir
- Atualizei o README.md para incluir a integração com Supabase (autenticação, armazenamento, limite de 5 descriptors por usuário, convite e colaboração).
- Posso agora:
  - criar o esqueleto do projeto (React + backend), com exemplos de código e dependências recomendadas, ou
  - configurar exemplos de policies RLS e migrations SQL para Supabase se quiser que eu adicione isso ao repositório.
