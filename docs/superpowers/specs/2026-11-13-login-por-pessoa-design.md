# Login por pessoa e perfis de acesso — desenho

Data: 2026-11-13 · Branch: `feat/login-por-pessoa` (a partir de `feat/clientes-documentos`) · Só no ambiente de teste, que é a **base do produto para vender** (não é usado pelo escritório; o app do escritório segue em `main` sem login por pessoa).

## Por quê
Hoje há uma senha única (`APP_PASSWORD`) e todos veem tudo. Para vender o app a outras advocacias, cada pessoa precisa do próprio login e ver só o que é da sua função. O dono não tem tempo de cuidar de tudo; delega ao financeiro, à secretária e aos advogados.

## Metas
- Login com e-mail + senha, um por pessoa.
- Quatro perfis **fixos**: Dono/Sócio, Financeiro, Secretária, Advogado.
- Cada perfil vê só as telas e ações dele; o servidor bloqueia também (não só esconde o menu).
- Advogado vê só as audiências, petições e pagamentos **dele**.
- Avisos no celular por perfil.
- Tela "Usuários" (só Dono/Sócio): criar, editar perfil, desativar, definir senha nova.

## Fora de escopo (agora)
- Permissões ajustadas pessoa a pessoa (vem depois; o desenho não pode impedir).
- "Esqueci minha senha" por e-mail — **próximo passo logo depois deste**, precisa de serviço de e-mail.
- Vários escritórios no mesmo app; registro de atividades.

## Anti-metas
- Qualquer mudança deste trabalho chegar ao app do escritório (`main`) sem decisão explícita.
- Esconder no menu mas deixar a API aberta seria falha.

## Abordagens
- **A) Login próprio (escolhida):** tabela `usuarios` no banco atual, senha com hash, cookie assinado com id + perfil, conferido no middleware como hoje. Sem serviço novo, fácil de reverter.
- B) Supabase Auth: tem recuperação por e-mail pronta, mas é mais uma peça por escritório e prende ao Supabase.
- C) Auth.js: configuração demais para o que precisamos.

## Perfis
| Tela / ação | Dono/Sócio | Financeiro | Secretária | Advogado |
|---|---|---|---|---|
| Início | completo (saldo, gráfico) | completo | o dia: audiências e petições, clientes com documentos faltando | o dia dele |
| Clientes (ver) | sim | sim (só ver) | sim | não |
| Clientes (criar/editar/juntar) | sim | não | sim | não |
| Documentos (enviar/renomear/apagar) | sim | não (ver sim) | sim | não |
| Lançar, Despesas, Histórico | sim | sim | não | não |
| Recebimentos / causas (valores) | sim | sim | não | não |
| Audiências / Petições | todas, editar | todas, marcar pago | todas, criar/editar sem valores | só as dele, só ver |
| Meus pagamentos | — | — | — | recebido e a receber (audiências + petições dele) |
| Categorias e ajustes | sim | sim | não | não |
| Usuários | sim | não | não | não |

Secretária não vê valores em dinheiro (campos de valor somem nas telas e na API de audiências/petições).

## Como funciona
- **Banco (só acréscimo):** enum `Perfil` (DONO, FINANCEIRO, SECRETARIA, ADVOGADO); tabela `usuarios` (nome, email único, senhaHash, perfil, advogadoChave opcional → liga ao advogado pelo mesmo `chave` usado hoje, ativo, versaoSessao, createdAt). `push_subscriptions` ganha `usuario_id` (obrigatório; os aparelhos antigos do teste são apagados). RLS ligado.
- **Senha:** PBKDF2-SHA256 (Web Crypto, 210 mil voltas, sal aleatório). Mínimo 8 caracteres.
- **Sessão:** cookie `fd_sessao` = `usuarioId.perfil.versao.expira.assinatura` (HMAC com `SESSION_SECRET`, nova variável). Middleware confere a assinatura (sem banco). Desativar usuário ou trocar a senha aumenta `versaoSessao`; as páginas do servidor conferem a versão no banco e derrubam a sessão antiga.
- **Trava:** uma tabela única de regras (rota → perfis) usada pelo middleware, pelo menu e pelas rotas da API. Quem cai numa tela proibida vai para o Início.
- **Advogado:** consultas de audiências/petições filtram por `advogadoChave` no servidor.
- **Avisos:** cada aparelho fica ligado a quem ativou (`usuario_id` obrigatório); o disparo monta o texto por perfil (Advogado: só os dele; Secretária: audiências/petições; Financeiro: vencimentos e advogados a pagar; Dono: tudo). Aparelhos sem usuário são apagados na migração.

## Primeiro acesso
- Sem nenhum usuário no banco, a tela de login mostra "Criar primeiro acesso": nome, e-mail e senha do Dono. Depois disso some.
- A senha única (`APP_PASSWORD`) deixa de existir neste branch.
- Não há usuários nem aparelhos a preservar: o teste não é usado por ninguém.

## Testes
Funções puras com Vitest: regras de acesso por perfil, assinatura/validade do cookie, hash de senha, filtro do advogado, montagem dos avisos por perfil.

## Fica a cargo de quem constrói
Visual exato das telas novas (seguir o padrão atual), textos, ordem do menu por perfil.
