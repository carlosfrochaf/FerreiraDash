import type { RepasseCalculado } from "@/types";

export function calcularRepasse(
  valorTotal: number,
  percentualEscritorio: number
): RepasseCalculado {
  const valorEscritorio =
    Math.round(valorTotal * (percentualEscritorio / 100) * 100) / 100;
  const valorCliente = Math.round((valorTotal - valorEscritorio) * 100) / 100;
  return { valorEscritorio, valorCliente };
}
