# [FEAT] Transformar anotação em GitHub Issue

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** A partir de uma anotação, abrir uma issue no GitHub já preenchida (título, corpo com requisito, thread, coordenadas e link), e guardar a referência da issue na anotação.
- **Problema e evidência:**
  - O README lista "Threads podem ser... transformadas em tasks (export/integração com Jira/Trello/GitHub)" e "Criar GitHub Issue/PR automaticamente com link para a anotação". O i18n já tem `export.github: 'Formato GitHub Issue'`, mas nada disso está implementado.
  - Hoje o fluxo é: exportar o Markdown inteiro, copiar o trecho da anotação e colar numa issue nova à mão.
- **Impacto de não fazer:** O objetivo central de "facilitar a comunicação PO → dev" para no meio: o requisito não chega ao backlog sem trabalho manual.
- **Para quem é destinado:** PO que transforma anotações em tarefas; devs que recebem as issues.
- **História de usuário:** Como PO, quero criar uma issue a partir de uma anotação com um clique, para levar o requisito ao backlog sem copiar e colar.
- **Como saberemos que deu certo:** Criar uma issue a partir de uma anotação leva ≤ 3 cliques, e a anotação passa a mostrar o link `#123`.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Botão "Criar issue" no `ThreadPanel` que abre `https://github.com/{owner}/{repo}/issues/new?title=…&body=…&labels=…` (sem token, usando a sessão do usuário no GitHub) | P0 | CA01 |
| RF02 | Corpo gerado a partir do exportador Markdown de uma anotação só (requisito, tags, estimativa, thread, css_selector/xpath, permalink) | P0 | CA02 |
| RF03 | Repositório padrão configurável por descritivo (`metadata.github_repo = "owner/repo"`) | P0 | CA03 |
| RF04 | Campo `external_links` na anotação para colar ou guardar a URL da issue criada, exibida como chip clicável | P1 | CA04 |
| RF05 | Corpo truncado com segurança quando a URL passar de ~8 000 caracteres, com aviso e opção "copiar corpo completo" | P0 | CA05 |
| RF06 | Aba "GitHub Issue" no `ExportModal` com o Markdown de todas as anotações no formato de issue (checklist) | P1 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhum token do GitHub é pedido ou armazenado nesta fase | P0 | CA01 |
| RNF02 | Parâmetros de URL codificados com `encodeURIComponent` | P0 | CA05 |

### Dependências técnicas

- Exportador Markdown reformulado ([exportacao-markdown-para-ia](2026-09-25_exportacao-markdown-para-ia.md)): reaproveitar a seção por observação no corpo da issue.
- Permalinks ([feat-numeracao-estavel-e-permalinks](2026-09-25_feat-numeracao-estavel-e-permalinks.md)) para incluir o link de volta.

### Recursos necessários

- Repositório de teste no GitHub.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um descritivo com repositório configurado, quando o usuário clicar em "Criar issue" na A3, então abre uma nova aba do GitHub com a issue preenchida, pronta para enviar.
- [ ] **CA02:** Dado a A3 com descrição, 2 tags e 3 comentários, quando a issue for pré-visualizada, então o corpo contém a descrição, as tags como labels, os 3 comentários e os metadados técnicos.
- [ ] **CA03:** Dado um descritivo sem repositório configurado, quando o usuário clicar em "Criar issue", então é pedido o `owner/repo`, que fica salvo para as próximas.
- [ ] **CA04:** Dado que o usuário colou a URL da issue criada, quando a anotação for exibida, então aparece o chip "#123" que abre a issue.
- [ ] **CA05:** Dado uma thread com 50 comentários longos, quando o usuário criar a issue, então a URL não passa do limite, o corpo termina com "(conteúdo truncado)" e aparece a opção de copiar o texto completo.
- [ ] **CA06:** Dado um valor `owner/repo` inválido (ex.: "foo"), quando salvo, então é rejeitado com mensagem de formato. (caso negativo)

## O que a atividade não inclui

- Criação via API com OAuth/token (sem abrir o navegador): motivo: exige backend para guardar o token com segurança; fica como P2.
- Jira/Trello: motivo: outra iniciativa; o padrão de "abrir URL pré-preenchida" pode ser reaproveitado.
- Sincronizar o status da issue com a anotação: motivo: exige webhook/backend.

### Considerado para o futuro (P2)

- Criação via GitHub App + Edge Function, com sincronização do status (issue fechada → anotação resolvida).
- Jira/Trello com o mesmo modelo de template.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A imagem/recorte da região deve ir para a issue? (Por URL não dá para anexar; exigiria Storage público) | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | URL gerada | unit | CA01 | `buildGithubIssueUrl(ann, 'o/r')` | Começa com `https://github.com/o/r/issues/new?` |
| CT02 | Corpo | unit (snapshot) | CA02 | Anotação completa | Contém descrição, tags, comentários |
| CT03 | Repo ausente | integração | CA03 | Clicar sem repo | Prompt exibido; valor salvo em metadata |
| CT04 | Chip | integração | CA04 | Salvar a URL | Chip "#123" |
| CT05 | Truncamento | unit | CA05 | Thread gigante | `url.length <= 8000` |
| CT06 | Validação de repo | unit | CA06 | `isValidRepo('foo')` | false |

## URL Complementar

- Documentação técnica: https://docs.github.com/issues/tracking-your-work-with-issues/creating-an-issue#creating-an-issue-from-a-url-query
- Protótipo / mockup: —
- Discussões relacionadas: —
- Referências de design: —
- Requisitos originais: README, "Possíveis integrações e melhorias: Criar GitHub Issue/PR automaticamente".
- Issue / PR relacionado: —
