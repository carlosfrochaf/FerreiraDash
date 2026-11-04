# Clientes, documentos e menu lateral — desenho

Data: 04/11/2026

## Objetivo

Centralizar no app o que hoje fica espalhado (nome do cliente digitado em cada causa, documentos no
Drive): um cadastro de clientes, os documentos de cada cliente e causa, e um menu organizado por
setores. Base para vender o app a outros escritórios.

## Reversível

- Tudo num branch `feat/clientes-documentos`; a `main` (app do escritório) só muda com aprovação.
- O usuário vê antes no ambiente de teste: no Render, o serviço `ferreiradash-teste` passa a usar esse
  branch (Settings → Branch).
- Banco: só acrescenta tabelas e colunas opcionais; nada existente é apagado ou alterado. Voltar o
  código não perde dado.

## 1. Clientes

- Tabela nova `clientes`: nome, CPF, telefone/WhatsApp, e-mail, endereço, data de nascimento, chave
  Pix, observações. (As tabelas antigas `contatos`/`processos`, vazias, ficam como estão.)
- `recebimentos`, `audiencias` e `peticoes` ganham `cliente_id` (opcional). O nome digitado continua
  guardado, para não quebrar nada.
- **Carga inicial**: um cliente para cada nome diferente já usado em causas, audiências e petições
  (≈ 50), juntando os iguais por nome sem acento/maiúsculas/espaços; o Pix da causa vai para o cliente.
  Ex.: "EDVANIA CRISTINA" e "EDIVANIA" ficam separados — o usuário junta depois.
- Telas:
  - **Clientes** (`/clientes`): lista com busca por nome/CPF/telefone, contador de causas e aviso de
    documentos faltando.
  - **Ficha do cliente** (`/clientes/[id]`): dados (editar), botão WhatsApp, causas (com o andamento
    recebido/falta), audiências, petições e documentos.
  - **Novo cliente** e **Juntar clientes** (escolhe o outro; tudo dele passa para este e o duplicado
    some).
- Formulários de causa, audiência e petição: o campo "Cliente" sugere os cadastrados; ao salvar com um
  nome novo, o cliente é criado sozinho. A causa usa o Pix do cliente quando o campo vier vazio.
- CPF aparece mascarado na lista (`***.456.789-**`) e completo só na ficha.

## 2. Documentos

- Armazenamento: Supabase Storage, pasta **privada** `documentos`, caminho `clientes/<cliente>/<id>`.
  Envio pelo servidor com a chave de serviço (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` no Render, nos
  dois ambientes). Plano grátis: 1 GB.
- Tabela `documentos`: cliente (obrigatório), causa (opcional), tipo, nome, caminho, tipo do arquivo,
  tamanho, data de envio.
- Tipos: **Pessoais** — RG/CNH, CPF, Comprovante de endereço, CTPS; **Da causa** — Procuração, Contrato
  de honorários, Petição, Decisão/Sentença, Acordo/Ata, Alvará, Comprovante; **Outro**.
- Na ficha do cliente: bloco **Pessoais** + um bloco **por causa**; enviar vários arquivos de uma vez
  (foto ou PDF, até 10 MB cada), escolhendo tipo e causa; ver, baixar, renomear, apagar (com
  confirmação). Na tela da causa, os documentos dela.
- Abrir/baixar: link assinado que vale 5 minutos (exige login no app).
- **Faltando**: pessoais RG/CNH, CPF e comprovante de endereço; por causa, procuração e contrato de
  honorários. Aparece na ficha ("Falta: procuração, comprovante de endereço") e como aviso na lista.

## 3. Menu lateral

- Computador: menu fixo à esquerda, por setor:
  - **Início**
  - **Clientes**
  - **Financeiro**: Lançar, Recebimentos, Despesas, Histórico
  - **Advogados**: Audiências, Petições
  - **Ajustes** (Categorias e ajustes)
- Celular: barra de baixo com **Início · Clientes · Lançar · Recebimentos · Mais**; "Mais" abre a lista
  com o resto (Despesas, Histórico, Audiências, Petições, Ajustes).

## 4. Testes

- Funções puras com teste: juntar nomes iguais (normalização), máscara de CPF, validação de CPF, data
  de nascimento, quais documentos faltam, tipo do arquivo/tamanho aceito.
- Conferência no ambiente de teste antes de publicar no escritório: carga inicial gera os clientes
  certos, envio e abertura de documento, menu no celular e no computador.

## Fora do escopo (próximos passos)

- Login por pessoa e níveis de acesso (dono, secretária, advogado).
- Importar documentos do Google Drive.
- Lista de "documentos faltando" geral e avisos de aniversário.
