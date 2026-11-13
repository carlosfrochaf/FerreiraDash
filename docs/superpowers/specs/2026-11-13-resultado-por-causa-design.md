# Resultado por causa — design curto

**Por quê:** o dono quer saber se cada causa valeu a pena (lucro ou prejuízo), só com o que entra e sai daquela causa.

**Objetivos:** em cada causa (cartão em Recebimentos) mostrar Entrou, Gastou, Resultado, "ainda vai entrar" e "a pagar", com a lista dos gastos.
**Não-objetivos:** ratear custo fixo (aluguel, salário); DataJud (fica para depois).
**Anti-objetivo:** contar o mesmo gasto em duas causas.

**Abordagens consideradas:** (1) só gastos diretos — escolhida pelo usuário; (2) ratear custo fixo — descartada (rateio é chute).

**Regras (decididas na conversa):**
- Entrou = parcelas RECEBIDO (`valorEscritorio`) + lançamentos ENTRADA PAGO ligados à causa (ex.: sucumbência).
- Gastou = audiências PAGO + petições PAGA + lançamentos SAIDA PAGO ligados à causa.
- A pagar = audiências/petições não pagas com valor + lançamentos SAIDA PENDENTE/NAO_PAGO ligados.
- Ainda vai entrar = parcelas PENDENTE (`valorEscritorio`).
- Ligação: número do processo (só dígitos) igual. Item **sem** número entra pela pessoa (clienteId; lançamento pelo nome do cliente) só se essa pessoa tiver **uma única** causa. Item com número diferente nunca entra.
- Lançamentos de despesa recorrente (salário, custo fixo) nunca entram.
- Quem vê: quem já vê Recebimentos (DONO, FINANCEIRO). Nada muda em permissões.

**Fonte dos dados:** só o que o escritório lança no app; nada externo.

**Deixado ao construtor:** visual do quadro dentro do cartão.
