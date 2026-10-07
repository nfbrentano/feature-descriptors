# [FIX] Upload de imagem sem validação e estouro do localStorage

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Validar os arquivos enviados, tratar o limite do localStorage e dar feedback em todos os caminhos de falha do upload.
- **Problema e evidência:**
  - `uploadImage` e `createNewDescriptor` aceitam qualquer arquivo sem checar tipo ou tamanho ([useDescriptors.ts:293](../src/hooks/useDescriptors.ts:293)). Soltar um PDF no canvas não dá erro: o `Image` falha em silêncio (sem `onerror`).
  - As imagens viram base64 e vão para o localStorage (~5 MB por origem). Um único print de 4K em PNG (~3–6 MB em base64) já estoura a cota. `localStorage.setItem` lança `QuotaExceededError` ([storage.ts:62](../src/lib/storage.ts:62)), a exceção não é tratada, o React mostra erro e o estado em memória diverge do salvo.
  - Colar ou soltar imagem sem descritivo ativo (depois de excluir todos) não faz nada: `if (!currentDescriptor) return` ([useDescriptors.ts:303](../src/hooks/useDescriptors.ts:303)).
  - O listener de `paste` é global. Colar uma imagem dentro de um campo de texto (ex.: comentário) troca a imagem da tela sem perguntar.
  - Trocar a imagem mantém as anotações nas mesmas coordenadas relativas sem avisar, mesmo com proporção diferente.
  - O README pede "Valide e saneie uploads (tamanho/formatos)", e SVGs podem conter scripts (renderizar via `<img>` é seguro, mas exportar para HTML no futuro não seria).
- **Impacto de não fazer:** Perda de dados e crash com prints grandes (o caso de uso principal), além de ações silenciosas que confundem o usuário.
- **Para quem é destinado:** Todo usuário que carrega telas.
- **História de usuário:** Como PO, quero ser avisado quando uma imagem não puder ser usada ou salva, para não achar que meu trabalho está guardado quando não está.
- **Como saberemos que deu certo:** Carregar um PNG de 8 MB não quebra o app: ou a imagem é comprimida e salva, ou aparece um erro claro. 0 exceções não tratadas.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Aceitar só `image/png`, `image/jpeg`, `image/webp`, `image/gif` e `image/svg+xml`; rejeitar o resto com toast | P0 | CA01 |
| RF02 | Limite de tamanho de 10 MB por arquivo, com mensagem clara | P0 | CA02 |
| RF03 | Tratar `QuotaExceededError` em `saveLocalDescriptor`, retornando `{ success: false, error }` e mostrando toast com orientação (conectar Supabase / excluir descritivos) | P0 | CA03 |
| RF04 | Redimensionar/recomprimir no client imagens acima de 2560 px ou 1,5 MB (WebP/JPEG qualidade 0,85) antes de salvar localmente | P1 | CA04 |
| RF05 | Sem descritivo ativo, colar ou soltar imagem cria um descritivo novo com o nome do arquivo (respeitando o limite de 5) | P1 | CA05 |
| RF06 | Ignorar `paste` de imagem quando o foco estiver em campo editável | P0 | CA06 |
| RF07 | Ao trocar a imagem de um descritivo com anotações, pedir confirmação e avisar se a proporção mudou mais de 5% | P1 | CA07 |
| RF08 | Tratar `img.onerror` e `reader.onerror` com toast | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | 0 exceções não tratadas no console em qualquer caminho de upload | P0 | CA03 |
| RNF02 | A compressão de uma imagem 4K leva < 1,5 s num notebook comum | P1 | CA04 |

### Dependências técnicas

- `src/hooks/useDescriptors.ts`, `src/lib/storage.ts`, `src/components/CanvasViewport.tsx`, `src/components/DescriptorManagerModal.tsx`.
- Solução definitiva de armazenamento: [feat-storage-e-versoes-de-imagem](2026-09-25_feat-storage-e-versoes-de-imagem.md).

### Recursos necessários

- Imagens de teste: PNG 4K, JPEG 12 MB, SVG, PDF renomeado para `.png`.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o canvas vazio, quando o usuário soltar um PDF, então aparece o toast "Formato não suportado" e nada muda.
- [ ] **CA02:** Dado um PNG de 12 MB, quando o usuário tentar carregá-lo, então aparece o toast informando o limite de 10 MB.
- [ ] **CA03:** Dado o localStorage quase cheio, quando uma gravação estourar a cota, então aparece o toast de armazenamento cheio, o app continua funcionando e o estado em memória não diverge do salvo sem aviso.
- [ ] **CA04:** Dado um PNG 3840×2160 de 6 MB, quando o usuário carregá-lo, então a imagem salva tem no máximo 2560 px no maior lado e as coordenadas relativas das anotações continuam corretas.
- [ ] **CA05:** Dado nenhum descritivo, quando o usuário colar uma imagem, então é criado um descritivo com ela.
- [ ] **CA06:** Dado o foco no campo de comentário, quando o usuário colar uma imagem, então a imagem da tela não muda. (caso negativo)
- [ ] **CA07:** Dado um descritivo com 3 anotações, quando o usuário soltar uma nova imagem com outra proporção, então aparece um pedido de confirmação e, se cancelar, a imagem original continua.

## O que a atividade não inclui

- Upload para o Supabase Storage: motivo: outra iniciativa ([feat-storage-e-versoes-de-imagem](2026-09-25_feat-storage-e-versoes-de-imagem.md)).
- Migrar o armazenamento local para IndexedDB: motivo: complexo demais agora; entra como P2.
- Sanitização de SVG: motivo: o SVG só é renderizado via `<img>`/canvas, onde scripts não rodam.

### Considerado para o futuro (P2)

- Migrar o armazenamento local para IndexedDB (cota muito maior).
- Recorte de imagem no momento do upload.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Compressão automática é aceitável ou o PO precisa do arquivo original (pixel-perfect para medições)? | PO | Sim | |
| D02 | O limite de 10 MB serve para prints de telas longas (full-page)? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Formato inválido | unit | CA01 | `validateImageFile(pdfFile)` | `{ valid: false }` |
| CT02 | Tamanho | unit | CA02 | Arquivo mock de 12 MB | `{ valid: false, error: /10 MB/ }` |
| CT03 | Cota | unit | CA03 | Mock de `localStorage.setItem` lançando `QuotaExceededError` | Retorna `success:false`, sem throw |
| CT04 | Compressão | manual | CA04 | Carregar PNG 4K | `image.width` ≤ 2560 |
| CT05 | Sem descritivo | integração | CA05 | Excluir todos e disparar paste | 1 descritivo criado |
| CT06 | Paste em campo | integração | CA06 | Focar textarea e disparar paste | `onUploadImage` não chamado |
| CT07 | Troca com confirmação | manual | CA07 | Soltar imagem com proporção diferente e cancelar | Imagem original mantida |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: —
- Requisitos originais: README, "Boas práticas e recomendações: Valide e saneie uploads".
- Issue / PR relacionado: —
