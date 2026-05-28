"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [valorMasked, setValorMasked] = useState("");
  const [percentual, setPercentual] = useState("30");
  const [dataRecebimento, setDataRecebimento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  const calculo = useMemo(() => {
    const total = parseCurrencyInput(valorMasked);
    const pct = parseFloat(percentual) || 0;
    if (total <= 0 || pct <= 0 || pct >= 100) return null;
    return calcularRepasse(total, pct);
  }, [valorMasked, percentual]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const valorTotal = parseCurrencyInput(valorMasked);
    const pct = parseFloat(percentual);

    if (!processoId) {
      setErro("Selecione o processo.");
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
          processoId,
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
      <Card className="border-primary/30">
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
          <div className="space-y-2">
            <Label>Processo / Causa</Label>
            <Select value={processoId} onValueChange={setProcessoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o processo" />
              </SelectTrigger>
              <SelectContent>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.numeroPje} — {p.clienteNome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorTotal">Valor Total Recebido (Alvará)</Label>
            <Input
              id="valorTotal"
              inputMode="decimal"
              placeholder="0,00"
              className="text-2xl font-bold"
              value={valorMasked}
              onChange={(e) => setValorMasked(maskCurrencyInput(e.target.value))}
              required
            />
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
            />
          </div>

          {calculo && (
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Honorários Escritório</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatCurrency(calculo.valorEscritorio)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Repasse ao Cliente</p>
                <p className="text-xl font-bold text-amber-400">
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
            />
          </div>

          {erro && <p className="text-sm text-rose-400">{erro}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
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
