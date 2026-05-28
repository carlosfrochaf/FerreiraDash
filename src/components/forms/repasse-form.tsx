"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calcularRepasse } from "@/lib/repasse-calculator";
import { formatCurrency, maskCurrencyInput, parseCurrencyInput } from "@/lib/utils";

type ProcessoOption = {
  id: string;
  numeroPje: string;
  nomeAcao: string;
  clienteNome: string;
};

type Props = {
  processos: ProcessoOption[];
};

export function RepasseForm({ processos }: Props) {
  const router = useRouter();
  const [processoId, setProcessoId] = useState("");
  const [processoNumero, setProcessoNumero] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [loadingDatajud, setLoadingDatajud] = useState(false);

  const [valorMasked, setValorMasked] = useState("");
  const [percentual, setPercentual] = useState("30");
  const [dataRecebimento, setDataRecebimento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  const isNovoProcesso = !processoId && processoNumero.trim().length > 0;

  const calculo = useMemo(() => {
    const total = parseCurrencyInput(valorMasked);
    const pct = parseFloat(percentual) || 0;
    if (total <= 0 || pct <= 0 || pct >= 100) return null;
    return calcularRepasse(total, pct);
  }, [valorMasked, percentual]);

  function handleProcessoNumeroChange(val: string) {
    setProcessoNumero(val);
    
    // Tenta associar a um processo existente no banco se coincidir com o número PJE
    const match = processos.find((p) => p.numeroPje === val.trim());
    if (match) {
      setProcessoId(match.id);
      setClienteNome(match.clienteNome);
    } else {
      setProcessoId("");
    }
  }

  async function handleBuscarDatajud() {
    const cleaned = processoNumero.replace(/\D/g, "");
    if (cleaned.length !== 20) {
      alert("Por favor, digite um número de processo CNJ completo com 20 dígitos para pesquisar no Datajud.");
      return;
    }

    setLoadingDatajud(true);
    setErro("");
    try {
      const res = await fetch(`/api/datajud?numero=${encodeURIComponent(processoNumero)}`);
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Erro ao buscar processo no Datajud.");
        return;
      }

      setProcessoNumero(data.numero);
      setClienteNome(data.cliente);

      // Tenta associar com algum processo no banco local
      const match = processos.find((p) => p.numeroPje.replace(/\D/g, "") === data.numero.replace(/\D/g, ""));
      if (match) {
        setProcessoId(match.id);
      }
    } catch (e) {
      console.error(e);
      setErro("Conexão com Datajud indisponível no momento.");
    } finally {
      setLoadingDatajud(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const valorTotal = parseCurrencyInput(valorMasked);
    const pct = parseFloat(percentual);

    if (!processoId && (!processoNumero.trim() || !clienteNome.trim())) {
      setErro("Selecione um processo existente ou digite o número do processo e o nome do cliente.");
      return;
    }
    if (valorTotal <= 0) {
      setErro("Informe o valor total recebido.");
      return;
    }
    if (pct <= 0 || pct >= 100) {
      setErro("Percentual do escritório deve estar entre 1 e 99.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/repasses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoId: processoId || undefined,
          processoNumero: processoId ? undefined : processoNumero.trim(),
          clienteNome: processoId ? undefined : clienteNome.trim(),
          valorTotalRecebido: valorTotal,
          percentualEscritorio: pct,
          dataRecebimento,
          observacoes: observacoes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao registrar repasse.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="border-primary/30 bg-card/65 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Módulo de Repasse
          </CardTitle>
          <CardDescription>
            Ao confirmar, o sistema gera automaticamente: Entrada do alvará, Entrada dos honorários
            do escritório e Saída de repasse pendente ao cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Processo / Causa Autocomplete */}
          <div className="space-y-2">
            <Label htmlFor="processoNumero">Processo / Causa (Digite ou selecione)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="processoNumero"
                  placeholder="Digite o número do processo (PJE)"
                  value={processoNumero}
                  onChange={(e) => handleProcessoNumeroChange(e.target.value)}
                  list="processos-repasse-list"
                  className="h-11 bg-background/50"
                  required
                />
                <datalist id="processos-repasse-list">
                  {processos.map((p) => (
                    <option key={p.id} value={p.numeroPje}>
                      {p.clienteNome} — {p.nomeAcao.slice(0, 30)}...
                    </option>
                  ))}
                </datalist>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleBuscarDatajud}
                disabled={loadingDatajud}
                className="h-11 px-4 cursor-pointer gap-1.5 shrink-0 hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                {loadingDatajud ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>Buscar</span>
              </Button>
            </div>
          </div>

          {/* Nome do Cliente (Fixo se selecionado, editável se for novo) */}
          {processoId ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Cliente Vinculado</span>
                <span className="font-semibold text-foreground">{clienteNome}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Processo Cadastrado</span>
            </div>
          ) : (
            processoNumero.trim() && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="clienteNome">Nome do Cliente (para cadastrar novo processo)</Label>
                <Input
                  id="clienteNome"
                  placeholder="Nome completo do cliente credor"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-amber-500/30 focus-visible:ring-amber-500"
                />
                <p className="text-[10px] text-amber-400 italic">
                  * Este processo e contato não existem no banco de dados. Eles serão criados automaticamente ao confirmar o repasse.
                </p>
              </div>
            )
          )}

          <div className="space-y-2">
            <Label htmlFor="valorTotal">Valor Total Recebido (Alvará)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
              <Input
                id="valorTotal"
                placeholder="0,00"
                className="pl-9 h-11 text-2xl font-bold bg-background/50"
                value={valorMasked}
                onChange={(e) => setValorMasked(maskCurrencyInput(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentual">Percentual do Escritório (%)</Label>
            <Input
              id="percentual"
              type="number"
              min={1}
              max={99}
              step="0.01"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
              required
              className="h-11 bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataRecebimento">Data do Recebimento</Label>
            <Input
              id="dataRecebimento"
              type="date"
              value={dataRecebimento}
              onChange={(e) => setDataRecebimento(e.target.value)}
              required
              className="h-11 bg-background/50"
            />
          </div>

          {calculo && (
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Honorários Escritório</p>
                <p className="text-xl font-extrabold text-emerald-400">
                  {formatCurrency(calculo.valorEscritorio)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Repasse ao Cliente</p>
                <p className="text-xl font-extrabold text-amber-400">
                  {formatCurrency(calculo.valorCliente)}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Input
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
              className="h-11 bg-background/50"
            />
          </div>

          {erro && <p className="text-sm text-rose-400 font-semibold">{erro}</p>}

          <Button type="submit" size="lg" className="w-full h-11 font-bold text-sm bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-lg shadow-primary/20 transition-all duration-300 cursor-pointer" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              "Confirmar Repasse"
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
