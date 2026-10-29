import type { AudienciaSerializada } from "@/lib/audiencias";
import type { PeticaoSerializada } from "@/lib/peticoes";
import type {
  Contato,
  Processo,
  Repasse,
  StatusTransacao,
  TipoTransacao,
  Transacao,
} from "@prisma/client";

export type TransacaoComRelacoes = Omit<Transacao, "valor"> & {
  valor: number;
  processo?: (Processo & { cliente: Contato }) | null;
  contato?: Contato | null;
};

/** Parcela com os dados da causa, pronta para listas no cliente. Valores em string "0.00". */
export type ParcelaResumo = {
  id: string;
  numero: number;
  totalParcelas: number;
  vencimento: string; // AAAA-MM-DD
  valorParcela: string;
  valorEscritorio: string;
  valorCliente: string;
  statusRecebimento: "PENDENTE" | "RECEBIDO";
  dataRecebimento: string | null;
  statusRepasse: "PENDENTE" | "REPASSADO";
  dataRepasse: string | null;
  recebimento: {
    id: string;
    clienteNome: string;
    clientePix: string | null;
    reclamada: string | null;
    processoNumero: string | null;
  };
};

export type DashboardResumo = {
  /** Saldo do escritório: só a parte do escritório das parcelas recebidas + lançamentos pagos. */
  saldoAtual: number;
  entradasMes: number;
  saidasMes: number;
  /** Parte dos clientes já recebida e ainda não repassada (não entra no saldo). */
  aRepassarClientes: number;
  /** Parte do escritório nas parcelas ainda não recebidas. */
  aReceberEscritorio: number;
  fluxoMensal: { mes: string; entradas: number; saidas: number }[];
  proximasEntradas: ParcelaResumo[];
  repassesClientes: ParcelaResumo[];
  proximasAudiencias: AudienciaSerializada[];
  audienciasAPagar: AudienciaSerializada[];
  /** Petições ainda não pagas. */
  peticoesPendentes: PeticaoSerializada[];
  recebiveisPendentes: TransacaoComRelacoes[];
};

export type LancamentoFormData = {
  tipo: TipoTransacao;
  categoriaId: string;
  valor: number;
  dataCompetencia: string;
  dataPagamento?: string;
  status: StatusTransacao;
  descricao?: string;
  processoId?: string;
  contatoId?: string;
  processoNumero?: string;
  clienteNome?: string;
  reclamada?: string;
};

export type { Repasse, Contato, Processo, Transacao };
