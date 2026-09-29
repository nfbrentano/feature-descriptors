# [CHORE] Cobertura de testes, ESLint e deploy com variáveis de ambiente

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Criar uma rede de segurança (testes, lint, CI) antes das correções das outras specs, e corrigir o pipeline de deploy.
- **Problema e evidência:**
  - Existem 16 testes em 6 arquivos (`aiHelper`, `canvasUtils`, `history`, `markdownExporter`, `validators`, `ErrorBoundary`). Não há testes para `storage.ts`, `exportUtils.ts`, `useDescriptors`, nem para nenhum componente de fluxo (`CanvasViewport`, `ThreadPanel`, `AnnotationSidebar`, `ExportModal`). É justamente onde estão os bugs levantados nas specs `fix-*` de 2026-09-25.
  - O job de CI se chama "Lint, Test & Typecheck" ([ci.yml](../.github/workflows/ci.yml)), mas não há ESLint instalado nem passo de lint.
  - O `lint-staged` roda só `vitest related`, sem lint/format.
  - Não há threshold de cobertura: a cobertura pode cair sem o CI falhar.
  - O [deploy.yml](../.github/workflows/deploy.yml) não injeta `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no build, então o site publicado nunca tem Supabase pré-configurado.
  - Não há testes e2e: fluxos de canvas (desenhar, colar imagem) só são verificáveis manualmente.
- **Impacto de não fazer:** As correções das outras specs podem introduzir regressões sem que ninguém perceba, e o deploy continua sem nuvem.
- **Para quem é destinado:** Devs e revisores de PR.
- **História de usuário:** Como dev, quero que o CI barre regressões e problemas de lint, para corrigir bugs com confiança.
- **Como saberemos que deu certo:** Cobertura de linhas ≥ 70% em `src/lib` e `src/hooks`, lint obrigatório no CI e um e2e do fluxo principal verde.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | ESLint (flat config) com `typescript-eslint`, `eslint-plugin-react-hooks` e `eslint-plugin-jsx-a11y`; script `npm run lint` | P0 | CA01 |
| RF02 | Passo `npm run lint` no CI e no `lint-staged` | P0 | CA01 |
| RF03 | Testes unitários para `storage.ts` (local: limite, cota, parse inválido) e `exportUtils.ts` (CSV, COCO, import) | P0 | CA02 |
| RF04 | Testes do hook `useDescriptors` (criar/editar/excluir/undo) com `renderHook` e mock do Supabase | P0 | CA02 |
| RF05 | Testes de componentes: `AnnotationSidebar` (filtros), `ThreadPanel` (comentário, tags, status), `ExportModal` (abas, import) | P1 | CA02 |
| RF06 | Threshold de cobertura no `vite.config.ts` (linhas 70% em `src/lib` e `src/hooks`) | P1 | CA03 |
| RF07 | Playwright com um e2e: abrir app → colar imagem → desenhar bbox → comentar → exportar Markdown | P1 | CA04 |
| RF08 | Injetar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` via `secrets`/`vars` no `deploy.yml` | P1 | CA05 |
| RF09 | Prettier + `format:check` no CI | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O CI completo roda em < 5 min | P1 | CA04 |
| RNF02 | Os testes não fazem requisições de rede reais (Supabase mockado) | P0 | CA02 |

### Dependências técnicas

- Nenhuma spec bloqueia esta; recomenda-se fazê-la **primeiro**.
- Novas devDependencies: `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `@playwright/test`.

### Recursos necessários

- Secrets/variables no repositório GitHub (para o RF08).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um PR com `useEffect` sem dependência obrigatória, quando o CI rodar, então o passo de lint falha apontando `react-hooks/exhaustive-deps`.
- [ ] **CA02:** Dado a suíte, quando `npm test` rodar, então existem testes para `storage`, `exportUtils`, `useDescriptors`, `AnnotationSidebar`, `ThreadPanel` e `ExportModal`, todos verdes e sem rede.
- [ ] **CA03:** Dado um PR que reduz a cobertura de `src/lib` abaixo de 70%, quando o CI rodar, então o job falha.
- [ ] **CA04:** Dado o e2e, quando rodar no CI (headless Chromium), então o fluxo principal passa e o arquivo exportado contém "A1".
- [ ] **CA05:** Dado os secrets configurados, quando o deploy rodar, então o site publicado mostra o Supabase como configurado sem entrada manual.
- [ ] **CA06:** Dado os secrets ausentes, quando o deploy rodar, então o build não falha e o app funciona em modo local. (caso negativo)

## O que a atividade não inclui

- Corrigir os bugs encontrados pelos testes: motivo: cada correção pertence à sua spec `fix-*`. Aqui os testes que expõem bugs conhecidos podem entrar como `it.todo`/`it.fails`.
- Testes visuais (screenshot diff): motivo: prematuro.

### Considerado para o futuro (P2)

- Testes de regressão visual do canvas (Playwright screenshots).
- Preview deploy por PR.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O lint deve bloquear o commit (husky) ou só o CI? | dev | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Lint barra hooks | CI | CA01 | PR de teste com violação | Job vermelho |
| CT02 | Suíte nova | unit/integração | CA02 | `npm test` | Verde; nenhum `fetch` real (MSW/mocks) |
| CT03 | Threshold | CI | CA03 | Remover testes de `storage` num branch | Job vermelho |
| CT04 | E2E | e2e | CA04 | `npx playwright test` | Verde |
| CT05 | Deploy com env | manual | CA05 | Deploy e abrir o site | Supabase configurado |
| CT06 | Deploy sem env | manual | CA06 | Deploy sem secrets | Build ok, modo local |

## URL Complementar

- Documentação técnica: https://eslint.org/docs/latest/use/configure/configuration-files · https://vitest.dev/guide/coverage#coverage-thresholds · https://playwright.dev/docs/ci-intro
- Protótipo / mockup: N/A
- Discussões relacionadas: commit `2f8082f` (husky, lint-staged, coverage).
- Referências de design: N/A
- Requisitos originais: N/A: iniciativa técnica.
- Issue / PR relacionado: —
