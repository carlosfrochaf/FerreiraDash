// Regras dos documentos dos clientes. Puro (roda no navegador e no servidor).

export type TipoDoc =
  | "RG_CNH"
  | "CPF"
  | "COMPROVANTE_ENDERECO"
  | "CTPS"
  | "PROCURACAO"
  | "CONTRATO_HONORARIOS"
  | "DECLARACAO_HIPOSSUFICIENCIA"
  | "PETICAO"
  | "DECISAO"
  | "ACORDO_ATA"
  | "ALVARA"
  | "COMPROVANTE"
  | "TRCT"
  | "HOLERITE"
  | "EXTRATO_FGTS"
  | "CARTAO_PONTO"
  | "CONTRATO_TRABALHO"
  | "AVISO_PREVIO"
  | "ATESTADO"
  | "CAT"
  | "PRINTS"
  | "OUTRO";

const ROTULOS: Record<TipoDoc, string> = {
  RG_CNH: "RG / CNH",
  CPF: "CPF",
  COMPROVANTE_ENDERECO: "Comprovante de endereço",
  CTPS: "CTPS",
  PROCURACAO: "Procuração",
  CONTRATO_HONORARIOS: "Contrato de honorários",
  DECLARACAO_HIPOSSUFICIENCIA: "Declaração de hipossuficiência",
  PETICAO: "Petição",
  DECISAO: "Decisão / Sentença",
  ACORDO_ATA: "Acordo / Ata",
  ALVARA: "Alvará",
  COMPROVANTE: "Comprovante",
  TRCT: "TRCT",
  HOLERITE: "Holerite",
  EXTRATO_FGTS: "Extrato do FGTS",
  CARTAO_PONTO: "Cartão de ponto",
  CONTRATO_TRABALHO: "Contrato de trabalho",
  AVISO_PREVIO: "Aviso prévio",
  ATESTADO: "Atestado / laudo",
  CAT: "CAT",
  PRINTS: "Prints / mensagens",
  OUTRO: "Outro",
};

export const TIPOS_PESSOAIS: TipoDoc[] = ["RG_CNH", "CPF", "COMPROVANTE_ENDERECO", "CTPS"];
export const TIPOS_DA_CAUSA: TipoDoc[] = ["PROCURACAO", "CONTRATO_HONORARIOS", "DECLARACAO_HIPOSSUFICIENCIA", "PETICAO", "DECISAO", "ACORDO_ATA", "ALVARA", "COMPROVANTE", "TRCT", "HOLERITE", "EXTRATO_FGTS", "CARTAO_PONTO", "CONTRATO_TRABALHO", "AVISO_PREVIO", "ATESTADO", "CAT", "PRINTS"];
export const TODOS_OS_TIPOS: TipoDoc[] = [...TIPOS_PESSOAIS, ...TIPOS_DA_CAUSA, "OUTRO"];

// CPF não é foto: é o número digitado no cadastro (conferido à parte).
const PESSOAIS_OBRIGATORIOS: TipoDoc[] = ["RG_CNH", "COMPROVANTE_ENDERECO"];
const DA_CAUSA_OBRIGATORIOS: TipoDoc[] = ["PROCURACAO", "CONTRATO_HONORARIOS", "DECLARACAO_HIPOSSUFICIENCIA"];

export function rotuloTipo(tipo: TipoDoc): string {
  return ROTULOS[tipo] ?? tipo;
}

/**
 * O que falta: fotos pessoais (em qualquer lugar), para cada causa procuração, contrato e declaração de
 * hipossuficiência dela, e o número do CPF no cadastro (`cpf`: true quando falta; só confere se for informado).
 */
export function documentosFaltando(
  docs: { tipo: string; recebimentoId: string | null }[],
  causas: { id: string }[],
  cpfDoCadastro?: string | null
): { pessoais: TipoDoc[]; porCausa: Record<string, TipoDoc[]>; cpf: boolean } {
  const tem = new Set(docs.map((d) => d.tipo));
  const pessoais = PESSOAIS_OBRIGATORIOS.filter((t) => !tem.has(t));
  const porCausa: Record<string, TipoDoc[]> = {};
  for (const c of causas) {
    const daCausa = new Set(docs.filter((d) => d.recebimentoId === c.id).map((d) => d.tipo));
    const falta = DA_CAUSA_OBRIGATORIOS.filter((t) => !daCausa.has(t));
    if (falta.length) porCausa[c.id] = falta;
  }
  return { pessoais, porCausa, cpf: cpfDoCadastro !== undefined && !cpfDoCadastro?.trim() };
}

export const TAMANHO_MAXIMO = 10 * 1024 * 1024;
// O PJe só aceita PDF: as fotos são convertidas no navegador antes de enviar.
const MIMES = ["application/pdf"];

/** Mensagem de erro se o arquivo não puder ser enviado; null se estiver tudo certo. */
export function arquivoAceito(mime: string, tamanho: number): string | null {
  if (!MIMES.includes(mime)) return "Envie em PDF (fotos viram PDF sozinhas).";
  if (tamanho <= 0) return "Arquivo vazio.";
  if (tamanho > TAMANHO_MAXIMO) return "Arquivo maior que 10 MB.";
  return null;
}
