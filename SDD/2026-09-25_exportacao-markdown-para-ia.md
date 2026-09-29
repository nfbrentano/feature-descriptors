# [FEAT] Exportação Markdown otimizada para IAs de codificação, com imagem anotada

> **Status:** Em revisão
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Reformular a exportação em Markdown ([markdownExporter.ts](../src/lib/markdownExporter.ts)) para seguir um modelo estável e autoexplicativo, que IAs de codificação (Claude Code, Cursor, Copilot etc.) consigam interpretar sem instruções extras. A exportação deve **anexar a imagem da tela** e gerar uma **versão anotada da imagem**, com marcadores numerados (A1, A2…) desenhados na posição x/y de cada observação feita pelo time durante a spec.
- **Problema e evidência:**
  1. O Markdown atual referencia a imagem como `imagem_anexa.png` quando ela é base64, mas esse arquivo nunca é gerado: a IA recebe um link quebrado.
  2. Não existe imagem com as marcações. A IA recebe coordenadas soltas (`bbox: x=120,y=160…`) sem referência visual, e precisa "imaginar" onde fica cada observação.
  3. O sistema de coordenadas (origem, unidade, dimensões da imagem) não é declarado no arquivo.
  4. Formato em texto corrido, sem cabeçalho estruturado nem tabela-resumo, dificulta o parsing e a priorização pela IA.
  5. Polígonos e desenho livre não têm um ponto âncora (x, y) único; desenho livre sai como `coords: custom`.
- **Impacto de não fazer:** A IA implementa no componente errado ou ignora observações; o time precisa reexplicar a spec manualmente no chat da IA.
- **Para quem é destinado:** Dev que entrega a spec para uma IA de codificação; PO que exporta a spec para o time.
- **História de usuário:** Como dev, quero exportar a spec da tela num pacote (Markdown + imagem anotada) que eu possa entregar direto para a IA de codificação, para que ela entenda onde fica cada observação do time e implemente sem que eu precise explicar.
- **Como saberemos que deu certo:** Em até 2 cliques (aba Markdown → Baixar) o usuário obtém um `.zip` com o `.md` e as imagens, e todo link de imagem do `.md` resolve para um arquivo existente no pacote.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | O Markdown começa com front-matter YAML (`spec`, `format_version`, `title`, `image.file`, `image.original`, `image.width`, `image.height`, `coordinate_system`, `annotations`, `exported_at`, `exported_by`) | P0 | CA01 |
| RF02 | Seção "Instruções para a IA" explicando: o que é o arquivo, como ler os marcadores, sistema de coordenadas (px, origem no canto superior esquerdo, x → direita, y → baixo) e como tratar status/discussão | P0 | CA01 |
| RF03 | Tabela-resumo com uma linha por observação: ID, título, tipo, posição (x, y) em px, região da tela, status, prioridade, estimativa | P0 | CA02 |
| RF04 | Cada observação tem um ponto âncora (x, y): bbox → centro; ponto → o próprio ponto; polígono → média dos vértices; desenho livre → média dos pontos. Também informa a área (limites mín/máx) em px e a posição em % | P0 | CA02, CA03 |
| RF05 | Região textual da tela por grade 3×3 (ex.: "topo-esquerda", "centro", "base-direita") para cada observação | P1 | CA02 |
| RF06 | Seção por observação com: requisito (descrição), discussão do time (autor, data, mensagem), tags, responsável, seletor CSS/XPath | P0 | CA04 |
| RF07 | Gerar imagem anotada (PNG, resolução original) com as formas desenhadas e um marcador numerado "A{n}" no ponto âncora de cada observação; a numeração é a mesma do Markdown | P0 | CA05 |
| RF08 | Modo de anexo "Pacote .zip" (padrão): baixa `.zip` com `<nome>.md`, `imagem-anotada.png` e `imagem-original.<ext>`; o `.md` referencia as imagens por caminho relativo | P0 | CA06 |
| RF09 | Modo de anexo "Imagem embutida": o `.md` contém a imagem anotada como data URI base64 (arquivo único, autocontido) | P1 | CA07 |
| RF10 | Modo de anexo "Somente texto": o `.md` referencia a URL pública da imagem original, ou avisa que a imagem não foi anexada quando ela for base64 local | P1 | CA08 |
| RF11 | Botão "Copiar imagem anotada" na aba Markdown, que copia o PNG para a área de transferência (para colar no chat da IA) | P1 | CA09 |
| RF12 | Pré-visualização da imagem anotada na aba Markdown | P2 | — |
| RF13 | Anotações ocultas (`hidden`) continuam no Markdown e na imagem (o export é a spec completa) | P1 | CA10 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Sem nova dependência npm: o `.zip` é gerado por um escritor ZIP mínimo (método STORE + CRC32) | P0 | CA06 |
| RNF02 | Geração do pacote em < 2 s para imagem de 1920×1080 com 50 anotações | P1 | — |
| RNF03 | Falha de CORS ao carregar a imagem não quebra a exportação: o Markdown é gerado mesmo assim e o usuário recebe aviso | P0 | CA11 |
| RNF04 | Caracteres `|` e quebras de linha em títulos não quebram a tabela Markdown | P0 | CA12 |
| RNF05 | Marcadores legíveis em qualquer resolução: tamanho proporcional à menor dimensão da imagem (mín. 14 px de raio) | P1 | CA05 |

