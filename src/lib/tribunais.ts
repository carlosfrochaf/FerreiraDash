// Código do tribunal (TR) por UF na Justiça Estadual (J=8) e Eleitoral (J=6): ordem alfabética do CNJ.
const UF_POR_CODIGO: Record<string, string> = {
  "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce", "07": "df", "08": "es", "09": "go",
  "10": "ma", "11": "mt", "12": "ms", "13": "mg", "14": "pa", "15": "pb", "16": "pr", "17": "pe", "18": "pi",
  "19": "rj", "20": "rn", "21": "rs", "22": "ro", "23": "rr", "24": "sc", "25": "se", "26": "sp", "27": "to",
};

/** Alias do índice do Datajud a partir dos dígitos J e TR do número CNJ. */
export function tribunalDoProcesso(j: string, tr: string): string | null {
  const n = parseInt(tr, 10);
  const uf = UF_POR_CODIGO[tr];
  switch (j) {
    case "8": // Justiça Estadual
      return uf ? (uf === "df" ? "tjdft" : `tj${uf}`) : null;
    case "5": // Justiça do Trabalho
      return n >= 1 && n <= 24 ? `trt${n}` : null;
    case "4": // Justiça Federal
      return n >= 1 && n <= 6 ? `trf${n}` : null;
    case "6": // Justiça Eleitoral
      return uf ? `tre-${uf}` : null;
    default:
      return null;
  }
}
