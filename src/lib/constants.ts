import { MARCA } from "./marca";

/** Nome e subtítulo do escritório desta cópia (configuração da Vercel; padrão Ferreira & Rocha). */
export const APP_NAME = MARCA.nome;
export const APP_SUBTITLE = MARCA.subtitulo;

export const TIPO_CONTATO_LABELS = {
  CLIENTE: "Cliente",
  ADVOGADO_PARCEIRO: "Advogado Parceiro",
  FORNECEDOR: "Fornecedor",
  COLABORADOR: "Colaborador",
} as const;