### Dependências técnicas

- [src/lib/markdownExporter.ts](../src/lib/markdownExporter.ts) (gerador do Markdown).
- [src/components/ExportModal.tsx](../src/components/ExportModal.tsx) (UI de exportação).
- Novos módulos: `src/lib/annotatedImage.ts` (render da imagem anotada via `<canvas>`) e `src/lib/zip.ts` (escritor ZIP).
- APIs do navegador: Canvas 2D, `Blob`, `ClipboardItem` (opcional, com fallback de aviso).

### Recursos necessários

- N/A: não há assets, acessos ou credenciais externos.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um descritivo com imagem 1200×800, quando o Markdown for exportado, então o arquivo começa com front-matter YAML contendo `width: 1200`, `height: 800` e `coordinate_system`, seguido da seção "Instruções para a IA".
- [x] **CA02:** Dado um bbox em x=0.1, y=0.2, w=0.3, h=0.4 numa imagem 1200×800, quando exportado, então a tabela-resumo mostra A1 na posição (300, 320) px e região "centro-esquerda" (âncora = centro do retângulo).
- [x] **CA03:** Dado um polígono e um desenho livre, quando exportados, então cada um tem ponto âncora (x, y) numérico e área em px, e nenhum aparece como `coords: custom`.
- [x] **CA04:** Dado uma observação com descrição e 2 mensagens na thread, quando exportada, então a seção A1 contém o requisito e as 2 mensagens com autor e data.
- [x] **CA05:** Dado 3 anotações, quando a imagem anotada for gerada, então ela tem a resolução da imagem original e mostra os marcadores A1, A2 e A3 nas posições âncora informadas no Markdown.
- [x] **CA06:** Dado o modo "Pacote .zip", quando o usuário clicar em "Baixar", então é baixado um `.zip` válido contendo `.md`, `imagem-anotada.png` e `imagem-original.*`, e os links de imagem do `.md` apontam para esses arquivos.
- [x] **CA07:** Dado o modo "Imagem embutida", quando o usuário baixar ou copiar, então o `.md` contém `![…](data:image/png;base64,…)` da imagem anotada.
- [x] **CA08:** Dado o modo "Somente texto" e uma imagem base64 local, quando exportado, então o `.md` não contém link de imagem quebrado e informa que a imagem não foi anexada. (caso negativo)
- [ ] **CA09:** Dado um navegador com suporte a `ClipboardItem`, quando o usuário clicar em "Copiar imagem anotada", então o PNG fica na área de transferência e um toast de sucesso é exibido; sem suporte, um toast de erro explica a limitação.
- [x] **CA10:** Dado uma anotação oculta, quando exportada, então ela aparece no Markdown e na imagem anotada.
- [ ] **CA11:** Dado uma imagem remota sem CORS, quando o usuário baixar no modo .zip, então o `.zip` é gerado com o `.md` (referenciando a URL original) e um toast avisa que a imagem anotada não pôde ser gerada. (erro)
- [x] **CA12:** Dado um título com `|` e quebra de linha, quando exportado, então a tabela-resumo mantém o número correto de colunas.
- [x] **CA13:** Dado um descritivo sem anotações, quando exportado, então o Markdown informa "Nenhuma observação registrada" e a tabela-resumo não é gerada. (caso-limite)

### Resultado da validação (2026-09-25)

