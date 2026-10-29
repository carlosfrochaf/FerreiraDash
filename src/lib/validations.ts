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
      .optional(),
  })
  .refine((d) => !d.parcelas || d.parcelas.length === d.numeroParcelas, {
    message: "A quantidade de parcelas não bate com o número informado",
    path: ["parcelas"],
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

export const repasseSchema = z.object({
  processoId: z.string().optional(),
  processoNumero: z.string().optional(),
  clienteNome: z.string().optional(),
  valorTotalRecebido: z.number().positive(),
  percentualEscritorio: z.number().min(1).max(99),
  dataRecebimento: z.string().min(1),
  observacoes: z.string().optional(),
});
