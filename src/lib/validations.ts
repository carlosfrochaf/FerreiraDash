import { z } from "zod";
import { dataValida } from "./datas";

export const transacaoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  categoriaId: z.string().min(1, "Selecione a categoria"),
  valor: z.number().positive("Valor deve ser maior que zero"),
  dataCompetencia: z.string().min(1),
  dataPagamento: z.string().optional(),
  status: z.enum(["PAGO", "PENDENTE", "NAO_PAGO"]),
  descricao: z.string().optional(),
  processoId: z.string().optional(),
  contatoId: z.string().optional(),
  
  // Novos campos opcionais da Causa Jurídica
  processoNumero: z.string().optional(),
  clienteNome: z.string().optional(),
  reclamada: z.string().optional(),
});

export const categoriaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  ativo: z.boolean().optional(),
});

// ---------- Recebimentos (causa/acordo em parcelas) ----------

const dataSchema = z.string().refine(dataValida, "Data inválida (use AAAA-MM-DD)");

const valorSchema = z.union([z.number(), z.string().trim().min(1)]);

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s : undefined));

export const recebimentoSchema = z
  .object({
    clienteNome: z.string().trim().min(1, "Informe o cliente"),
    /** Chave Pix do cliente para o repasse. */
    clientePix: z.string().trim().max(140).optional().transform((s) => (s ? s : undefined)),
    reclamada: textoOpcional,
    processoNumero: textoOpcional,
    processoId: textoOpcional,
    observacoes: textoOpcional,
    valorTotal: valorSchema,
    percentualEscritorio: valorSchema.default(30),
    numeroParcelas: z.coerce.number().int().min(1).max(120),
    primeiroVencimento: dataSchema,
    /** Opcional: parcelas ajustadas na prévia (valor e/ou data). */
    parcelas: z
      .array(z.object({ valorParcela: valorSchema, vencimento: dataSchema }))
      .max(120)
      .optional(),
    /** Causas antigas: quantas das primeiras parcelas a empresa já pagou antes do cadastro. */
    parcelasJaPagas: z.coerce.number().int().min(0).max(120).default(0),
    /** Nessas parcelas já pagas, o cliente também já recebeu a parte dele? */
    jaRepassadas: z.boolean().default(true),
  })
  .refine((d) => !d.parcelas || d.parcelas.length === d.numeroParcelas, {
    message: "A quantidade de parcelas não bate com o número informado",
    path: ["parcelas"],
  })
  .refine((d) => d.parcelasJaPagas <= d.numeroParcelas, {
    message: "Há mais parcelas já pagas do que parcelas na causa",
    path: ["parcelasJaPagas"],
  });

export type RecebimentoInput = z.infer<typeof recebimentoSchema>;

export const parcelaAcaoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("receber"), data: dataSchema.optional() }),
  z.object({ acao: z.literal("desfazer_recebimento") }),
  z.object({ acao: z.literal("repassar"), data: dataSchema.optional() }),
  z.object({ acao: z.literal("desfazer_repasse") }),
  z.object({ acao: z.literal("alterar_vencimento"), vencimento: dataSchema }),
]);

export type ParcelaAcao = z.infer<typeof parcelaAcaoSchema>;

// ---------- Audiências ----------

export const audienciaSchema = z.object({
  data: dataSchema,
  hora: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (use HH:MM)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  advogadoNome: z.string().trim().min(1, "Informe o advogado"),
  /** Pix do advogado (fica no cadastro do advogado). "" apaga; ausente não mexe. */
  advogadoPix: z.string().trim().max(140).optional(),
  clienteNome: z.string().trim().min(1, "Informe o cliente"),
  reclamada: textoOpcional,
  processoNumero: textoOpcional,
  observacoes: textoOpcional,
  /** Valor a pagar ao advogado; pode ficar em branco e ser definido depois. */
  valor: z
    .union([z.number(), z.string().trim()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
});

export type AudienciaInput = z.infer<typeof audienciaSchema>;

export const audienciaAcaoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("pagar"), data: dataSchema.optional() }),
  z.object({ acao: z.literal("desfazer_pagamento") }),
]);

export type AudienciaAcao = z.infer<typeof audienciaAcaoSchema>;

// ---------- Petições ----------

export const peticaoSchema = z
  .object({
    advogadoNome: z.string().trim().min(1, "Informe o advogado"),
    /** Pix do advogado (fica no cadastro do advogado). "" apaga; ausente não mexe. */
    advogadoPix: z.string().trim().max(140).optional(),
    clienteNome: z.string().trim().min(1, "Informe o cliente"),
    descricao: z.string().trim().min(1, "Informe qual petição foi feita"),
    dataEntrega: dataSchema,
    reclamada: textoOpcional,
    processoNumero: textoOpcional,
    observacoes: textoOpcional,
    valor: z
      .union([z.number(), z.string().trim()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    status: z.enum(["A_VALIDAR", "A_PAGAR", "PAGA"]).default("A_VALIDAR"),
    /** Só quando status = PAGA; se faltar, usa hoje. */
    dataPagamento: dataSchema.optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.status !== "PAGA" || d.valor !== undefined, {
    message: "Informe o valor para marcar como paga",
    path: ["valor"],
  });

export type PeticaoInput = z.infer<typeof peticaoSchema>;

export const peticaoAcaoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("validar") }),
  z.object({ acao: z.literal("desfazer_validacao") }),
  z.object({ acao: z.literal("pagar"), data: dataSchema.optional() }),
  z.object({ acao: z.literal("desfazer_pagamento") }),
]);

export type PeticaoAcao = z.infer<typeof peticaoAcaoSchema>;
