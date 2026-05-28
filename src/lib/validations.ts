import { z } from "zod";

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

export const repasseSchema = z.object({
  processoId: z.string().optional(),
  processoNumero: z.string().optional(),
  clienteNome: z.string().optional(),
  valorTotalRecebido: z.number().positive(),
  percentualEscritorio: z.number().min(1).max(99),
  dataRecebimento: z.string().min(1),
  observacoes: z.string().optional(),
});
