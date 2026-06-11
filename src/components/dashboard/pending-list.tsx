"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import type { TransacaoComRelacoes } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Check, ExternalLink, Loader2, Calendar, FileText, User, ShieldAlert } from "lucide-react";

type Props = {
  title: string;
  items: TransacaoComRelacoes[];
  emptyMessage: string;
  variant?: "warning" | "danger" | "success";
};

export function PendingList({ title, items, emptyMessage, variant = "warning" }: Props) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<TransacaoComRelacoes | null>(null);
  const [isPending, startTransition] = useTransition();

  const valueColor =
    variant === "success"
      ? "text-emerald-400"
      : variant === "danger"
      ? "text-rose-400"
      : "text-amber-400";

  async function handleMarkAsPaid(id: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/transacoes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAGO" }),
        });

        if (!res.ok) {
          alert("Erro ao atualizar o status do pagamento.");
          return;
        }

        setSelectedItem(null);
        router.refresh();
      } catch (error) {
        console.error("Erro ao marcar como pago:", error);
        alert("Ocorreu um erro ao atualizar o pagamento.");
      }
    });
  }

  return (
    <>
      <Card className="h-[400px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between shrink-0">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={variant}>{items.length}</Badge>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 overflow-y-auto pr-1.5 scroll-smooth">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            items.map((item) => {
              const dateObj = new Date(item.dataCompetencia);
              const itemDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
              const today = new Date();
              const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const diffTime = itemDate.getTime() - todayDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // usa floor para compensar fusos no calculo de dias completos
              
              const isTodayOrOverdue = diffDays <= 0;
              const isUpcomingCritical = diffDays > 0 && diffDays <= 3;

              let borderClass = "border-border/70 hover:bg-accent/40 hover:border-border";
              let badgeText = null;

              if (isTodayOrOverdue) {
                borderClass = "border-red-500/30 bg-red-500/5 shadow-md shadow-red-500/5 hover:bg-red-500/10 hover:border-red-500/50";
                badgeText = diffDays < 0 ? "Atrasado" : "Vence Hoje";
              } else if (isUpcomingCritical) {
                borderClass = "border-amber-500/30 bg-amber-500/5 shadow-md shadow-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50";
                badgeText = `Vence em ${diffDays}d`;
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={cn(
                    "w-full text-left block rounded-xl border p-3 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-pointer",
                    borderClass
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground text-sm">
                        {item.processo?.cliente.nome ?? item.contato?.nome ?? "Sem contato"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.descricao ?? item.processo?.numeroPje}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(item.dataCompetencia), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        {badgeText && (
                          <span className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset shrink-0 uppercase tracking-wider",
                            isTodayOrOverdue 
                              ? "bg-red-500/10 text-red-400 ring-red-500/20" 
                              : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                          )}>
                            {badgeText}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={cn("shrink-0 font-semibold text-sm", valueColor)}>{formatCurrency(Number(item.valor))}</p>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Modal de Ações */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            onClick={() => setSelectedItem(null)}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          {/* Content */}
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col space-y-4">
              <div>
                <Badge variant={variant} className="mb-2">
                  {variant === "success" ? "Recebimento Pendente" : "Pagamento Pendente"}
                </Badge>
                <h3 className="text-lg font-bold text-foreground">Opções do Lançamento</h3>
                <p className="text-xs text-muted-foreground">Escolha uma ação para esta transação pendente.</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Cliente / Contato</p>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedItem.clienteNome || selectedItem.processo?.cliente.nome || selectedItem.contato?.nome || "Sem contato"}
                    </p>
                  </div>
                </div>

                {(selectedItem.processoNumero || selectedItem.processo?.numeroPje) && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Processo (PJE)</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedItem.processoNumero || selectedItem.processo?.numeroPje}
                      </p>
                    </div>
                  </div>
                )}

                {selectedItem.reclamada && (
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Empresa Reclamada</p>
                      <p className="text-sm font-semibold text-foreground">{selectedItem.reclamada}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Data de Competência</p>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(selectedItem.dataCompetencia), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Valor do Lançamento</span>
                  <span className={cn("text-xl font-extrabold", valueColor)}>
                    {formatCurrency(Number(selectedItem.valor))}
                  </span>
                </div>
              </div>

              {selectedItem.descricao && (
                <p className="text-xs text-muted-foreground italic bg-muted/10 p-2.5 rounded-lg border border-border/30">
                  &ldquo;{selectedItem.descricao}&rdquo;
                </p>
              )}

              <div className="grid gap-2 pt-2">
                <Button 
                  onClick={() => handleMarkAsPaid(selectedItem.id)}
                  variant="success" 
                  size="default"
                  className="w-full gap-2 h-11 text-white cursor-pointer"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Marcar como Pago
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      setSelectedItem(null);
                      router.push(`/lancamentos/novo?edit=${selectedItem.id}`);
                    }}
                    variant="outline"
                    className="gap-1.5 h-11 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Editar Detalhes
                  </Button>
                  <Button
                    onClick={() => setSelectedItem(null)}
                    variant="ghost"
                    className="h-11 cursor-pointer"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
