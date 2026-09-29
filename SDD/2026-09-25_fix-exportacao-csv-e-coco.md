# [FIX] Exportações CSV e COCO com dados incorretos e risco de injeção

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Corrigir os exportadores CSV e COCO em [exportUtils.ts](../src/lib/exportUtils.ts) e o nome dos arquivos baixados, para que a saída seja fiel aos dados e segura de abrir.
- **Problema e evidência:**
  - **CSV:**
    - Vulnerável a CSV/formula injection: um título `=HYPERLINK("http://...")` é executado ao abrir no Excel/Sheets (`escapeCsv` só escapa aspas, [exportUtils.ts:48](../src/lib/exportUtils.ts:48)).
    - `estimate_points || 0` exporta 0 quando não há estimativa (deveria ser vazio).
    - Não inclui BOM UTF-8, então o Excel mostra acentos corrompidos ("AnotaÃ§Ã£o").
    - `freehand` sai com x/y = 0; polígono só traz o 1º vértice.
    - Faltam as colunas XPath, Prioridade, Rótulo e nº de comentários.
  - **COCO:**
    - O polígono sai com `bbox: [0,0,0,0]` e `area: 0` ([exportUtils.ts:131](../src/lib/exportUtils.ts:131)), o que é inválido para treino.
    - `freehand` sai sem `bbox`/`segmentation`.
    - O mapa de categorias é recalculado a cada anotação (O(n²)).
  - **Nome do arquivo:** `title.toLowerCase().replace(/[^a-z0-9]/g, '_')` no [ExportModal](../src/components/ExportModal.tsx) apaga os acentos ("Cadastro de Usuário" → `cadastro_de_usu_rio`).
  - O `ExportModal` gera todos os formatos a cada render, mesmo mostrando só um.
- **Impacto de não fazer:** Planilhas com dados errados ou acentos quebrados, datasets COCO inválidos e um vetor de ataque ao abrir o CSV.
- **Para quem é destinado:** PO/gestores que levam as anotações para planilhas; times que usam o COCO para visão computacional.
- **História de usuário:** Como PO, quero abrir o CSV no Excel com acentos corretos e sem risco, para planejar a sprint a partir das anotações.
- **Como saberemos que deu certo:** Testes unitários cobrem os 4 tipos de anotação no CSV e no COCO, e um título malicioso não executa fórmula no Sheets.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | CSV: prefixar com `'` células que começam com `=`, `+`, `-`, `@`, tab ou CR | P0 | CA01 |
| RF02 | CSV: BOM UTF-8 no início do arquivo | P0 | CA02 |
| RF03 | CSV: estimativa vazia quando ausente | P1 | CA03 |
| RF04 | CSV: colunas X/Y/W/H com o bbox envolvente para `polygon`/`freehand` | P1 | CA04 |
| RF05 | CSV: colunas XPath, Prioridade, Rótulo e Comentários | P1 | CA04 |
| RF06 | COCO: `bbox` e `area` (fórmula do shoelace) para polígonos; `freehand` com bbox envolvente e `segmentation` com os pontos | P1 | CA05 |
| RF07 | COCO: mapa de categorias calculado uma vez | P2 | — |
| RF08 | Nome de arquivo com normalização Unicode (`NFD` + remoção de diacríticos): "Cadastro de Usuário" → `cadastro_de_usuario` | P1 | CA06 |
| RF09 | `ExportModal` gera só o formato da aba ativa (`useMemo`) | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O CSV abre corretamente no Excel (Windows/macOS) e no Google Sheets | P0 | CA02 |
| RNF02 | O COCO gerado é validado por `pycocotools` sem erro | P2 | — |

### Dependências técnicas

- `src/lib/exportUtils.ts`, `src/components/ExportModal.tsx`.
- Cálculo de bbox/centroide: usar a mesma função do Markdown (âncora/limites em [exportacao-markdown-para-ia](2026-09-25_exportacao-markdown-para-ia.md), RF04) ou o `geometry.ts` de [refactor-codigo-morto-e-tipagem](2026-09-25_refactor-codigo-morto-e-tipagem.md).

### Recursos necessários

- Planilha de teste no Google Sheets e no Excel.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o título `=1+1`, quando o CSV for aberto no Google Sheets, então a célula mostra o texto `=1+1`, e não `2`. (caso negativo)
- [ ] **CA02:** Dado títulos com acentos, quando o CSV for aberto no Excel, então os acentos aparecem corretos.
- [ ] **CA03:** Dado uma anotação sem estimativa, quando exportada em CSV, então a coluna de estimativa fica vazia.
- [ ] **CA04:** Dado um polígono e um traço livre, quando exportados em CSV, então X/Y/W/H trazem o bbox envolvente e as colunas XPath, Prioridade, Rótulo e Comentários aparecem.
- [ ] **CA05:** Dado um polígono quadrado de 100×100 px, quando exportar em COCO, então `bbox` = `[x, y, 100, 100]` e `area` = 10000.
- [ ] **CA06:** Dado o título "Cadastro de Usuário", quando baixar o CSV, então o nome é `cadastro_de_usuario_descritivo.csv`.

## O que a atividade não inclui

- Exportação Markdown: motivo: outra iniciativa ([exportacao-markdown-para-ia](2026-09-25_exportacao-markdown-para-ia.md)).
- Formato GitHub Issue: motivo: outra iniciativa ([feat-integracao-github-issues](2026-09-25_feat-integracao-github-issues.md)).
- Export HTML interativo (citado em `i18n.export.html`): motivo: nova funcionalidade, fora do escopo de correção.

### Considerado para o futuro (P2)

- Export no formato YOLO/Pascal VOC.
- Export XLSX nativo.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Usar `;` como separador (padrão do Excel em pt-BR) ou manter `,`? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | CSV injection | unit | CA01 | Título `=1+1` | Célula `"'=1+1"` |
| CT02 | BOM | unit + manual | CA02 | `exportToCSV` e abrir no Excel | Começa com `﻿`; acentos ok |
| CT03 | Estimativa vazia | unit | CA03 | Sem `estimate_points` | Campo vazio |
| CT04 | Bbox envolvente e colunas | unit | CA04 | Polígono + freehand | X/Y/W/H corretos; cabeçalho com as colunas novas |
| CT05 | COCO polígono | unit | CA05 | Quadrado 100×100 | bbox/area corretos |
| CT06 | Nome de arquivo | unit | CA06 | `slugify('Cadastro de Usuário')` | `cadastro_de_usuario` |

## URL Complementar

- Documentação técnica: https://owasp.org/www-community/attacks/CSV_Injection · https://cocodataset.org/#format-data
- Protótipo / mockup: N/A
- Discussões relacionadas: —
- Referências de design: —
- Requisitos originais: README, "Dados exportados incluídos".
- Issue / PR relacionado: —
