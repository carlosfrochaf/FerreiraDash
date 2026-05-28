import type {
  Contato,
  Processo,
  Repasse,
  StatusTransacao,
  TipoTransacao,
  Transacao,
} from "@prisma/client";

export type TransacaoComRelacoes = Transacao & {
  processo?: (Processo & { cliente: Contato }) | null;
  contato?: Contato | null;
};

export type DashboardResumo = {
  saldoAtual: number;
  entradasMes: number;
  saidasMes: number;
  fluxoMensal: { mes: string; entradas: number; saidas: number }[];
  repassesPendentes: TransacaoComRelacoes[];
  audienciasPendentes: TransacaoComRelacoes[];
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

export type RepasseFormData = {
  processoId: string;
  valorTotalRecebido: number;
  percentualEscritorio: number;
  dataRecebimento: string;
  observacoes?: string;
};

export type RepasseCalculado = {
  valorEscritorio: number;
  valorCliente: number;
};

export type { Repasse, Contato, Processo, Transacao };
