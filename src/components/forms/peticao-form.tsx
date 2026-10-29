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
import { chaveAdvogado } from "@/lib/advogado-chave";
import type { PeticaoSerializada } from "@/lib/peticoes";
import type { SugestoesAudiencia } from "./audiencia-form";

const TIPOS_COMUNS = ["Inicial", "Contestação", "Réplica", "Recurso ordinário", "Embargos", "Manifestação", "Cálculos"];

const SITUACOES = [
  { id: "A_PAGAR", label: "Não pago" },
  { id: "PAGA", label: "Pago" },
] as const;

type Status = (typeof SITUACOES)[number]["id"];

function mascara(decimal: string | null) {
  return decimal ? maskCurrencyInput(decimal.replace(".", "")) : "";
}

export function PeticaoForm({ sugestoes, inicial }: { sugestoes: SugestoesAudiencia; inicial?: PeticaoSerializada }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [advogadoNome, setAdvogadoNome] = useState(inicial?.advogadoNome ?? "");
  const [advogadoPix, setAdvogadoPix] = useState(inicial?.advogadoPix ?? "");
  const [pixAuto, setPixAuto] = useState(false);

  function mudarAdvogado(nome: string) {
    setAdvogadoNome(nome);
    // Advogado já cadastrado: traz o Pix dele (sem apagar o que foi digitado à mão).
    const conhecido = sugestoes.pixAdvogados?.[chaveAdvogado(nome)];
    if (conhecido && (!advogadoPix || pixAuto)) {
      setAdvogadoPix(conhecido);
      setPixAuto(true);
    }
  }
  const [clienteNome, setClienteNome] = useState(inicial?.clienteNome ?? "");
  const [reclamada, setReclamada] = useState(inicial?.reclamada ?? "");
  const [processoNumero, setProcessoNumero] = useState(inicial?.processoNumero ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [dataEntrega, setDataEntrega] = useState(inicial?.dataEntrega ?? hojeSaoPaulo());
  const [valor, setValor] = useState(mascara(inicial?.valor ?? null));
  const [status, setStatus] = useState<Status>(inicial?.status === "PAGA" ? "PAGA" : "A_PAGAR");
  const [dataPagamento, setDataPagamento] = useState(inicial?.dataPagamento ?? hojeSaoPaulo());
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

  const digitos = valor.replace(/\D/g, "");

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    setErro("");
    if (!advogadoNome.trim() || !clienteNome.trim() || !descricao.trim() || !dataEntrega) {
      setErro("Preencha advogado, cliente, qual petição e a data de entrega.");
      return;
    }
    if (status === "PAGA" && !/[1-9]/.test(digitos)) {
      setErro("Informe o valor para marcar como paga.");
      return;
    }
    const body = {
      advogadoNome: advogadoNome.trim(),
      advogadoPix: advogadoPix.trim(),
      clienteNome: clienteNome.trim(),
      reclamada: reclamada.trim() || undefined,
      processoNumero: processoNumero.trim() || undefined,
      descricao: descricao.trim(),
      dataEntrega,
      observacoes: observacoes.trim() || undefined,
      valor: digitos ? centavosParaString(BigInt(digitos)) : undefined,
      status,
      dataPagamento: status === "PAGA" ? dataPagamento : undefined,
    };
    startTransition(async () => {
      try {
        const res = await fetch(inicial ? `/api/peticoes/${inicial.id}` : "/api/peticoes", {
          method: inicial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErro(typeof d.error === "string" ? d.error : "Não foi possível salvar.");
          return;
        }
        router.push("/peticoes");
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
          <div className="space-y-2">
            <Label htmlFor="pet-advogado">
              Advogado que fez <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="pet-advogado"
              list="pet-advogados-list"
              value={advogadoNome}
              onChange={(e) => mudarAdvogado(e.target.value)}
              aria-invalid={invalido(advogadoNome)}
              className={cn("h-11", invalido(advogadoNome) && "border-rose-500/60")}
            />
            <datalist id="pet-advogados-list">
              {sugestoes.advogados.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet-pix">Pix do advogado</Label>
            <Input
              id="pet-pix"
              placeholder="Para pagar o advogado (opcional)"
              value={advogadoPix}
              onChange={(e) => {
                setAdvogadoPix(e.target.value);
                setPixAuto(false);
              }}
              autoComplete="off"
              className="h-11 font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {pixAuto ? "Pix já cadastrado deste advogado. " : ""}Fica salvo para todas as audiências e petições dele.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet-descricao">
              Qual petição <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="pet-descricao"
              list="pet-tipos-list"
              placeholder="Ex.: Contestação"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              aria-invalid={invalido(descricao)}
              className={cn("h-11", invalido(descricao) && "border-rose-500/60")}
            />
            <datalist id="pet-tipos-list">
              {TIPOS_COMUNS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet-processo">Número do processo</Label>
            <Input
              id="pet-processo"
              list="pet-processos-list"
              inputMode="numeric"
              placeholder="Escolha um processo para preencher cliente e empresa"
              value={processoNumero}
              onChange={(e) => escolherProcesso(e.target.value)}
              className="h-11"
            />
            <datalist id="pet-processos-list">
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
              <Label htmlFor="pet-cliente">
                Cliente <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="pet-cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                aria-invalid={invalido(clienteNome)}
                className={cn("h-11", invalido(clienteNome) && "border-rose-500/60")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet-empresa">Empresa</Label>
              <Input id="pet-empresa" value={reclamada} onChange={(e) => setReclamada(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pet-entrega">
                Data de entrega <span className="text-rose-400">*</span>
              </Label>
              <Input id="pet-entrega" type="date" value={dataEntrega} max={hojeSaoPaulo()} onChange={(e) => setDataEntrega(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet-valor">Valor da petição</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
                <Input
                  id="pet-valor"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/\D/g, "") ? maskCurrencyInput(e.target.value) : "")}
                  className="h-11 pl-11 font-semibold tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Situação</Label>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup">
              {SITUACOES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={status === s.id}
                  onClick={() => setStatus(s.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
                    status === s.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {status === "PAGA" && (
              <div className="space-y-1 pt-1">
                <Label htmlFor="pet-pagamento">Data do pagamento</Label>
                <Input id="pet-pagamento" type="date" value={dataPagamento} max={hojeSaoPaulo()} onChange={(e) => setDataPagamento(e.target.value)} className="h-11" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet-obs">Observações</Label>
            <Input id="pet-obs" placeholder="Opcional" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="h-11" />
          </div>

          {erro && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">
              {erro}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
            {inicial ? "Salvar alterações" : "Salvar petição"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
