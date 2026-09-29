# [FIX] Desfazer/Refazer não persiste e registra cada tecla

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Fazer o Ctrl+Z/Ctrl+Y gravar o estado resultante e agrupar edições de texto em passos que façam sentido.
- **Problema e evidência:**
  - `undo`/`redo` de `useHistory` ([history.ts](../src/lib/history.ts)) só mudam o estado React. Nada chama `saveLocalDescriptor` nem o Supabase. Se o usuário desfizer uma exclusão e recarregar a página, a anotação continua excluída. Se desfizer uma criação e recarregar, ela reaparece.
  - Cada tecla nos campos do `ThreadPanel` gera uma entrada no histórico (`setDescriptors` em `syncDescriptor`). Para desfazer um título de 30 caracteres é preciso apertar Ctrl+Z 30 vezes.
  - `removeDescriptor` apaga do localStorage na hora, mas registra no histórico. O undo traz o descritivo de volta na tela, mas ele não é regravado.
  - O histórico não tem limite. Com imagens em base64 dentro de cada snapshot, a memória cresce sem controle.
  - O histórico é global (todos os descritivos). Um undo pode desfazer uma mudança de outro descritivo, que não está na tela.
- **Impacto de não fazer:** Estado inconsistente entre tela e armazenamento, perda de dados ao recarregar e desfazer praticamente inutilizável em textos.
- **Para quem é destinado:** Qualquer usuário que edita anotações.
- **História de usuário:** Como PO, quero desfazer uma ação por vez e ter certeza de que o resultado fica salvo, para corrigir erros sem medo de perder dados.
- **Como saberemos que deu certo:** Desfazer uma edição de título de 30 caracteres leva 1 Ctrl+Z, e o estado após undo/redo sobrevive a um reload.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Depois de `undo`/`redo`, persistir os descritivos afetados (local + remoto, se configurado) | P0 | CA01, CA02 |
| RF02 | Agrupar edições consecutivas do mesmo campo da mesma anotação em uma entrada (janela de 800 ms ou blur do campo) | P0 | CA03 |
| RF03 | `removeDescriptor` desfeito regrava o descritivo; `createNewDescriptor` passa pelo histórico de forma consistente | P0 | CA04 |
| RF04 | Limitar o histórico a 50 entradas | P1 | CA05 |
| RF05 | Histórico por descritivo: trocar de descritivo não permite desfazer ações de outro | P1 | CA06 |
| RF06 | Mostrar toast curto "Desfeito: <ação>" com o nome da ação | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Undo/redo responde em < 50 ms com 50 anotações | P1 | CA05 |
| RNF02 | Os snapshots não duplicam a string da imagem base64 (compartilham a referência) | P1 | CA05 |

### Dependências técnicas

- `src/lib/history.ts`, `src/hooks/useDescriptors.ts`.
- Interage com o debounce de [fix-sincronizacao-supabase](2026-09-25_fix-sincronizacao-supabase.md) (RF04 de lá).

### Recursos necessários

- N/A: sem dependências externas.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que o usuário excluiu uma anotação, quando apertar Ctrl+Z e recarregar a página, então a anotação continua lá.
- [ ] **CA02:** Dado que o usuário criou uma anotação, quando apertar Ctrl+Z e recarregar, então ela não reaparece.
- [ ] **CA03:** Dado que o usuário digitou "Botão salvar" no título, quando apertar Ctrl+Z uma vez, então o título volta ao valor anterior inteiro.
- [ ] **CA04:** Dado que o usuário excluiu um descritivo, quando apertar Ctrl+Z e recarregar, então o descritivo volta com as anotações.
- [ ] **CA05:** Dado 60 ações seguidas, quando o usuário apertar Ctrl+Z repetidamente, então consegue desfazer no máximo 50 e o botão fica desabilitado depois disso.
- [ ] **CA06:** Dado uma edição no descritivo A, quando o usuário trocar para o B e apertar Ctrl+Z, então nada muda no A. (caso negativo)

## O que a atividade não inclui

- Histórico persistido entre sessões: motivo: baixo impacto; o undo é de sessão.
- Painel visual de histórico: motivo: prematuro; ver versões de imagem em [feat-storage-e-versoes-de-imagem](2026-09-25_feat-storage-e-versoes-de-imagem.md).

### Considerado para o futuro (P2)

- Histórico de versões das anotações com diff visual (README).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Enviar mensagem na thread deve ser desfazível? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Undo persiste exclusão | integração (hook + localStorage) | CA01 | Excluir, undo, ler `getLocalDescriptors()` | Anotação presente |
| CT02 | Undo persiste criação | integração | CA02 | Criar, undo, ler localStorage | Anotação ausente |
| CT03 | Agrupamento de digitação | unit (fake timers) | CA03 | 12 updates de título em < 800 ms e undo | Título original |
| CT04 | Descritivo restaurado | integração | CA04 | `removeDescriptor`, undo, ler localStorage | Descritivo presente |
| CT05 | Limite 50 | unit | CA05 | 60 `set` + 60 `undo` | `canUndo` false após 50 |
| CT06 | Escopo por descritivo | unit | CA06 | Editar A, trocar para B, undo | A inalterado |

## URL Complementar

- Documentação técnica: `src/lib/history.test.ts`
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: comportamento de undo do Figma/Google Docs (agrupamento por digitação).
- Requisitos originais: `messages.header.undo` em [i18n.ts](../src/lib/i18n.ts).
- Issue / PR relacionado: —
