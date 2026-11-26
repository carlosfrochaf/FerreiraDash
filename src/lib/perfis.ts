// App do escritório: senha única, todo mundo entra como o dono. Mantém os nomes do app de teste.

export type Perfil = "DONO" | "FINANCEIRO" | "SECRETARIA" | "ADVOGADO";

/** Secretária não vê valores em dinheiro. */
export const veValores = (p: Perfil) => p !== "SECRETARIA";
export const editaClientes = (p: Perfil) => p !== "ADVOGADO";
export const soDoAdvogado = (p: Perfil) => p === "ADVOGADO";
