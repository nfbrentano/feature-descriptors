# [DOCS] Melhorias no modelo de especificação (modelo_feature.md)

## Detalhes da Atividade

- **O que precisa ser feito:** Evoluir `SDD/modelo_feature.md` com base na proposta `SDD/modelo_feature_v2.md` e atualizar as regras de SDD no `CLAUDE.md` e no `GEMINI.md` para refletir as novas seções.
- **Por que é necessário:** O modelo atual não tem status da spec, objetivos mensuráveis, prioridade dos requisitos, rastreabilidade entre requisito → critério → teste, nem um lugar para dúvidas em aberto. Isso dificulta a revisão exigida pela regra 6 e o fechamento exigido pela regra 7.
- **Qual valor será agregado:** Specs mais fáceis de revisar e priorizar, com a garantia de que cada requisito tem critério e teste correspondentes.
- **Para quem é destinado:** PO e devs (humanos e agents de AI) que escrevem e implementam specs neste repositório.

## Requisitos da Atividade

### Requisitos funcionais

- RF01: Adicionar cabeçalho com status, autor, revisor e datas.
- RF02: Padronizar a lista de tags com colchetes, alinhada aos tipos de commit (`[FEAT] [FIX] [UI] [SEO] [REFACTOR] [CHORE] [DOCS]`).
- RF03: Em "Detalhes da Atividade", incluir problema/evidência, impacto de não fazer, história de usuário e métrica de sucesso.
- RF04: Converter RF/RNF em tabelas com prioridade (P0/P1/P2) e vínculo com CAs.
- RF05: Incluir orientação de cobertura nos CAs (fluxo principal, erro, caso-limite, caso negativo).
- RF06: Exigir motivo para cada item fora do escopo e adicionar a subseção "Considerado para o futuro (P2)".
- RF07: Criar a seção "Dúvidas em aberto" entre "O que a atividade não inclui" e "Sugestões de casos de teste".
- RF08: Adicionar as colunas "Tipo" e "Cobre" à tabela de casos de teste.
- RF09: Adicionar "Issue / PR relacionado" em URL Complementar.
- RF10: Atualizar a lista e a ordem das seções na regra 2 do `CLAUDE.md` e do `GEMINI.md`.

### Requisitos não-funcionais

- RNF01: O novo modelo deve continuar em Markdown puro, legível sem renderização.
- RNF02: As seções obrigatórias atuais devem ser mantidas (títulos compatíveis), para não invalidar specs existentes.

### Dependências técnicas

- Revisão e aprovação de `SDD/modelo_feature_v2.md` pelo PO.

### Recursos necessários

- Autorização explícita para alterar `SDD/modelo_feature.md`, pois a regra 3 do `CLAUDE.md` proíbe a alteração.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que o modelo v2 foi aprovado, quando ele for aplicado, então `SDD/modelo_feature.md` passa a conter todas as seções do v2 e `SDD/modelo_feature_v2.md` é removido.
- [ ] **CA02:** Dado que o modelo foi atualizado, quando alguém ler a regra 2 do `CLAUDE.md` e do `GEMINI.md`, então a lista de seções e a ordem batem exatamente com o modelo.
- [ ] **CA03:** Dado o novo modelo, quando uma spec for escrita a partir dele, então cada RF referencia pelo menos um CA e cada CA é coberto por pelo menos um CT.
- [ ] **CA04:** Dado o novo modelo, quando uma seção não se aplicar, então a regra de manter o título com `N/A` e justificativa continua válida.

## O que a atividade não inclui

- Migrar specs já existentes para o novo formato: motivo: hoje não há specs em `SDD/DONE/` e o formato antigo continua compatível.
- Criar validação automática (lint) das specs: motivo: prematuro; avaliar depois de algumas specs no novo formato.

## Sugestões de casos de teste

| # | Cenário | Passos | Resultado esperado |
|---|---------|--------|--------------------|
| CT01 | Seções completas | Comparar os títulos `##` do modelo com a regra 2 do `CLAUDE.md` e do `GEMINI.md` | Mesmas seções, na mesma ordem |
| CT02 | Uso real | Escrever a próxima spec de feature com o novo modelo | Todas as seções preenchidas ou `N/A` justificado; rastreabilidade RF → CA → CT completa |
| CT03 | Renderização | Abrir o modelo no GitHub/preview Markdown | Tabelas e cabeçalho renderizam corretamente; comentários HTML ficam ocultos |

## URL Complementar

- Documentação técnica: `CLAUDE.md` (seção Spec Driven Development)
- Protótipo / mockup: `SDD/modelo_feature_v2.md`
- Discussões relacionadas: N/A, a análise foi feita na sessão com a skill `write-spec`
- Referências de design: N/A
- Requisitos originais: N/A
