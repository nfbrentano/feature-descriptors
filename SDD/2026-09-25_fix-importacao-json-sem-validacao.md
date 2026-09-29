# [FIX] Importação de JSON aceita dados inválidos e duplica IDs

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Validar o conteúdo importado e evitar colisão de IDs ao mesclar anotações.
- **Problema e evidência:**
  - `importAnnotationsFromJSON` ([exportUtils.ts:164](../src/lib/exportUtils.ts:164)) não valida `coords`: se o tipo é `polygon` mas as coords são de bbox, ou vêm com `NaN`/strings, o canvas quebra ao desenhar. O módulo [validators.ts](../src/lib/validators.ts) existe e está testado, mas não é usado em nenhum lugar do app.
  - Coordenadas ausentes viram `{x:0.1,y:0.1,w:0.2,h:0.2}` sem aviso.
  - O ID original é mantido (`id: item.id || ...`, [exportUtils.ts:182](../src/lib/exportUtils.ts:182)). Importar o mesmo backup duas vezes gera anotações com IDs iguais: chaves React duplicadas, e editar uma altera as duas, porque `updateAnnotation` faz `map` por id.
  - As `messages` importadas não são validadas nem têm o `annotation_id` reescrito.
  - `estimate_points: item.estimate_points || 2` inventa uma estimativa de 2 pontos quando não há nenhuma.
  - Um JSON importado com coords em pixels (> 1) é aceito e desenhado fora da imagem.
  - Não há prévia: o usuário não sabe quantas anotações serão importadas nem quais foram descartadas.
- **Impacto de não fazer:** Crash do canvas, corrupção silenciosa de dados e edição cruzada de anotações.
- **Para quem é destinado:** Usuários que restauram backups ou movem anotações entre descritivos.
- **História de usuário:** Como PO, quero importar um backup e ver o que será adicionado, para restaurar meu trabalho sem corromper o descritivo atual.
- **Como saberemos que deu certo:** Importar o mesmo JSON duas vezes resulta em IDs únicos, e JSONs inválidos nunca chegam ao canvas.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Validar cada item com `isValidAnnotation`/`isValidCoords` de `validators.ts`, descartar os inválidos e reportar quantos e por quê | P0 | CA01 |
| RF02 | Sempre gerar novos IDs (UUID) para anotações e mensagens importadas, reescrevendo `annotation_id` e `descriptor_id` | P0 | CA02 |
| RF03 | Rejeitar coordenadas fora do intervalo 0..1 (com tolerância de 0,001), com a opção "converter de pixels" quando o JSON trouxer `image.width/height` | P1 | CA03 |
| RF04 | Não inventar valores: campos ausentes ficam `undefined` (estimativa, coords) | P0 | CA04 |
| RF05 | Mostrar prévia antes de confirmar: "N válidas serão importadas, M descartadas" + lista de erros | P1 | CA05 |
| RF06 | Aceitar também o JSON completo de descritivo exportado pela aba JSON (`parseAndValidateDescriptorImport`) | P1 | CA06 |
| RF07 | Limite de 5 MB e 1000 anotações por importação | P1 | CA07 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhum JSON, válido ou não, causa exceção não tratada | P0 | CA01 |
| RNF02 | Validar 1000 anotações leva < 200 ms | P2 | — |

### Dependências técnicas

- `src/lib/exportUtils.ts`, `src/lib/validators.ts`, `src/components/ExportModal.tsx`.
- Geração de UUID definida em [fix-sincronizacao-supabase](2026-09-25_fix-sincronizacao-supabase.md) (RF01).

### Recursos necessários

- Fixtures JSON: válido, com coords inválidas, com IDs repetidos, em pixels, gigante.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um JSON com 3 anotações válidas e 1 polígono com 2 pontos, quando importado, então 3 são adicionadas, 1 é descartada com o motivo exibido e o canvas renderiza normalmente.
- [ ] **CA02:** Dado um backup importado duas vezes, quando o usuário editar o título de uma das cópias, então só aquela cópia muda.
- [ ] **CA03:** Dado anotações com `x: 480` e o JSON sem dimensões da imagem, quando importado, então elas são descartadas com o motivo "coordenadas fora do intervalo".
- [ ] **CA04:** Dado uma anotação importada sem `estimate_points`, quando exibida, então a estimativa fica vazia (não 2).
- [ ] **CA05:** Dado um JSON colado, quando o usuário clicar em "Confirmar Importação", então antes vê a contagem de válidas/descartadas e pode cancelar sem alterar nada.
- [ ] **CA06:** Dado o arquivo baixado pela aba "JSON Estruturado", quando importado, então as anotações são reconhecidas.
- [ ] **CA07:** Dado um arquivo de 20 MB, quando selecionado, então aparece um erro de tamanho e nada é importado. (caso negativo)

## O que a atividade não inclui

- Importar COCO/CSV: motivo: baixo impacto; nenhum usuário pediu.
- Substituir (em vez de mesclar) as anotações existentes: motivo: fica como P2.

### Considerado para o futuro (P2)

- Modo "substituir tudo" com confirmação.
- Importar um descritivo inteiro como descritivo novo (com imagem).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Importar um JSON com anotações já existentes (mesmo ID) deve atualizá-las em vez de duplicar? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Descarte de inválidas | unit | CA01 | Fixture 3+1 | `annotations.length === 3`, `rejected.length === 1` |
| CT02 | IDs únicos | unit | CA02 | Importar a mesma fixture 2x | Conjunto de IDs sem repetição |
| CT03 | Fora do intervalo | unit | CA03 | `x: 480` | Rejeitada |
| CT04 | Sem estimativa | unit | CA04 | Item sem `estimate_points` | `undefined` |
| CT05 | Prévia | integração | CA05 | Colar JSON e clicar em confirmar | Resumo exibido; cancelar não chama `onImportAnnotations` |
| CT06 | Descritivo completo | unit | CA06 | Importar `JSON.stringify(descriptor)` | Anotações reconhecidas |
| CT07 | Tamanho | integração | CA07 | Arquivo mock de 20 MB | Erro exibido |

## URL Complementar

- Documentação técnica: `src/lib/validators.test.ts`
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: —
- Requisitos originais: aba "Importar Anotações" do `ExportModal`.
- Issue / PR relacionado: —
