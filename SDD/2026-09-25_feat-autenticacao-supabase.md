# [FEAT] Login real com Supabase Auth (e-mail e OAuth GitHub/Google)

> **Status:** Rascunho
> **Autor:** Natanael Fernando Gatti Brentano (redigido com Claude) · **Revisor:** — · **Criada em:** 2026-09-25 · **Atualizada em:** 2026-09-25

## Detalhes da Atividade

- **O que precisa ser feito:** Substituir o "perfil local" (nome e e-mail digitados à mão) por autenticação real via Supabase Auth, mantendo o uso anônimo local.
- **Problema e evidência:**
  - O [AuthModal](../src/components/AuthModal.tsx) só salva nome e e-mail no localStorage e pede a URL e a anon key do Supabase. Nenhuma chamada a `supabase.auth.*` existe no código.
  - Sem sessão, `auth.uid()` é `null`, e todas as policies RLS da migração bloqueiam leitura e escrita. A sincronização não tem como funcionar mesmo com as correções de schema.
  - O `id` do usuário é `local-user-xxxx` ([storage.ts](../src/lib/storage.ts), `getLocalUser`), que não é UUID nem corresponde a um usuário real.
  - O README promete "login via Supabase (credenciais, OAuth GitHub/Google)" e o limite de 5 descritivos por usuário autenticado.
  - Pedir URL e anon key ao usuário final é um fluxo de dev, não de produto. O deploy já tem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- **Impacto de não fazer:** A persistência em nuvem, a colaboração e as permissões do README ficam impossíveis.
- **Para quem é destinado:** PO e devs que querem salvar e compartilhar descritivos.
- **História de usuário:** Como PO, quero entrar com minha conta do GitHub ou Google, para acessar meus descritivos de qualquer computador.
- **Como saberemos que deu certo:** Um usuário novo entra com GitHub em até 3 cliques, e seus descritivos aparecem em outro navegador depois do login.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Login e cadastro com e-mail + magic link (OTP) via `supabase.auth.signInWithOtp` | P0 | CA01 |
| RF02 | Login OAuth com GitHub e Google (`signInWithOAuth`), com redirect para a base `/feature-descriptors/` | P0 | CA02 |
| RF03 | `currentUser` passa a vir de `supabase.auth.getSession()` / `onAuthStateChange` (id = `auth.uid()`, nome/avatar dos metadados) | P0 | CA03 |
| RF04 | Logout limpa a sessão e volta ao modo local sem apagar os dados locais | P0 | CA04 |
| RF05 | No primeiro login, oferecer migrar os descritivos locais para a conta (respeitando o limite de 5) | P1 | CA05 |
| RF06 | Header mostra avatar/nome e estado (local · conectado · sincronizando · erro) | P1 | CA03 |
| RF07 | Configuração manual de URL/anon key fica numa seção "Avançado (self-host)", recolhida por padrão | P1 | CA06 |
| RF08 | Mensagens da thread passam a usar o nome do perfil autenticado | P1 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O app funciona sem login exatamente como hoje (modo anônimo local) | P0 | CA07 |
| RNF02 | Nenhum token é gravado manualmente pelo app: só a persistência padrão do supabase-js | P0 | — |
| RNF03 | O botão de login é acessível por teclado e tem `aria-label` | P1 | — |

### Dependências técnicas

- [fix-migracao-supabase](2026-09-25_fix-migracao-supabase.md) e [fix-sincronizacao-supabase](2026-09-25_fix-sincronizacao-supabase.md).
- Provedores GitHub e Google configurados no painel do Supabase, com redirect URLs do GitHub Pages e de `localhost:5173`.

### Recursos necessários

- Acesso admin ao projeto Supabase e OAuth Apps no GitHub e no Google Cloud.
- Secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no workflow de deploy ([deploy.yml](../.github/workflows/deploy.yml) hoje não injeta nenhuma env).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um e-mail válido, quando o usuário pedir o magic link e clicar nele, então volta ao app autenticado.
- [ ] **CA02:** Dado o botão "Entrar com GitHub", quando o usuário autorizar, então volta ao app autenticado com nome e avatar do GitHub.
- [ ] **CA03:** Dado um usuário autenticado, quando comentar numa thread, então o `author_id` da mensagem é o `auth.uid()` e o nome exibido é o do perfil.
- [ ] **CA04:** Dado um usuário autenticado, quando fizer logout, então o Header mostra "Usuário Local" e os descritivos locais continuam acessíveis.
- [ ] **CA05:** Dado 2 descritivos locais, quando o usuário fizer o primeiro login e aceitar migrar, então os 2 aparecem na conta e em outro navegador.
- [ ] **CA06:** Dado o deploy com env vars configuradas, quando o usuário abrir o modal de conta, então não vê campos de URL/key, a menos que expanda "Avançado".
- [ ] **CA07:** Dado um usuário que nunca faz login, quando usar o app, então nenhuma funcionalidade local é bloqueada. (caso negativo)

## O que a atividade não inclui

- Convite de colaboradores e papéis: motivo: outra iniciativa futura (depende desta).
- Login com senha: motivo: magic link + OAuth cobre o público-alvo sem precisar gerenciar senhas.
- Planos pagos / upgrade de limite: motivo: fora da estratégia atual.

### Considerado para o futuro (P2)

- Convite por e-mail/link com papéis viewer/editor/admin (tabela `collaborators` já existe).
- SSO corporativo (SAML).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual projeto Supabase de produção será usado no GitHub Pages? | PO/dev | Sim | |
| D02 | Manter a opção de self-host (URL/key manuais) ou remover? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Magic link | manual | CA01 | Pedir o link e clicar | Sessão ativa |
| CT02 | OAuth GitHub | manual/e2e | CA02 | Fluxo completo | Avatar no Header |
| CT03 | Autor da mensagem | unit (mock auth) | CA03 | Sessão mockada e envio de mensagem | `author_id === session.user.id` |
| CT04 | Logout | integração | CA04 | `signOut` | `currentUser` local; localStorage intacto |
| CT05 | Migração inicial | e2e | CA05 | 2 locais, login, aceitar | 2 no banco |
| CT06 | Seção avançada | integração | CA06 | Env vars definidas e abrir o modal | Campos ocultos |
| CT07 | Modo anônimo | integração | CA07 | Sem sessão, fluxo completo | Sem bloqueios |

## URL Complementar

- Documentação técnica: https://supabase.com/docs/guides/auth · https://supabase.com/docs/guides/auth/social-login/auth-github
- Protótipo / mockup: —
- Discussões relacionadas: —
- Referências de design: —
- Requisitos originais: README, "Uso sem login vs com login" e "Integração com Supabase".
- Issue / PR relacionado: —
