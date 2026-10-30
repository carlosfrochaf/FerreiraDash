// Regras do campo de valor de cada parcela no cadastro de causa. Puro.
import { centavosParaString } from "./parcelas";
import { maskCurrencyInput } from "./utils";

/** O que vai no campo enquanto a pessoa digita: vazio fica vazio (não vira "0,00"). */
export function mascaraDigitada(texto: string): string {
  return texto.replace(/\D/g, "") ? maskCurrencyInput(texto) : "";
}

/** Valor fixo da parcela ("4500.00"), ou undefined se o campo está vazio/zero (parcela automática). */
export function valorFixoDaParcela(mascara: string | undefined): string | undefined {
  const digitos = (mascara ?? "").replace(/\D/g, "");
  if (!/[1-9]/.test(digitos)) return undefined;
  return centavosParaString(BigInt(digitos));
}
