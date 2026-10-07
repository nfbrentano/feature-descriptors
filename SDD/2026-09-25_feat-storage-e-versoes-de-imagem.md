# [FEAT] Imagens no Supabase Storage com histórico de versões

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Guardar as imagens das telas no Supabase Storage (não em base64 no banco/localStorage) e manter o histórico das versões de cada tela.
- **Problema e evidência:**
  - Hoje a imagem vai como data URL em `descriptors.image_path` ([storage.ts:191](../src/lib/storage.ts:191)). Cada save reenvia megabytes, e a coluna `text` fica gigante.
  - `image.version` é incrementado a cada upload ([useDescriptors.ts:293](../src/hooks/useDescriptors.ts:293)), mas a versão anterior é descartada. Não dá para ver nem restaurar a tela antiga.
  - O README pede "Upload/colar de imagem e histórico de versões da imagem (versioning)", "Storage: imagens armazenadas no Supabase Storage" e "garbage-collect de imagens órfãs".
- **Impacto de não fazer:** Sync lento e caro, limite do localStorage estourando e perda de contexto histórico quando a tela evolui.
- **Para quem é destinado:** PO que acompanha a evolução de uma tela ao longo das sprints.
- **História de usuário:** Como PO, quero subir a nova versão de uma tela sem perder a anterior, para comparar o que mudou e manter as discussões ligadas à versão certa.
- **Como saberemos que deu certo:** O payload de save de um descritivo com imagem cai de MBs para < 50 KB, e o usuário consegue restaurar qualquer versão anterior.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Bucket privado `descriptors-images` com path `users/{uid}/{descriptorId}/v{n}.{ext}` e policies de Storage alinhadas ao RLS de `descriptors` | P0 | CA01, CA06 |
| RF02 | Com usuário autenticado, o upload vai para o Storage e `image_path` guarda o path; a exibição usa signed URL com renovação | P0 | CA01 |
| RF03 | Tabela `descriptor_image_versions` (`descriptor_id`, `version`, `path`, `width`, `height`, `created_by`, `created_at`) | P0 | CA02 |
| RF04 | Seletor de versões (dropdown no rodapé do canvas, como no wireframe do README) para ver e restaurar | P1 | CA03 |
| RF05 | As anotações registram `image_version` em que foram criadas; ao ver uma versão antiga, destacar as anotações daquela versão | P1 | CA04 |
| RF06 | Excluir um descritivo remove os arquivos do Storage (Edge Function ou trigger) | P1 | CA05 |
| RF07 | Modo local continua com base64 (com as proteções de [fix-upload-de-imagem-e-limite-de-armazenamento](2026-09-25_fix-upload-de-imagem-e-limite-de-armazenamento.md)) | P0 | CA07 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhuma imagem é acessível sem autenticação e vínculo com o descritivo | P0 | CA06 |
| RNF02 | Payload de save do descritivo < 50 KB, excluindo o upload da imagem | P0 | CA01 |
| RNF03 | Máximo de 20 versões por descritivo (as mais antigas são removidas com aviso) | P2 | — |

### Dependências técnicas

- [feat-autenticacao-supabase](2026-09-25_feat-autenticacao-supabase.md), [fix-migracao-supabase](2026-09-25_fix-migracao-supabase.md).
- Nova migração `00X_storage_and_versions.sql`.

### Recursos necessários

- Permissão para criar bucket e policies no projeto Supabase.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um usuário autenticado, quando carregar uma imagem, então o arquivo aparece no bucket no path esperado e a linha de `descriptors` guarda só o path.
- [ ] **CA02:** Dado um descritivo na v1, quando o usuário carregar outra imagem, então existem as linhas v1 e v2 em `descriptor_image_versions`.
- [ ] **CA03:** Dado as versões v1 e v2, quando o usuário escolher "Restaurar v1", então o canvas volta a mostrar a v1 e é criada a v3 (cópia da v1), sem apagar a v2.
- [ ] **CA04:** Dado anotações criadas na v1, quando o usuário estiver vendo a v2, então essas anotações aparecem com indicação "criada na v1".
- [ ] **CA05:** Dado um descritivo com 3 versões, quando o usuário excluí-lo, então os 3 arquivos são removidos do bucket.
- [ ] **CA06:** Dado a URL de uma imagem, quando acessada sem sessão ou por usuário sem vínculo, então o acesso é negado. (caso negativo)
- [ ] **CA07:** Dado o modo local (sem login), quando o usuário carregar uma imagem, então ela continua em base64 e nada é enviado à rede.

## O que a atividade não inclui

- Diff visual lado a lado entre versões: motivo: complexo demais agora; fica como P2.
- CDN / transformação de imagens: motivo: prematuro.

### Considerado para o futuro (P2)

- Diff visual (slider antes/depois ou sobreposição) entre duas versões.
- Reposicionamento assistido de anotações entre versões.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Link público de leitura (README cita "public/readonly quando compartilhado via link") entra agora? | PO | Não | |
| D02 | Quantas versões manter por descritivo? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Upload no Storage | integração | CA01 | Upload autenticado | Objeto no bucket; `image_path` sem `data:` |
| CT02 | Registro de versões | integração | CA02 | 2 uploads | 2 linhas |
| CT03 | Restaurar | e2e | CA03 | Restaurar v1 | v3 criada, canvas mostra v1 |
| CT04 | Anotações por versão | integração | CA04 | Criar na v1 e ver na v2 | Badge "v1" |
| CT05 | GC | integração | CA05 | Excluir descritivo | Bucket vazio para o id |
| CT06 | Acesso negado | integração | CA06 | Buscar a signed URL com outro usuário | 403 |
| CT07 | Modo local | unit | CA07 | Upload sem sessão | Nenhuma chamada a `storage` |

## URL Complementar

- Documentação técnica: https://supabase.com/docs/guides/storage/security/access-control
- Protótipo / mockup: wireframe textual do README ("Footer: histórico de versões (dropdown)").
- Discussões relacionadas: —
- Referências de design: histórico de versões do Figma.
- Requisitos originais: README, "Funcionalidades principais" e "Boas práticas de implementação com Supabase".
- Issue / PR relacionado: —
