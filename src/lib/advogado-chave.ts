/** Chave de busca do advogado: nome sem espaços extras e em minúsculas. Seguro para o navegador. */
export function chaveAdvogado(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}
