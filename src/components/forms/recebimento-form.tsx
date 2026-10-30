"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, maskCurrencyInput } from "@/lib/utils";
import { calcularParcelas, centavosParaString, distribuirRestante, paraCentavos, MAX_PARCELAS, type ResultadoParcelas } from "@/lib/parcelas";
import { dataLocal, hojeSaoPaulo } from "@/lib/datas";
import type { RecebimentoSerializado } from "@/lib/recebimentos";

type ProcessoOption = { id: string; numeroPje: string; nomeAcao: string; clienteNome: string };

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const PERCENTUAIS_RAPIDOS = ["20", "30", "40"];

/** "2.500,00" (máscara) → "2500.00" */
function mascaraParaDecimal(mascara: string): string {
  const digitos = mascara.replace(/\D/g, "");
  return centavosParaString(BigInt(digitos || "0"));
}

function decimalParaMascara(decimal: string): string {
  return maskCurrencyInput(decimal.replace(".", ""));
}

type Ajuste = { valor?: string; vencimento?: string };

/** Na edição: marca como "ajuste" as parcelas cujo valor ou data difere do cálculo automático. */
function ajustesIniciais(r: RecebimentoSerializado): Record<number, Ajuste> {
  try {
    const base = calcularParcelas({
      valorTotal: r.valorTotal,
      percentualEscritorio: r.percentualEscritorio,
      numeroParcelas: r.numeroParcelas,
      primeiroVencimento: r.dataPrimeiroVencimento,
    });
    const out: Record<number, Ajuste> = {};
    r.parcelas.forEach((p, i) => {
      const b = base.parcelas[i];
      const a: Ajuste = {};
      if (!b || b.valorParcela !== p.valorParcela) a.valor = decimalParaMascara(p.valorParcela);
      if (!b || b.vencimento !== p.vencimento) a.vencimento = p.vencimento;
      if (a.valor || a.vencimento) out[i] = a;
    });
    return out;
  } catch {
    return {};
  }
}

function percentualTexto(p: string) {
  return String(Number(p));
}

type Props = {
  processos: ProcessoOption[];
  /** Pix já usados por cliente (nome em minúsculas → chave). */
  pixConhecidos?: Record<string, string>;
  /** Causa existente: o formulário vira edição. */
  inicial?: RecebimentoSerializado;
};

