# Esqueci minha senha — desenho curto

## Por quê
O app vai ser vendido para outros escritórios. Hoje o dono troca a senha da equipe em **Usuários**,
mas, se o próprio dono esquecer a dele, só o fornecedor resolve, mexendo no banco. Para um produto
vendido, isso vira chamado de suporte.

## Objetivos
- **"Esqueci minha senha" no login:** a pessoa digita o e-mail, recebe um link que vale 30 minutos e cria a senha nova sozinha.
- **"Minha senha" no menu Ajustes:** cada pessoa logada troca a própria senha, informando a atual.

## Fora do escopo
- Domínio próprio para os e-mails (fica para depois; trocar o remetente não muda o resto).
- Avisos por e-mail de outras coisas.

## Jeitos considerados
1. **E-mail pelo Gmail com "senha de app" (escolhido).** Grátis, sem domínio, limite de cerca de 500 por dia. O remetente é @gmail.com.
2. Resend ou Brevo sem domínio: o Resend só envia para o próprio dono da conta, e o Brevo com remetente @gmail tende a cair no spam.
3. Sem e-mail, com o dono trocando tudo: o dono fica sem saída se esquecer a dele.

## Como funciona
- **Configuração (Vercel, Production):**
  - `GMAIL_USUARIO`: o endereço do Gmail.
  - `GMAIL_SENHA_APP`: a senha de app do Google.
  - Um Gmail serve para todas as cópias. O fornecedor coloca; o Claude nunca vê.
- **No login, "Esqueci minha senha":**
  - **Sem os campos configurados:** a tela só diz "Peça ao dono do escritório para trocar sua senha em Usuários".
  - **Com os campos configurados:** a tela pede o e-mail e responde sempre a mesma coisa: "Se este e-mail tiver acesso, enviamos um link. Veja também o spam." Isso evita revelar quem tem conta.
- **E-mail:**
  - Assunto: "Criar nova senha – {nome do escritório}".
  - Corpo: texto curto com o botão/link para `/login/nova-senha?t=…` e o aviso "vale por 30 minutos; se não foi você, ignore".
- **Tela de nova senha:** nova senha e repetir, com mínimo de 8 caracteres. Ao salvar, todas as sessões antigas dessa pessoa caem e ela volta ao login com "Senha trocada. Entre com a nova senha."
- **"Minha senha" (logado):** pede a senha atual, a nova e a repetição. As outras sessões da pessoa caem, e a atual continua.

## Decisões do Claude (podem ser corrigidas)
- **O link não fica guardado no banco.** É assinado com o `SESSION_SECRET` e leva a pessoa, a versão da sessão e o prazo.
  - Como trocar a senha sobe a versão da sessão, o link só funciona **uma vez**.
  - Pessoa desativada não recebe e-mail, e o link dela não funciona.
- **Contra abuso:** no máximo um e-mail por pessoa a cada 2 minutos. Isso exige uma coluna nova em `usuarios` (`link_senha_em`), numa migração pequena.
- **Envio:** pelo SMTP do Gmail, com a biblioteca `nodemailer`, que é uma dependência nova.
- **Rotas sem login:**
  - A página `/login/nova-senha`.
  - As APIs `/api/login/esqueci` e `/api/login/nova-senha`.
- **"Minha senha" para todos os perfis:**
  - Fica no grupo Ajustes do menu, que no celular aparece em "Mais".
  - Perfis que hoje não veem Ajustes passam a ver esse único item.
