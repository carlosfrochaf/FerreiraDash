# Intimações do dia (CNJ / DJEN) — design curto

**Por quê:** a intimação é o que abre prazo; o escritório não pode perder nenhuma. O DataJud é lento, sobrecarregado e atrasado; a API de comunicações do CNJ (Diário de Justiça Eletrônico Nacional) é pública, gratuita, rápida e já traz as publicações do dia.

**Fonte:** `GET https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=&ufOab=&dataDisponibilizacaoInicio=&dataDisponibilizacaoFim=&itensPorPagina=100&pagina=N`. Sem chave.

**O que faz:**
- O dono cadastra em Integrações as OABs acompanhadas (número + UF). Nada é buscado sem OAB.
- Todo dia no aviso da manhã (e no botão "Buscar agora"), o app busca os últimos 7 dias de cada OAB e guarda só o que é novo.
- Cópias da mesma publicação (uma por advogado do processo) viram uma só: chave = processo + data + ID do documento no texto ("Despacho ID 6d25a0a"); sem ID, o `hash` da publicação.
- Tipo pelo texto: Sentença, Acórdão, Decisão, Despacho, Audiência, Outra.
- Liga ao cliente e à causa pelo número do processo (causa em Recebimentos; senão audiência ou petição com cliente).
- Aviso no celular: dono e secretária recebem um resumo ("3 intimações novas: 1 sentença, 2 despachos"); o advogado responsável pela ficha do cliente recebe as dos clientes dele.
- Tela **Intimações**: "Não lidas" / "Todas", com data, tipo, cliente (link), vara, texto (abre/fecha), link oficial e "Marcar como lida".
- Quem vê: dono e secretária veem todas; o advogado vê só as dos clientes dele; financeiro não vê.

**Não-objetivos:** movimentações sem intimação (juntadas, conclusos); calcular prazo; resumo por IA (fica para quando houver a chave da Anthropic).
**Anti-objetivo:** a mesma intimação aparecer ou avisar duas vezes.
