# Marca do escritório — desenho curto

## Por quê
O app vai ser vendido como **uma cópia por escritório** (endereço e banco próprios).
Cada cópia já deve chegar com o nome, o logotipo e a cor do escritório; quem configura é o
fornecedor, na instalação. O dono do escritório não vê nem mexe nisso.

## Objetivos
- Nome, subtítulo, cor de destaque e logotipo vêm da configuração da cópia na Vercel.
- Sem configuração, a cópia continua "Ferreira & Rocha" com o dourado de hoje (o app do usuário nunca quebra).

## Fora do escopo
- Tela para o dono trocar a marca. Acesso especial de fornecedor.
- Trocar o fundo azul-escuro, as fontes ou o layout por escritório.
- Vários escritórios no mesmo app.

## Jeitos considerados
1. **Configuração da Vercel por cópia (escolhido pelo usuário).** Trocar a marca exige republicar (~2 min), feito pelo fornecedor.
2. Tela escondida de "Instalação" com acesso de fornecedor: troca na hora, mas abre uma porta a mais em cada escritório.

## Como funciona
Quatro campos na Vercel (Production). São lidos na publicação, então mudar exige republicar:

| Campo | Exemplo | Sem preencher |
|---|---|---|
| `NEXT_PUBLIC_ESCRITORIO_NOME` | `Silva Advogados` | `Ferreira & Rocha` |
| `NEXT_PUBLIC_ESCRITORIO_SUBTITULO` | `Advocacia Trabalhista` | `Financeiro Jurídico` |
| `NEXT_PUBLIC_ESCRITORIO_COR` | `#C9A23F` | o dourado atual |
| `ESCRITORIO_LOGO_URL` | link público de uma imagem quadrada (PNG/JPG) | `public/icon.png` atual |

Onde a marca aparece:
- **Nome:** topo, título da aba, tela de login, nome do app instalado no celular, Word da ficha, `{escritorio}` nas mensagens de WhatsApp.
- **Subtítulo:** topo e tela de login.
- **Cor:** tudo que hoje é dourado (botões, menu ativo, ícones, destaques).
- **Logotipo:** ícone do app no celular, favicon e tela de login.
  - O símbolo pequeno do topo continua sendo a balança na cor do escritório, porque um logotipo com texto não fica legível em 36 px.

## Decisões do Claude (podem ser corrigidas)
- **Cor:** a cor vira uma variável CSS. O tema passa a usar `var(--marca)` no lugar do valor fixo, e o layout define `--marca` a partir da configuração.
- **Cor inválida ou escura demais:**
  - Valor que não for `#RRGGBB` é ignorado e o app usa o dourado.
  - Cor escura demais para o fundo escuro (luminosidade abaixo de 45%) é clareada para 55%, para o texto continuar legível.
  - A cor do texto sobre os botões (escuro ou branco) é escolhida pela luminosidade da cor.
  - Tudo isso fica numa função pura, com testes.
- **Logotipo:**
  - O ícone do app no celular, em 512 e 180 px, é gerado pelo próprio app a partir do link, com o `sharp`, que já está no projeto.
  - O `manifest.json` passa a ser montado pelo app.
  - Se o link falhar, o app usa o ícone atual.
- **Onde guardar o logotipo:** o guia de instalação manda guardar a imagem num bucket público do Supabase do próprio escritório e colar o link.
- **`APP_NAME`:** a constante passa a ler a configuração, e os lugares que já usam `APP_NAME` continuam iguais.

## O que fica para quem constrói
- Nomes de arquivos e rotas do ícone e do manifest.
- Tamanho do cache do ícone gerado.
