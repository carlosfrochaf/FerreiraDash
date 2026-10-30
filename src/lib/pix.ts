// Pix "Copia e Cola" (BR Code estático), montado no próprio app.
// Padrão EMV do Banco Central; o banco do pagador lê a chave e o valor e mostra o nome do recebedor.
// Puro: roda no navegador e no servidor.

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const ch of texto) {
    crc ^= ch.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/**
 * Chave Pix no formato que o padrão exige, ou null se não der para reconhecer:
 * e-mail em minúsculas, chave aleatória, CPF/CNPJ só com dígitos, celular como +55DDDNÚMERO.
 */
export function normalizarChavePix(chave: string): string | null {
  const t = chave.trim();
  if (!t) return null;
  if (t.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t.toLowerCase() : null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return t.toLowerCase();

  const digitos = t.replace(/\D/g, "");
  if (t.startsWith("+")) return digitos.length >= 12 && digitos.length <= 13 ? `+${digitos}` : null;
  if (digitos.length === 14) return digitos; // CNPJ
  if (digitos.length === 11) {
    // Com cara de telefone, ou não é um CPF válido: celular com DDD.
    if (/[()\s]/.test(t) || !cpfValido(digitos)) return digitos[2] === "9" ? `+55${digitos}` : null;
    return digitos;
  }
  if (digitos.length === 13 && digitos.startsWith("55")) return `+${digitos}`;
  return null;
}

/** Campo EMV: id + tamanho (2 dígitos) + valor. */
function campo(id: string, valor: string) {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Texto só com letras sem acento e símbolos simples, como o padrão pede. */
function ascii(texto: string, max: number) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * Código "Pix Copia e Cola" com chave e valor. null se a chave não for reconhecida
 * ou o valor não for positivo.
 */
export function codigoPix(d: { chave: string; valor: number | string; nome: string }): string | null {
  const chave = normalizarChavePix(d.chave);
  const valor = typeof d.valor === "number" ? d.valor : Number(String(d.valor).replace(",", "."));
  if (!chave || !Number.isFinite(valor) || valor <= 0) return null;

  const semCrc =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", ascii(d.nome, 25) || "Recebedor") +
    campo("60", "BRASIL") +
    campo("62", campo("05", "***")) +
    "6304";
  return semCrc + crc16(semCrc);
}
