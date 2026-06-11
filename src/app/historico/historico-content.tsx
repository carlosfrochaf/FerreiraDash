"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  Trash2, 
  Edit2, 
  FileDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  FileText, 
  User, 
  FilterX,
  Loader2
} from "lucide-react";

type Transacao = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  valor: number;
  dataCompetencia: string;
  dataPagamento: string;
  status: "PAGO" | "PENDENTE" | "NAO_PAGO";
  descricao: string;
  processoNumero: string;
  clienteNome: string;
  reclamada: string;
  anexoUrl: string;
  anexoNome: string;
  categoria: {
    id: string;
    nome: string;
    tipo: string;
  };
  processo: {
    id: string;
    numeroPje: string;
    nomeAcao: string;
    cliente: {
      id: string;
      nome: string;
    };
  } | null;
  contato: {
    id: string;
    nome: string;
    tipo: string;
  } | null;
};

type Props = {
  initialTransacoes: Transacao[];
};

export function HistoricoContent({ initialTransacoes }: Props) {
  const router = useRouter();
  const [transacoes, setTransacoes] = useState<Transacao[]>(initialTransacoes);
  const [busca, setBusca] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"TODOS" | "HOJE" | "SEMANA" | "MES">("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "ENTRADA" | "SAIDA">("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "PAGO" | "PENDENTE" | "NAO_PAGO">("TODOS");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Filtragem dinâmica
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      // Filtro de tipo
      if (filtroTipo !== "TODOS" && t.tipo !== filtroTipo) return false;

      // Filtro de status
      if (filtroStatus !== "TODOS" && t.status !== filtroStatus) return false;

      // Filtro de período
      if (filtroPeriodo !== "TODOS") {
        const dateObj = new Date(t.dataCompetencia);
        const itemDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffTime = itemDate.getTime() - todayDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // compensa offsets

        if (filtroPeriodo === "HOJE") {
          if (diffDays !== 0) return false;
        } else if (filtroPeriodo === "SEMANA") {
          if (Math.abs(diffDays) > 7) return false;
        } else if (filtroPeriodo === "MES") {
          if (dateObj.getMonth() !== today.getMonth() || dateObj.getFullYear() !== today.getFullYear()) return false;
        }
      }

      // Busca por texto
      if (busca.trim()) {
        const query = busca.toLowerCase();
        const nomeCliente = (t.clienteNome || t.processo?.cliente.nome || t.contato?.nome || "").toLowerCase();
        const reclamada = t.reclamada.toLowerCase();
        const desc = t.descricao.toLowerCase();
        const numeroPje = (t.processoNumero || t.processo?.numeroPje || "").toLowerCase();
        const categoria = t.categoria.nome.toLowerCase();

        return (
          nomeCliente.includes(query) ||
          reclamada.includes(query) ||
          desc.includes(query) ||
          numeroPje.includes(query) ||
          categoria.includes(query)
        );
      }

      return true;
    });
  }, [transacoes, busca, filtroTipo, filtroStatus, filtroPeriodo]);

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este lançamento permanentemente?")) {
      return;
    }

    setPendingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/transacoes/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error ?? "Erro ao excluir o lançamento.");
          return;
        }

        setTransacoes((prev) => prev.filter((t) => t.id !== id));
        router.refresh();
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro de conexão ao excluir o lançamento.");
      } finally {
        setPendingId(null);
      }
    });
  }

  // Exportar dados filtrados para formato CSV/Excel
  function handleExportCSV() {
    if (transacoesFiltradas.length === 0) {
      alert("Nenhum lançamento encontrado para exportar.");
      return;
    }

    const headers = [
      "ID",
      "Tipo",
      "Categoria",
      "Cliente/Contato",
      "Valor (R$)",
      "Data Competencia",
      "Data Pagamento",
      "Status",
      "Descricao",
      "Processo (PJE)",
      "Reu/Reclamada",
    ];

    const rows = transacoesFiltradas.map((t) => {
      const cliente = t.clienteNome || t.processo?.cliente.nome || t.contato?.nome || "Sem contato";
      return [
        t.id,
        t.tipo,
        t.categoria.nome,
        `"${cliente.replace(/"/g, '""')}"`,
        t.valor,
        t.dataCompetencia,
        t.dataPagamento || "",
        t.status,
        `"${(t.descricao || "").replace(/"/g, '""')}"`,
        t.processoNumero || t.processo?.numeroPje || "",
        `"${(t.reclamada || "").replace(/"/g, '""')}"`,
      ];
    });

    // Adiciona o BOM UTF-8 (\uFEFF) para garantir suporte a acentos no Microsoft Excel
    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `extrato_ferreiradash_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Estatísticas rápidas baseadas nos filtros correntes
  const stats = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    transacoesFiltradas.forEach((t) => {
      if (t.tipo === "ENTRADA") entradas += t.valor;
      else saidas += t.valor;
    });
    return { entradas, saidas, total: entradas - saidas };
  }, [transacoesFiltradas]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, processo, reclamada, categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 h-10 border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer text-xs font-semibold"
            title="Exportar Extrato para Excel (CSV)"
          >
            <FileDown className="h-4 w-4" />
            <span>Exportar CSV</span>
          </Button>
        </div>

        {/* Filtros Rápidos (Período & Tipo) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-bold text-muted-foreground mr-1 uppercase tracking-wider">Período:</span>
            <Button
              size="sm"
              variant={filtroPeriodo === "TODOS" ? "default" : "outline"}
              onClick={() => setFiltroPeriodo("TODOS")}
              className="h-8 text-xs cursor-pointer"
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={filtroPeriodo === "HOJE" ? "default" : "outline"}
              onClick={() => setFiltroPeriodo("HOJE")}
              className="h-8 text-xs cursor-pointer"
            >
              Hoje
            </Button>
            <Button
              size="sm"
              variant={filtroPeriodo === "SEMANA" ? "default" : "outline"}
              onClick={() => setFiltroPeriodo("SEMANA")}
              className="h-8 text-xs cursor-pointer"
            >
              Esta Semana
            </Button>
            <Button
              size="sm"
              variant={filtroPeriodo === "MES" ? "default" : "outline"}
              onClick={() => setFiltroPeriodo("MES")}
              className="h-8 text-xs cursor-pointer"
            >
              Este Mês
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-bold text-muted-foreground mr-1 uppercase tracking-wider">Tipo:</span>
            <Button
              size="sm"
              variant={filtroTipo === "TODOS" ? "default" : "outline"}
              onClick={() => setFiltroTipo("TODOS")}
              className="h-8 text-xs cursor-pointer"
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={filtroTipo === "ENTRADA" ? "success" : "outline"}
              onClick={() => setFiltroTipo("ENTRADA")}
              className="h-8 text-xs cursor-pointer text-white"
            >
              Entradas
            </Button>
            <Button
              size="sm"
              variant={filtroTipo === "SAIDA" ? "danger" : "outline"}
              onClick={() => setFiltroTipo("SAIDA")}
              className="h-8 text-xs cursor-pointer text-white"
            >
              Saídas
            </Button>
          </div>
        </div>

        {/* Filtros por Status */}
        <div className="flex flex-wrap gap-1.5 items-center pt-3 border-t border-border/40">
          <span className="text-xs font-bold text-muted-foreground mr-1 uppercase tracking-wider">Status:</span>
          <Button
            size="sm"
            variant={filtroStatus === "TODOS" ? "default" : "outline"}
            onClick={() => setFiltroStatus("TODOS")}
            className="h-8 text-xs cursor-pointer"
          >
            Todos
          </Button>
          <Button
            size="sm"
            variant={filtroStatus === "PAGO" ? "success" : "outline"}
            onClick={() => setFiltroStatus("PAGO")}
            className="h-8 text-xs cursor-pointer text-white"
          >
            Pago
          </Button>
          <Button
            size="sm"
            variant={filtroStatus === "PENDENTE" ? "secondary" : "outline"}
            onClick={() => setFiltroStatus("PENDENTE")}
            className="h-8 text-xs cursor-pointer"
          >
            Pendente
          </Button>
          <Button
            size="sm"
            variant={filtroStatus === "NAO_PAGO" ? "danger" : "outline"}
            onClick={() => setFiltroStatus("NAO_PAGO")}
            className="h-8 text-xs cursor-pointer text-white"
          >
            Não Pago
          </Button>
        </div>
      </div>

      {/* Cards de Resumo Rápido */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between shadow-sm">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total de Entradas</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(stats.entradas)}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex flex-col justify-between shadow-sm">
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Total de Saídas</p>
          <p className="text-xl font-black text-rose-400 mt-1">{formatCurrency(stats.saidas)}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col justify-between shadow-sm">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Resultado (Filtro)</p>
          <p className={`text-xl font-black mt-1 ${stats.total >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(stats.total)}
          </p>
        </div>
      </div>

      {/* Listagem de Transações */}
      <div className="space-y-3 pb-8">
        {transacoesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card">
            <FilterX className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-bold text-foreground">Nenhum lançamento encontrado</h3>
            <p className="text-xs text-muted-foreground mt-1">Experimente alterar os termos de busca ou remover os filtros ativos.</p>
          </div>
        ) : (
          transacoesFiltradas.map((item) => {
            const isEntrada = item.tipo === "ENTRADA";
            const cnjNumero = item.processoNumero || item.processo?.numeroPje;
            const cliente = item.clienteNome || item.processo?.cliente.nome || item.contato?.nome || "Sem contato";

            // Calculo de Alerta de Vencimento
            const dateObj = new Date(item.dataCompetencia);
            const itemDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
            const today = new Date();
            const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diffTime = itemDate.getTime() - todayDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            const isPendente = item.status === "PENDENTE";
            const isTodayOrOverdue = isPendente && diffDays <= 0;
            const isUpcomingCritical = isPendente && diffDays > 0 && diffDays <= 3;

            let cardHighlightClass = "";
            let borderBadgeText = null;

            if (isTodayOrOverdue) {
              cardHighlightClass = "border-l-4 border-l-red-500 border-red-500/30 bg-red-500/[0.02] shadow-md shadow-red-500/5 hover:border-red-500/50 hover:bg-red-500/[0.05]";
              borderBadgeText = diffDays < 0 ? "Atrasado" : "Vence Hoje";
            } else if (isUpcomingCritical) {
              cardHighlightClass = "border-l-4 border-l-amber-500 border-amber-500/30 bg-amber-500/[0.02] shadow-md shadow-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/[0.05]";
              borderBadgeText = `Vence em ${diffDays}d`;
            } else {
              cardHighlightClass = isEntrada 
                ? "border-l-4 border-l-emerald-500 hover:bg-accent/10" 
                : "border-l-4 border-l-rose-500 hover:bg-accent/10";
            }

            return (
              <Card 
                key={item.id} 
                className={cn(
                  "overflow-hidden transition-all duration-300 hover:scale-[1.01] active:scale-[0.995] shadow-sm",
                  cardHighlightClass
                )}
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    
                    {/* Informações Principais */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isEntrada ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                            <ArrowUpRight className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                            <ArrowDownLeft className="h-3 w-3" />
                          </span>
                        )}
                        <span className="font-bold text-foreground truncate text-sm sm:text-base">
                          {cliente}
                        </span>
                        
                        <Badge 
                          variant={
                            item.status === "PAGO" 
                              ? "success" 
                              : item.status === "PENDENTE" 
                              ? "warning" 
                              : "danger"
                          }
                          className="text-[9px] uppercase tracking-wider font-bold h-4"
                        >
                          {item.status === "PAGO" ? "Pago" : item.status === "PENDENTE" ? "Pendente" : "Não Pago"}
                        </Badge>

                        {borderBadgeText && (
                          <span className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset shrink-0 uppercase tracking-wider",
                            diffDays <= 0 
                              ? "bg-red-500/10 text-red-400 ring-red-500/20" 
                              : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                          )}>
                            {borderBadgeText}
                          </span>
                        )}
                      </div>

                      {item.descricao && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {item.descricao}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(item.dataCompetencia), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>

                        {cnjNumero && (
                          <span className="flex items-center gap-1.5 font-medium text-primary/80">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            Proc: {cnjNumero}
                          </span>
                        )}

                        {item.reclamada && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            Réu: {item.reclamada}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor e Ações */}
                    <div className="flex sm:flex-col sm:items-end justify-between items-center shrink-0 gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                      
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block leading-none mb-1">
                          Valor
                        </span>
                        <span className={`text-base sm:text-lg font-extrabold ${isEntrada ? "text-emerald-400" : "text-rose-400"}`}>
                          {isEntrada ? "+" : "-"} {formatCurrency(item.valor)}
                        </span>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {item.anexoUrl && (
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                            title="Ver Anexo / Comprovante"
                          >
                            <a href={item.anexoUrl} target="_blank" rel="noopener noreferrer">
                              <FileDown className="h-4 w-4" />
                            </a>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => router.push(`/lancamentos/novo?edit=${item.id}`)}
                          title="Editar Lançamento"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                          onClick={() => handleDelete(item.id)}
                          disabled={pendingId === item.id}
                          title="Excluir Lançamento"
                        >
                          {pendingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>

                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