- **Automatizado:** CT01–CT08 em `markdownExporter.test.ts`, `zip.test.ts` e `annotatedImage.test.ts` (27 testes passando), `tsc` e `vite build` sem erros. O `.zip` gerado também passou no `unzip -t`.
- **Manual (navegador do app):** pacote .zip com `.md` + `imagem-original.svg` + `imagem-anotada.png` (1200×800, marcadores A1/A2 nas posições do `.md`); modo embutido com data URI; modo somente texto sem link quebrado.
- **Pendente:**
  - **CA09 (caminho de sucesso):** o navegador embutido nega permissão de área de transferência; o toast de erro foi validado, mas copiar e colar o PNG precisa ser testado no Chrome/Safari.
  - **CA11:** a falha ao carregar imagem remota foi validada (`renderAnnotatedImage` rejeita com mensagem em PT-BR), mas o fluxo completo do .zip com imagem sem CORS não foi reproduzido manualmente.

## O que a atividade não inclui

- Exportar múltiplas telas num único pacote: motivo: outra iniciativa (export em lote).
- Compressão (DEFLATE) do `.zip`: motivo: PNG já é comprimido; STORE evita dependência e complexidade.
- Envio direto para APIs de IA (Claude/OpenAI): motivo: prematuro; o fluxo alvo é baixar/colar.
- Recortes (crops) individuais por observação: motivo: baixo impacto agora; ver futuro.
- Alterar os formatos JSON, CSV e COCO: motivo: fora do escopo.

### Considerado para o futuro (P2)

- Recorte da imagem por observação (`A1.png`, `A2.png`) no pacote.
- Opção de exportar apenas observações abertas.
- Template de prompt configurável no topo do Markdown.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Anotações ocultas devem ir no export? | PO | Não | Sim (RF13): o export representa a spec completa; ocultar é só visual. |
| D02 | Qual o modo de anexo padrão? | dev | Não | Pacote .zip: evita base64 gigante e funciona com IAs que leem arquivos do repositório. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Front-matter e instruções | unit | CA01 | Exportar descritivo 1200×800 | Começa com `---`, contém `width: 1200`, `height: 800`, `coordinate_system` e "Instruções para a IA" |
| CT02 | Âncora e região do bbox | unit | CA02 | `getAnnotationAnchor` com bbox 0.1/0.2/0.3/0.4 em 1200×800 | (300, 320), região "centro-esquerda"; linha da tabela contém `(300, 320)` |
| CT03 | Âncora de polígono e freehand | unit | CA03 | Exportar polígono e freehand | Âncoras numéricas, área em px, sem `coords: custom` |
| CT04 | Requisito e discussão | unit | CA04 | Exportar anotação com descrição e 2 mensagens | Ambas as mensagens com autor e data |
| CT05 | Referência de imagem por modo | unit | CA06, CA07, CA08 | Exportar com `imageRef` de arquivo, data URI e sem imagem | Link relativo / data URI / aviso de imagem não anexada |
| CT06 | Escritor ZIP | unit | CA06 | `createZip` com 2 arquivos | Assinaturas `PK\x03\x04` e `PK\x05\x06`, CRC32 de "hello" = `0x3610a686`, 2 entradas no diretório central |
| CT07 | Escape de tabela | unit | CA12 | Título `a|b\nc` | Linha da tabela com o mesmo nº de `|` do cabeçalho |
| CT08 | Sem anotações | unit | CA13 | Exportar descritivo vazio | "Nenhuma observação registrada", sem tabela |
| CT09 | Pacote completo | manual | CA05, CA06, CA10 | Abrir app, criar bbox/ponto/polígono (um oculto), exportar .zip, abrir | Imagem com A1..A3 nas posições do .md; links resolvem |
| CT10 | Copiar imagem | manual | CA09 | Clicar "Copiar imagem anotada" e colar no chat da IA | Imagem com marcadores colada |
| CT11 | Falha de CORS | manual | CA11 | Usar imagem remota sem CORS e baixar .zip | .zip só com .md + toast de aviso |

## URL Complementar

- Documentação técnica: [Formato ZIP (PKWARE APPNOTE)](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- Protótipo / mockup: N/A: UI reutiliza o modal de exportação existente.
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: pedido do usuário em 2026-09-25 ("exportação markdown num modelo entendido por IAs, anexando a imagem e marcando x/y das observações").
- Issue / PR relacionado: N/A
