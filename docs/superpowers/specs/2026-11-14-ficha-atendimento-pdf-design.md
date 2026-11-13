# Ficha de atendimento, acesso do advogado e documentos em PDF — desenho

Data: 2026-11-14 · Branch: `feat/login-por-pessoa` (produto de teste; nada vai para `main`).

## Por quê
Hoje a ficha do cliente fica num site à parte (fichaadv.netlify.app). Quando o cliente assina o contrato, a secretária preenche a ficha e manda ao advogado fazer a petição. O advogado precisa dos dados do cliente, dos documentos e dos dados do trabalho; e precisa devolver o arquivo da petição. O PJe só aceita PDF, então tudo o que vai para o processo tem de ser PDF.

## Metas
1. **Ficha de atendimento dentro do app**, no cliente, com os blocos da ficha atual.
2. **Advogado responsável** escolhido na ficha; o advogado passa a ver esse cliente (dados, documentos, fichas), sem valores, e pode completar a ficha e enviar arquivos.
3. **Arquivo da petição** enviado pelo advogado direto da petição dele.
4. **Tudo em PDF**: foto vira PDF sozinha no envio; várias fotos podem virar um PDF só.

## Fora de escopo (agora)
- Personalizar campos da ficha por escritório (o formato escolhido permite fazer depois).
- Converter para PDF os documentos antigos que já estão como foto.
- Áudios e vídeos (só aparecem como item marcado na lista de documentos).
- Imprimir/baixar a ficha em PDF.

## Anti-metas
- Digitar duas vezes o que já está no cadastro do cliente.
- Advogado vendo clientes que não são dele, ou valores em dinheiro.

## Abordagens
- Guardar a ficha — **A (escolhida):** tabela `fichas` com os blocos guardados juntos (JSON conferido pelo app); fácil de mudar e personalizar. B: uma coluna por campo (~70), rígida. C: manter o site externo com link, sem integração.
- PDF — **1 (escolhida):** o navegador converte foto em PDF antes de enviar (e junta várias fotos num PDF). 2: aceitar só PDF, obrigando a converter por fora.

## Como funciona

### Ficha
- Fica em **Clientes → ficha do cliente → "Fichas de atendimento"**: lista (empresa, advogado, situação, data) e botão "Nova ficha".
- Campos (iguais aos do site atual, com os mesmos rótulos e opções):
  - **Atendimento:** data, advogado responsável (lista de advogados do app).
  - **Cliente:** nome, CPF, nascimento, telefone, e-mail, endereço vêm do cadastro e são editados lá mesmo (salvar a ficha salva o cadastro). Novos no cadastro: estado civil, CEP, cidade/UF, como chegou (Meta Ads, Indicação, Google, Instagram, Outro).
  - **Empresa:** razão social, CNPJ, nome fantasia, e-mail, endereço da sede, telefones, local de trabalho.
  - **Contrato:** admissão, demissão, função inicial, função final, salário inicial, último salário, forma de contratação, motivo do desligamento, registro em CTPS, aviso prévio (tipo e data), mudança de função (e quando), comissões (e valor médio).
  - **Jornada:** entrada, saída, intervalo, dias trabalhados (seg–dom), escala, horas extras (e se eram pagas), controle de ponto, trabalho noturno, adicional noturno.
  - **Ambiente:** EPIs, insalubridade, periculosidade, recebia adicionais, acidente de trabalho, assédio.
  - **Verbas rescisórias:** recebeu (sim/não/parcial), valor pago, data, TRCT, seguro-desemprego (e parcelas), sacou FGTS.
  - **Relato** do cliente (texto longo).
  - **Documentos apresentados/solicitados:** a lista da ficha; os que já foram enviados ao app aparecem marcados sozinhos, os outros a secretária marca.
  - **Teses** (lista de seleção) e **testemunhas/outras informações** (testemunhas e quantas, ação anterior, outras ações contra a empresa, observações).
- Todos os campos são opcionais, menos empresa e advogado responsável para "Enviar ao advogado".
- **Situação:** Rascunho → **Enviada ao advogado**. Ao enviar, o advogado recebe aviso no celular: "Nova ficha para você: Fulano × Empresa".
- Quem edita: Dono, Secretária e o advogado responsável. Financeiro só vê.
- A ficha pode ser ligada a uma causa depois do acordo (escolher a causa do cliente).

### Acesso do advogado
- Vê os clientes em que é responsável por alguma ficha **ou** tem audiência/petição no nome dele. Os outros ficam escondidos (lista, ficha e API).
- Na ficha do cliente vê dados, documentos e fichas; não vê causas nem valores; não edita o cadastro (só pela ficha, nos campos dela).
- Pode **enviar documentos** a esses clientes e apagar **só os que ele mesmo enviou**.
- Menu do advogado ganha "Clientes".

### Arquivo da petição
- Em **Petições**, cada petição do advogado ganha "Enviar arquivo" (PDF). O arquivo vai para os documentos do cliente como "Petição", ligado àquela petição; a petição mostra "arquivo enviado" e permite abrir/trocar.
- Só funciona se a petição estiver ligada a um cliente cadastrado (já acontece pelo nome).

### PDF
- No envio de documentos: foto (JPG, PNG, WebP; HEIC quando o navegador consegue abrir) é convertida em PDF no navegador (página A4, imagem reduzida para no máximo ~2000 px, qualidade boa para leitura).
- Opção "Juntar em um PDF só" quando várias fotos forem escolhidas juntas (ex.: frente e verso do RG).
- O servidor passa a aceitar **só PDF**; limite **10 MB por arquivo** (limite atual do PJe trabalhista). Passou disso: mensagem clara antes de enviar.
- Tipos novos de documento (para casar com a lista da ficha): TRCT, holerite, extrato do FGTS, cartão de ponto, contrato de trabalho, aviso prévio, atestado/laudo, CAT, prints/mensagens.

## Banco (só acréscimos)
- `fichas`: id, cliente_id (cascade), advogado_chave, empresa, situacao (RASCUNHO/ENVIADA), dados (jsonb), recebimento_id (opcional), criada_por_id, enviada_em, created_at, updated_at. RLS ligado.
- `clientes`: estado_civil, cep, cidade_uf, origem.
- `documentos`: enviado_por_id (opcional), peticao_id (opcional, set null).
- Enum de tipos de documento ganha os tipos novos.

## Testes
Funções puras com Vitest: conferência dos dados da ficha (aceita vazio, recusa formato errado), regra de quais clientes o advogado vê, marcação automática dos documentos da ficha, regra de "pode enviar ao advogado", regra de quem pode apagar documento, cálculo do tamanho/escala da imagem para o PDF.

## Fica a cargo de quem constrói
Visual da ficha (seguir o padrão do app, blocos recolhíveis no celular), ordem dos campos dentro de cada bloco, textos de ajuda.
