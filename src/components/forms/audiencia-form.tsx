"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn, maskCurrencyInput } from "@/lib/utils";
import { centavosParaString } from "@/lib/parcelas";
import { hojeSaoPaulo } from "@/lib/datas";
import type { AudienciaSerializada } from "@/lib/audiencias";

export type SugestoesAudiencia = {
  advogados: string[];
  processos: { numero: string; clienteNome: string; reclamada: string | null }[];
};

type Props = {
  sugestoes: SugestoesAudiencia;
  inicial?: AudienciaSerializada;
};

function mascara(decimal: string | null) {
  return decimal ? maskCurrencyInput(decimal.replace(".", "")) : "";
}

export function AudienciaForm({ sugestoes, inicial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState(inicial?.data ?? hojeSaoPaulo());
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [advogadoNome, setAdvogadoNome] = useState(inicial?.advogadoNome ?? "");
  const [clienteNome, setClienteNome] = useState(inicial?.clienteNome ?? "");
  const [reclamada, setReclamada] = useState(inicial?.reclamada ?? "");
  const [processoNumero, setProcessoNumero] = useState(inicial?.processoNumero ?? "");
  const [valor, setValor] = useState(mascara(inicial?.valor ?? null));
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? "");
  const [erro, setErro] = useState("");
  const [tentou, setTentou] = useState(false);

  function escolherProcesso(v: string) {
    setProcessoNumero(v);
    const p = sugestoes.processos.find((x) => x.numero === v);
    if (p) {
      if (!clienteNome) setClienteNome(p.clienteNome);
      if (!reclamada && p.reclamada) setReclamada(p.reclamada);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    setErro("");
    if (!data || !advogadoNome.trim() || !clienteNome.trim()) {
      setErro("Preencha data, advogado e cliente.");
      return;
    }
    const digitos = valor.replace(/\D/g, "");
    const body = {
      data,
      hora: hora || undefined,
      advogadoNome: advogadoNome.trim(),
      clienteNome: clienteNome.trim(),
      reclamada: reclamada.trim() || undefined,
      processoNumero: processoNumero.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      valor: digitos ? centavosParaString(BigInt(digitos)) : undefined,
    };
    startTransition(async () => {
      try {
        const res = await fetch(inicial ? `/api/audiencias/${inicial.id}` : "/api/audiencias", {
          method: inicial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErro(typeof d.error === "string" ? d.error : "Não foi possível salvar.");
          return;
        }
        router.push("/audiencias");
        router.refresh();
      } catch {
        setErro("Erro de conexão. Tente de novo.");
      }
    });
  }

  const invalido = (v: string) => tentou && !v.trim();

  return (
    <form onSubmit={enviar} noValidate className="max-w-2xl">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="aud-data">
                Data <span className="text-rose-400">*</span>
              </Label>
              <Input id="aud-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-11" />
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="aud-hora">Hora</Label>
              <Input id="aud-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aud-advogado">
              Advogado que vai fazer <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="aud-advogado"
              list="advogados-list"
              placeholder="Nome do advogado"
              value={advogadoNome}
              onChange={(e) => setAdvogadoNome(e.target.value)}
              aria-invalid={invalido(advogadoNome)}
              className={cn("h-11", invalido(advogadoNome) && "border-rose-500/60")}
            />
            <datalist id="advogados-list">
              {sugestoes.advogados.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aud-processo">Número do processo</Label>
            <Input
              id="aud-processo"
              list="aud-processos-list"
              inputMode="numeric"
              placeholder="Escolha um processo para preencher cliente e empresa"
              value={processoNumero}
              onChange={(e) => escolherProcesso(e.target.value)}
              className="h-11"
            />
            <datalist id="aud-processos-list">
              {sugestoes.processos.map((p) => (
                <option key={p.numero} value={p.numero}>
                  {p.clienteNome}
                  {p.reclamada ? ` × ${p.reclamada}` : ""}
                </option>
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aud-cliente">
                Cliente <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="aud-cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                aria-invalid={invalido(clienteNome)}
                className={cn("h-11", invalido(clienteNome) && "border-rose-500/60")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aud-empresa">Empresa</Label>
              <Input id="aud-empresa" value={reclamada} onChange={(e) => setReclamada(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aud-valor">Valor a pagar ao advogado</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
              <Input
                id="aud-valor"
                inputMode="numeric"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/\D/g, "") ? maskCurrencyInput(e.target.value) : "")}
                className="h-11 pl-11 font-semibold tabular-nums"
              />
            </div>
            <p className="text-xs text-muted-foreground">Pode deixar em branco e definir depois da audiência.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aud-obs">Observações</Label>
            <Input id="aud-obs" placeholder="Ex.: vara, local, link da sala" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="h-11" />
          </div>

          {erro && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">
              {erro}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
            {inicial ? "Salvar alterações" : "Salvar audiência"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
