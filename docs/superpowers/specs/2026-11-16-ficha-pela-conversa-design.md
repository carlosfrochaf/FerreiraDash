# Ficha pela conversa do WhatsApp — design curto

**Por quê:** a secretária perde tempo copiando da conversa para a ficha o que o cliente já contou (dias, horários, empresa, salário...).

**O que faz:** na ficha, botão "Preencher pela conversa". A secretária envia a conversa exportada do WhatsApp (.txt, ou .zip do iPhone). A IA lê e devolve os dados; o app preenche **só os campos vazios** da tela e diz quantos preencheu. Nada é salvo nem enviado sozinho: ela confere e clica Salvar.

**Não-objetivos:** ler o WhatsApp direto, responder clientes, treinar modelo.
**Anti-objetivos:** inventar dado que não está na conversa; apagar o que a secretária já digitou.

**Abordagens:** (1) exportar conversa → IA extrai (escolhida); (2) API oficial do WhatsApp — adiada (cadastro na Meta, risco OAB/LGPD).

**Decisões:**
- Modelo `claude-opus-5-5`, saída estruturada (zod), fallback de recusa `"default"`.
- Chave `ANTHROPIC_API_KEY` no Render (o usuário coloca). Sem a chave, o botão avisa que não está configurado.
- Quem usa: quem pode editar a ficha (`podeEditarFicha`).
- Conversa longa demais (> 400 mil caracteres): avisa, não corta escondido.
- Só texto vai para a IA (os áudios entram já transcritos, ver abaixo); fotos e vídeos do .zip são ignorados.
- Campos de escolha (forma de contratação, motivo, aviso, ponto...) só aceitam as opções da ficha.
- Relato: resumo curto do que o cliente contou, em 3ª pessoa.

## Áudios (decidido em 17/11/2026: "a maioria das coisas tá no áudio")
- Exportar **com mídia**. O navegador abre o .zip, separa só os áudios citados na conversa e manda um por um (3 de cada vez) para `/api/fichas/[id]/audio`; fotos e vídeos nunca sobem.
- Transcrição pela OpenAI (`gpt-4o-transcribe`, português). `.opus` do WhatsApp vai como `.ogg`. Chave `OPENAI_API_KEY` no Render (o usuário coloca quando tiver crédito).
- Cada anexo de áudio na conversa vira `[áudio] texto`; o que falhar vira `[áudio não transcrito]` e a tela avisa quantos.
- Sem a chave da OpenAI, a conversa ainda é lida (só texto) e a tela avisa que os áudios ficaram de fora. Exportação "sem mídia" também gera aviso.
