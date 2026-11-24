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

/**
 * Visão de todas as causas: quanto falta as empresas pagarem, quanto já entrou e falta
 * repassar aos clientes, e quantas parcelas estão atrasadas. `hoje` em "AAAA-MM-DD".
 */
export function panoramaCausas(causas: (ParcelaStatus & { valorParcela: string; vencimento: string })[][], hoje: string) {
  let faltaReceber = BigInt(0);
  let aRepassar = BigInt(0);
  let atrasadas = 0;
  for (const p of causas.flat()) {
    const recebida = p.statusRecebimento === "RECEBIDO";
    if (!recebida) {
      faltaReceber += paraCentavos(p.valorParcela);
      if (p.vencimento.slice(0, 10) < hoje) atrasadas++;
    } else if (p.statusRepasse !== "REPASSADO") {
      aRepassar += paraCentavos(p.valorCliente);
    }
  }
  return { faltaReceber: reais(faltaReceber), aRepassar: reais(aRepassar), atrasadas };
}