export function RecebimentoForm({ processos, inicial, pixConhecidos = {} }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editando = !!inicial;
  // Com parcela já recebida, valores e parcelas ficam travados.
  const bloqueada = !!inicial?.parcelas.some((p) => p.statusRecebimento === "RECEBIDO");

  const [processoNumero, setProcessoNumero] = useState(inicial?.processoNumero ?? "");
  const [processoId, setProcessoId] = useState(inicial?.processoId ?? "");
  const [clienteNome, setClienteNome] = useState(inicial?.clienteNome ?? "");
  const [clientePix, setClientePix] = useState(inicial?.clientePix ?? "");
  const [pixAuto, setPixAuto] = useState(false);
  const [reclamada, setReclamada] = useState(inicial?.reclamada ?? "");
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? "");

  const [valorTotal, setValorTotal] = useState(inicial ? decimalParaMascara(inicial.valorTotal) : "");
  const [percentual, setPercentual] = useState(inicial ? percentualTexto(inicial.percentualEscritorio) : "30");
  const [numeroParcelas, setNumeroParcelas] = useState(inicial?.numeroParcelas ?? 1);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(inicial?.dataPrimeiroVencimento ?? hojeSaoPaulo());
  const [ajustes, setAjustes] = useState<Record<number, Ajuste>>(() => (inicial ? ajustesIniciais(inicial) : {}));
  // Causas que começaram antes do sistema: primeiras parcelas já pagas pela empresa.
  const [jaPagas, setJaPagas] = useState(0);
  const [jaRepassadas, setJaRepassadas] = useState(true);

  const [erro, setErro] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);

  // Mudar total, nº de parcelas ou 1º vencimento refaz a divisão e descarta ajustes manuais.
  const mudarBase = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setAjustes({});
  };
  const setTotal = mudarBase(setValorTotal);
  const setParcelas = mudarBase((n: number) => setNumeroParcelas(Math.min(MAX_PARCELAS, Math.max(1, n || 1))));
  const setPrimeiro = mudarBase(setPrimeiroVencimento);

  const temAjustes = Object.keys(ajustes).length > 0;
  const totalDecimal = mascaraParaDecimal(valorTotal);

  // Cálculo ao vivo, com a mesma função que o servidor usa.
  const previa = useMemo((): { ok: true; r: ResultadoParcelas } | { ok: false; erro: string } | null => {
    if (paraCentavos(totalDecimal) <= BigInt(0) || !primeiroVencimento) return null;
    try {
      const base = calcularParcelas({
        valorTotal: totalDecimal,
        percentualEscritorio: percentual || "0",
        numeroParcelas,
        primeiroVencimento,
      });
      if (!temAjustes) return { ok: true, r: base };

      // Parcelas com valor digitado ficam fixas; o resto do total se divide entre as outras.
      const dist = distribuirRestante(
        totalDecimal,
        base.parcelas.map((_, i) => (ajustes[i]?.valor ? mascaraParaDecimal(ajustes[i].valor!) : undefined))
      );
      if (!dist.ok) return { ok: false, erro: dist.erro };
      const valores = dist.valores;
      const r = calcularParcelas({
        valorTotal: totalDecimal,
        percentualEscritorio: percentual || "0",
        numeroParcelas,
        primeiroVencimento,
        valoresParcelas: valores,
      });
      r.parcelas = r.parcelas.map((p, i) => ({ ...p, vencimento: ajustes[i]?.vencimento || p.vencimento }));
      return { ok: true, r };
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : "Dados inválidos." };
    }
  }, [totalDecimal, percentual, numeroParcelas, primeiroVencimento, ajustes, temAjustes]);

  function ajustar(i: number, campo: keyof Ajuste, valor: string) {
    setAjustes((prev) => {
      const atual = { ...prev[i], [campo]: valor };
      // Valor apagado (zero) volta a ser calculado automaticamente.
      if (campo === "valor" && !/[1-9]/.test(valor)) delete atual.valor;
      const novo = { ...prev };
      if (atual.valor || atual.vencimento) novo[i] = atual;
      else delete novo[i];
      return novo;
    });
  }

  function escolherProcesso(valor: string) {
    setProcessoNumero(valor);
    const p = processos.find((x) => x.numeroPje === valor);
    setProcessoId(p?.id ?? "");
    if (p && !clienteNome) setClienteNome(p.clienteNome);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTentouEnviar(true);
    setErro("");
    if (!clienteNome.trim()) return setErro("Informe o nome do cliente.");
    if (!previa) return setErro("Informe o valor total e a data do 1º vencimento.");
    if (!previa.ok) return setErro(previa.erro);

    const r = previa.r;
    const body = {
      clienteNome: clienteNome.trim(),
      clientePix: clientePix.trim() || undefined,
      reclamada: reclamada.trim() || undefined,
      processoNumero: processoNumero.trim() || undefined,
      processoId: processoId || undefined,
      observacoes: observacoes.trim() || undefined,
      valorTotal: r.valorTotal,
      percentualEscritorio: percentual || "0",
      numeroParcelas,
      primeiroVencimento,
      parcelasJaPagas: bloqueada ? 0 : jaPagasEf,
      jaRepassadas,
      parcelas:
        temAjustes && !bloqueada ? r.parcelas.map((p) => ({ valorParcela: p.valorParcela, vencimento: p.vencimento })) : undefined,
    };

    startTransition(async () => {
      try {
        const res = await fetch(editando ? `/api/recebimentos/${inicial!.id}` : "/api/recebimentos", {
          method: editando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErro(typeof d.error === "string" ? d.error : "Confira os campos e tente de novo.");
          return;
        }
        router.push("/recebimentos");
        router.refresh();
      } catch {
        setErro("Erro de conexão. Tente de novo.");
      }
    });
  }

  const r = previa?.ok ? previa.r : null;
  const jaPagasEf = Math.min(jaPagas, numeroParcelas);
  const hoje = hojeSaoPaulo();
  const linhas = calcularLinhas(r, totalDecimal, percentual, numeroParcelas, primeiroVencimento);
  const vencidas = linhas.filter((l, i) => (ajustes[i]?.vencimento ?? l.vencimento) < hoje).length;

  /** Situação de cada parcela na prévia (já paga / repassada). */
  function situacao(i: number): { recebida: boolean; repassada: boolean } | null {
    if (bloqueada) {
      const p = inicial?.parcelas[i];
      return p ? { recebida: p.statusRecebimento === "RECEBIDO", repassada: p.statusRepasse === "REPASSADO" } : null;
    }
    return i < jaPagasEf ? { recebida: true, repassada: jaRepassadas } : null;
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 lg:grid-cols-5 lg:items-start" noValidate>
      {/* Dados da causa */}
      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Causa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processoNumero">Número do processo</Label>
              <Input
                id="processoNumero"
                list="processos-list"
                inputMode="numeric"
                placeholder="0000000-00.0000.0.00.0000"
                value={processoNumero}
                onChange={(e) => escolherProcesso(e.target.value)}
                className="h-11"
              />
              <datalist id="processos-list">
                {processos.map((p) => (
                  <option key={p.id} value={p.numeroPje}>
                    {p.clienteNome}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clienteNome">
                  Cliente <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="clienteNome"
                  placeholder="Quem recebe o repasse"
                  value={clienteNome}
                  onChange={(e) => {
                    setClienteNome(e.target.value);
                    // Cliente que já tem Pix em outra causa: preenche sozinho (sem apagar o que foi digitado).
                    const conhecido = pixConhecidos[e.target.value.trim().toLowerCase()];
                    if (conhecido && (!clientePix || pixAuto)) {
                      setClientePix(conhecido);
                      setPixAuto(true);
                    }
                  }}
                  aria-invalid={tentouEnviar && !clienteNome.trim()}
                  className={cn("h-11", tentouEnviar && !clienteNome.trim() && "border-rose-500/60")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reclamada">Empresa / reclamada</Label>
                <Input id="reclamada" placeholder="Quem paga o escritório" value={reclamada} onChange={(e) => setReclamada(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientePix">Pix do cliente (para o repasse)</Label>
              <Input
                id="clientePix"
                placeholder="CPF, celular, e-mail ou chave aleatória"
                value={clientePix}
                onChange={(e) => {
                  setClientePix(e.target.value);
                  setPixAuto(false);
                }}
                autoComplete="off"
                className="h-11 font-mono"
              />
              {pixAuto && <p className="text-xs text-muted-foreground">Preenchido com o Pix usado em outra causa deste cliente.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input id="observacoes" placeholder="Opcional" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="h-11" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valores e parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            {bloqueada && (
              <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                Esta causa já tem parcela recebida, então valores e parcelas não podem mudar. Para trocar a data de uma parcela pendente,
                toque nela em Recebimentos.
              </p>
            )}
            <fieldset disabled={bloqueada} className="space-y-4 disabled:opacity-60">
            <div className="space-y-2">
              <Label htmlFor="valorTotal">
                Valor total da causa <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
                <Input
                  id="valorTotal"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valorTotal}
                  onChange={(e) => setTotal(maskCurrencyInput(e.target.value))}
                  className="pl-11 text-xl font-bold tabular-nums"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="percentual">% do escritório</Label>
                <div className="flex gap-1.5">
                  {PERCENTUAIS_RAPIDOS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPercentual(p)}
                      aria-pressed={percentual === p}
                      className={cn(
                        "h-11 w-12 shrink-0 rounded-xl border text-sm font-semibold transition-colors",
                        percentual === p ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-accent"
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                  <div className="relative min-w-0 flex-1">
                    <Input
                      id="percentual"
                      inputMode="decimal"
                      value={percentual}
                      onChange={(e) => setPercentual(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
                      className="h-11 pr-7 text-center font-semibold"
                      aria-label="Percentual personalizado"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroParcelas">Parcelas</Label>
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setParcelas(numeroParcelas - 1)} aria-label="Menos uma parcela">
                    <Minus />
                  </Button>
                  <Input
                    id="numeroParcelas"
                    inputMode="numeric"
                    value={numeroParcelas}
                    onChange={(e) => setParcelas(parseInt(e.target.value.replace(/\D/g, ""), 10))}
                    className="h-11 text-center text-base font-bold"
                  />
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setParcelas(numeroParcelas + 1)} aria-label="Mais uma parcela">
                    <Plus />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{numeroParcelas === 1 ? "À vista" : `${numeroParcelas} meses`}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primeiroVencimento">
                {numeroParcelas === 1 ? "Data do pagamento" : "1º vencimento"} <span className="text-rose-400">*</span>
              </Label>
              <Input id="primeiroVencimento" type="date" value={primeiroVencimento} onChange={(e) => setPrimeiro(e.target.value)} className="h-11" />
              {numeroParcelas > 1 && (
                <p className="text-xs text-muted-foreground">O mesmo dia se repete todo mês. Sábado e domingo passam para segunda.</p>
              )}
            </div>

            {!bloqueada && (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor="jaPagas">Já pagas antes do cadastro</Label>
                    <p className="text-xs text-muted-foreground">Para causas que começaram antes do sistema.</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setJaPagas(Math.max(0, jaPagasEf - 1))} aria-label="Uma a menos">
                      <Minus />
                    </Button>
                    <Input
                      id="jaPagas"
                      inputMode="numeric"
                      value={jaPagasEf}
                      onChange={(e) => setJaPagas(Math.min(numeroParcelas, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}
                      className="h-9 w-12 px-1 text-center font-bold"
                    />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setJaPagas(Math.min(numeroParcelas, jaPagasEf + 1))} aria-label="Uma a mais">
                      <Plus />
                    </Button>
                  </div>
                </div>
                {vencidas > 0 && jaPagasEf !== vencidas && (
                  <button type="button" onClick={() => setJaPagas(vencidas)} className="text-xs font-medium text-primary hover:underline">
                    Marcar as {vencidas} que já venceram como pagas
                  </button>
                )}
                {jaPagasEf > 0 && (
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={jaRepassadas} onChange={(e) => setJaRepassadas(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(217_91%_60%)]" />
                    <span>
                      O cliente também já recebeu a parte dele nessas {jaPagasEf === 1 ? "parcela" : `${jaPagasEf} parcelas`}
                    </span>
                  </label>
                )}
              </div>
            )}

            </fieldset>
          </CardContent>
        </Card>
      </div>

      {/* Prévia */}
      <div className="space-y-4 lg:sticky lg:top-24 lg:col-span-2">
        <Card className="border-primary/25">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prévia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!previa ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Digite o valor total para ver a divisão.
              </p>
            ) : (
              <>
                {r && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-emerald-500/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">Escritório ({percentual || 0}%)</p>
                      <p className="text-lg font-bold tabular-nums text-emerald-300">{formatCurrency(r.valorEscritorio)}</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">Cliente</p>
                      <p className="text-lg font-bold tabular-nums text-amber-200">{formatCurrency(r.valorCliente)}</p>
                    </div>
                  </div>
                )}

                {!previa.ok && (
                  <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                    {previa.erro}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {numeroParcelas === 1 ? "Pagamento" : `${numeroParcelas} parcelas`}
                    </p>
                    {temAjustes && (
                      <button type="button" onClick={() => setAjustes({})} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <RotateCcw className="h-3 w-3" /> Desfazer ajustes
                      </button>
                    )}
                  </div>
                  {numeroParcelas > 1 && !bloqueada && (
                    <p className="text-[11px] text-muted-foreground">
                      Acordo com entrada maior? Digite o valor na parcela e as outras se ajustam sozinhas.
                    </p>
                  )}
                  <ul className={cn("max-h-[26rem] space-y-2 overflow-y-auto pr-1", bloqueada && "pointer-events-none opacity-70")} aria-disabled={bloqueada}>
                    {linhas.map((linha, i) => {
                      const ajustada = !!ajustes[i];
                      const sit = situacao(i);
                      return (
                        <li key={i} className={cn("rounded-xl border p-2.5", ajustada ? "border-primary/40 bg-primary/5" : "border-border/70")}>
                          <div className="flex items-center gap-2">
                            <span className="w-9 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                              {i + 1}/{numeroParcelas}
                            </span>
                            {sit?.recebida && (
                              <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                                {sit.repassada ? "Paga e repassada" : "Paga"}
                              </span>
                            )}
                            <div className="relative min-w-0 flex-1">
                              <Input
                                type="date"
                                aria-label={`Vencimento da parcela ${i + 1}`}
                                value={ajustes[i]?.vencimento ?? linha.vencimento}
                                onChange={(e) => ajustar(i, "vencimento", e.target.value)}
                                className="h-9 rounded-lg px-2 text-sm"
                              />
                            </div>
                            <span className="w-7 shrink-0 text-[11px] text-muted-foreground">
                              {DIAS_SEMANA[dataLocal(ajustes[i]?.vencimento ?? linha.vencimento).getDay()]}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="relative w-36 shrink-0">
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                              <Input
                                inputMode="numeric"
                                aria-label={`Valor da parcela ${i + 1}`}
                                value={ajustes[i]?.valor ?? decimalParaMascara(linha.valorParcela)}
                                onChange={(e) => ajustar(i, "valor", maskCurrencyInput(e.target.value))}
                                className="h-9 rounded-lg pl-8 pr-2 text-sm font-semibold tabular-nums"
                              />
                            </div>
                            {linha.valorEscritorio && (
                              <p className="min-w-0 text-[11px] leading-tight text-muted-foreground">
                                <span className="text-emerald-300">{formatCurrency(linha.valorEscritorio)}</span> esc.
                                <br />
                                <span className="text-amber-200">{formatCurrency(linha.valorCliente!)}</span> cliente
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {erro && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">
                {erro}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              {editando ? "Salvar alterações" : numeroParcelas === 1 ? "Salvar causa" : `Salvar causa em ${numeroParcelas} parcelas`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

/**
 * Linhas da tabela de parcelas. Quando a soma não fecha (prévia inválida), ainda mostra
 * as linhas com as datas e valores base, para o usuário conseguir corrigir.
 */
function calcularLinhas(
  r: ResultadoParcelas | null,
  totalDecimal: string,
  percentual: string,
  n: number,
  primeiro: string
): { vencimento: string; valorParcela: string; valorEscritorio?: string; valorCliente?: string }[] {
  if (r) return r.parcelas;
  try {
    return calcularParcelas({ valorTotal: totalDecimal, percentualEscritorio: percentual || "0", numeroParcelas: n, primeiroVencimento: primeiro }).parcelas.map(
      (p) => ({ vencimento: p.vencimento, valorParcela: p.valorParcela })
    );
  } catch {
    return [];
  }
}
