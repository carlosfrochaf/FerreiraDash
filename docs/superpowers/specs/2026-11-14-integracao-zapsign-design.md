# Integração com o ZapSign — desenho (curto)

Data: 2026-11-14 · Branch `feat/login-por-pessoa` (produto de teste).

## Por quê
O escritório manda contrato, procuração e declaração juntos pelo ZapSign; só o cliente assina. Hoje alguém baixa os PDFs assinados e sobe no app à mão, e só depois começa a ficha. Automatizar tira esse passo e vende bem ("se você usa ZapSign, já conecta").

## Metas
- Integração **opcional** por escritório: quem não usa ZapSign não vê nada.
- Ao terminar a assinatura: cliente achado (CPF → telefone) ou criado; PDFs assinados nos Documentos com o tipo certo; ficha em rascunho aberta; aviso no celular de dono e secretária.

## Anti-metas
- Aceitar aviso falso (alguém criando cliente/documento pela rota pública).
- Duplicar documentos quando o ZapSign reenvia o aviso.

## Abordagens
- **A (escolhida):** dono cola o token em Configurações → Integrações; o app cadastra o webhook no ZapSign com um segredo próprio; no aviso, o app confere o segredo e **consulta o documento pela API** (não confia no corpo do aviso).
- B: token em variável do Render — exige mexer no servidor a cada escritório.
- C: buscar documentos de tempos em tempos — atrasa e gasta à toa.

## Como funciona
- Tabela `integracoes` (id = "zapsign", token cifrado com AES-256-GCM a partir do `SESSION_SECRET`, segredo do webhook, quem conectou e quando). RLS ligado.
- `documentos.origem_externa` único (`zapsign:<token do arquivo>`): o mesmo arquivo nunca entra duas vezes.
- Rota pública `POST /api/integracoes/zapsign/aviso`: confere o cabeçalho `X-Webhook-Secret`; pega o `token` do documento; `GET /api/v1/docs/{token}/`; só segue se `status = "signed"`.
- Cliente = primeiro signatário (só o cliente assina). Busca por CPF (só números), depois telefone (últimos 11 números), senão cria.
- Arquivos: `signed_file` do documento e de cada `extra_docs`. Tipo pelo nome: "procura" → Procuração; "honor"/"contrato" → Contrato de honorários; "hipossufici"/"declara" → Declaração de hipossuficiência; resto → Outro. Só PDF, até 10 MB.
- Se entrou algo novo: ficha em rascunho (se o cliente não tiver uma em rascunho) e aviso "Contrato assinado: Fulano" para DONO e SECRETARIA, abrindo a ficha.
- Desconectar apaga o token do app (o aviso que chegar depois é ignorado).

## Fica a cargo de quem constrói
Visual da tela de integrações, textos de ajuda, mensagens de erro do "Conectar".
