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

Especificação técnica (alto nível)
- Frontend:
  - Framework: React + TypeScript (ou Vue).
  - Canvas/Overlay: Konva.js ou Fabric.js; Annotorious para anotações sobre imagens.
  - Componentes: lista de anotações, filtros, threads, reações, votação.
  - Real-time: WebSocket (Socket.io) / Supabase Realtime / Pusher para colaboração instantânea.
  - Mobile: UI adaptada, gestos e atalhos reduzidos para toque.
  - Acessibilidade: suporte a leitores de tela e navegação por teclado.
- Backend:
  - API REST/GraphQL para CRUD de documentos, imagens, anotações, threads e versão.
  - Banco: Postgres / Supabase; armazenar coordenadas relativas e metadados.
  - Storage: S3 / Cloud Storage para imagens (versions) ou usar repositório/git se apropriado.
  - Autenticação: GitHub OAuth / SSO.
  - Integrações: webhooks e connectors para Jira / Trello / GitHub Issues / Slack.
  - Serviços AI: etapa de processamento (classificação de tag, sugestão de pontos, resumo) usando LLMs (API externa ou self-hosted).
- Exportadores:
  - Markdown (padrão), JSON (estruturado), CSV. Opções para criar Issues/cards em Jira/Trello automaticamente a partir de anotações marcadas.
- Segurança e governança:
  - Permissões por projeto/role, logs de auditoria, políticas de retenção.

Modelo de dados (exemplo JSON estendido)

```json
{
  "docId": "tela-123",
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
- Criar um esqueleto front-end (React + Konva) com upload de imagem, seleção de bbox, thread simples e exportador Markdown.
- Gerar snippets para integração com Jira/Trello e um exemplo de webhook para criar cards automaticamente.

O que eu fiz e o que vem a seguir
- Criei este README.md com a especificação completa, exemplo de export e recomendações.
- Posso agora:
  - criar o esqueleto do projeto (React + backend), com exemplos de código e dependências recomendadas, ou
  - gerar snippets e configurações para integração com Jira/Trello/GitHub/Slack.
