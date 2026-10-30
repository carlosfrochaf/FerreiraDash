// Quanto o escritório já recebeu e quanto já foi repassado ao cliente numa causa. Puro.
import { centavosParaString, paraCentavos } from "./parcelas";

type ParcelaStatus = {
  valorEscritorio: string;
  valorCliente: string;
  statusRecebimento: string;
  statusRepasse: string;
};

const reais = (c: bigint) => Number(centavosParaString(c));

/**
 * Escritório: parte dele nas parcelas já pagas pela empresa (recebido) e o resto (falta).
 * Cliente: parte dele nas parcelas já repassadas (repassado) e o resto (falta).
 */
export function resumoCausa(parcelas: ParcelaStatus[]) {
  let escTotal = BigInt(0);
  let escRecebido = BigInt(0);
  let cliTotal = BigInt(0);
  let cliRepassado = BigInt(0);
  for (const p of parcelas) {
    const e = paraCentavos(p.valorEscritorio);
    const c = paraCentavos(p.valorCliente);
    escTotal += e;
    cliTotal += c;
    if (p.statusRecebimento === "RECEBIDO") escRecebido += e;
    if (p.statusRepasse === "REPASSADO") cliRepassado += c;
  }
  return {
    escritorio: { total: reais(escTotal), recebido: reais(escRecebido), falta: reais(escTotal - escRecebido) },
    cliente: { total: reais(cliTotal), repassado: reais(cliRepassado), falta: reais(cliTotal - cliRepassado) },
  };
}
