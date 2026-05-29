"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, FileText, Loader2, Plus, Minus, Search, Sparkles, Receipt, Coins } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { maskCurrencyInput, parseCurrencyInput, formatCurrency } from "@/lib/utils";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ProcessoOption = { id: string; numeroPje: string; nomeAcao: string; clienteNome: string };
type ContatoOption = { id: string; nome: string; tipo: string };
type CategoriaOption = { id: string; nome: string; tipo: string };

type Props = {
  processos: ProcessoOption[];
  contatos: ContatoOption[];
  categorias: CategoriaOption[];
};

export function AcordoForm({ processos, contatos, categorias }: Props) {
  const router = useRouter();

  // Filtrar apenas categorias de Entrada para o Acordo
  const categoriasEntrada = useMemo(() => {
    return categorias.filter((c) => c.tipo === "ENTRADA");
  }, [categorias]);

  const [categoriaId, setCategoriaId] = useState<string>(
    categoriasEntrada.find((c) => c.slug === "ALVARA_CAUSA_GANHA")?.id || categoriasEntrada[0]?.id || ""
  );

  const [valorParcelaMasked, setValorParcelaMasked] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState(5);
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [descricao, setDescricao] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [contatoId, setContatoId] = useState("");

  // Informações da causa/processo
  const [processoNumero, setProcessoNumero] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [reclamada, setReclamada] = useState("");

  // Campo de contato por texto com autocompletar
  const [contatoNome, setContatoNome] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loadingDatajud, setLoadingDatajud] = useState(false);

  // Calcula o valor total do acordo
  const valorUnitario = parseCurrencyInput(valorParcelaMasked);
  const valorTotal = valorUnitario * numeroParcelas;

  // Calcula o período das parcelas (Início a Fim)
  const resumoPeriodo = useMemo(() => {
    try {
      const dataInicio = new Date(dataPrimeiroVencimento);
      const dataFim = addMonths(dataInicio, numeroParcelas - 1);
      return {
        inicio: format(dataInicio, "MMM/yy", { locale: ptBR }),
        fim: format(dataFim, "MMM/yy", { locale: ptBR }),
      };
    } catch {
      return { inicio: "", fim: "" };
    }
  }, [dataPrimeiroVencimento, numeroParcelas]);

  function handleProcessoNumeroChange(val: string) {
    setProcessoNumero(val);
    const match = processos.find((p) => p.numeroPje === val);
    if (match) {
      setProcessoId(match.id);
      setClienteNome(match.clienteNome);
    } else {
      setProcessoId("");
    }
  }

  function handleContatoNomeChange(val: string) {
    setContatoNome(val);
    const match = contatos.find((c) => c.nome.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setContatoId(match.id);
      if (!clienteNome) setClienteNome(match.nome);
    } else {
      setContatoId("");
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
      setReclamada(data.reclamada);

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

    if (!categoriaId) {
      setErro("Por favor, selecione uma categoria.");
      return;
    }
    if (valorUnitario <= 0) {
      setErro("O valor de cada parcela deve ser maior que zero.");
      return;
    }
    if (!dataPrimeiroVencimento) {
      setErro("Selecione a data do primeiro vencimento.");
      return;
    }
    if (numeroParcelas <= 0) {
      setErro("O número de parcelas deve ser pelo menos 1.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          tipo: "ENTRADA",
          categoriaId,
          valor: valorUnitario,
          dataCompetencia: dataPrimeiroVencimento,
          status: "PENDENTE",
          descricao: descricao || `Acordo parcelado — ${processoNumero || clienteNome}`,
          processoId: processoId || undefined,
          contatoId: contatoId || undefined,
          processoNumero: processoNumero || undefined,
          clienteNome: clienteNome || contatoNome || undefined,
          reclamada: reclamada || undefined,
          numeroParcelas,
        };

        const res = await fetch("/api/transacoes/parcelado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErro(data.error ?? "Erro ao cadastrar acordo parcelado.");
          return;
        }

        setSucesso(true);
        setTimeout(() => {
          router.push("/historico");
          router.refresh();
        }, 1500);
      } catch (err) {
        console.error(err);
        setErro("Erro de rede ao salvar parcelamento.");
      }
    });
  }

  if (sucesso) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 animate-bounce">
          <Sparkles className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Acordo Cadastrado com Sucesso!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Geramos {numeroParcelas} parcelas de {formatCurrency(valorUnitario)} no seu extrato.
          </p>
          <p className="text-xs text-muted-foreground mt-2">Redirecionando para o histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
        <Card className="border-border/60 bg-card/65 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Informações do Acordo Parcelado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {erro && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/25 p-3 text-sm text-destructive">
                {erro}
              </div>
            )}

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria do Recebível</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger id="categoria" className="w-full h-11 bg-background/50 cursor-pointer">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasEntrada.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="cursor-pointer">
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor da Parcela e Quantidade */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valorParcela">Valor de Cada Parcela</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                  <Input
                    id="valorParcela"
                    type="text"
                    required
                    placeholder="0,00"
                    value={valorParcelaMasked}
                    onChange={(e) => setValorParcelaMasked(maskCurrencyInput(e.target.value))}
                    className="pl-9 h-11 bg-background/50 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroParcelas">Número de Parcelas (Meses)</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNumeroParcelas((prev) => Math.max(1, prev - 1))}
                    className="h-11 w-11 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="numeroParcelas"
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11 bg-background/50 text-center font-bold text-base"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNumeroParcelas((prev) => Math.min(120, prev + 1))}
                    className="h-11 w-11 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Primeiro Vencimento */}
            <div className="space-y-2">
              <Label htmlFor="dataPrimeiroVencimento" className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data do 1º Vencimento
              </Label>
              <Input
                id="dataPrimeiroVencimento"
                type="date"
                required
                value={dataPrimeiroVencimento}
                onChange={(e) => setDataPrimeiroVencimento(e.target.value)}
                className="h-11 bg-background/50 cursor-text"
              />
            </div>

            {/* Descrição Geral */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição / Observações do Acordo</Label>
              <Input
                id="descricao"
                placeholder="Ex: Acordo judicial firmado em audiência"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="h-11 bg-background/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações Processuais */}
        <Card className="border-border/60 bg-card/65 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Causa Jurídica Relacionada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Processo PJE */}
            <div className="space-y-2">
              <Label htmlFor="processoNumero">Número do Processo (PJE)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="processoNumero"
                    placeholder="0000000-00.0000.0.00.0000"
                    value={processoNumero}
                    onChange={(e) => handleProcessoNumeroChange(e.target.value)}
                    list="processos-acordo-list"
                    className="h-11 bg-background/50"
                  />
                  <datalist id="processos-acordo-list">
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

            {/* Nome do Cliente */}
            <div className="space-y-2">
              <Label htmlFor="clienteNome">Nome do Cliente (Credor)</Label>
              <div className="relative">
                <Input
                  id="clienteNome"
                  placeholder="Nome completo do beneficiário do acordo"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="h-11 bg-background/50"
                />
              </div>
            </div>

            {/* Contato (Devedor / Reclamada) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contatoNome">Contato do Devedor / Advogado</Label>
                <Input
                  id="contatoNome"
                  placeholder="Ex: Reclamada ou Advogado da Ré"
                  value={contatoNome}
                  onChange={(e) => handleContatoNomeChange(e.target.value)}
                  list="contatos-acordo-list"
                  className="h-11 bg-background/50"
                />
                <datalist id="contatos-acordo-list">
                  {contatos.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.tipo}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reclamada">Empresa Reclamada (Devedora)</Label>
                <Input
                  id="reclamada"
                  placeholder="Ex: Banco S.A. ou Empresa Ltda."
                  value={reclamada}
                  onChange={(e) => setReclamada(e.target.value)}
                  className="h-11 bg-background/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="w-full h-11 font-bold text-sm bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-lg shadow-primary/20 transition-all duration-300 gap-2 cursor-pointer mt-4"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>Gerar e Salvar {numeroParcelas} Parcelas</span>
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Resumo Dinâmico do Acordo (WOW Factor) */}
      <div className="space-y-6">
        <Card className="border-border/60 bg-gradient-to-br from-card/65 to-primary/5 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 -translate-y-6 translate-x-6 rounded-full bg-primary/10 blur-3xl -z-10" />
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-primary" />
              Resumo do Recebível
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground">Valor Total Contratado</p>
              <h3 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
                {formatCurrency(valorTotal)}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Parcelas</p>
                <p className="text-base font-extrabold text-primary mt-0.5">{numeroParcelas}x</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Valor Unitário</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(valorUnitario)}</p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Frequência:</span>
                <span className="font-semibold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">Mensal</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-semibold text-foreground">
                  {resumoPeriodo.inicio && resumoPeriodo.fim
                    ? `${resumoPeriodo.inicio} a ${resumoPeriodo.fim}`
                    : "Defina as datas"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Status Padrão:</span>
                <span className="font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                  Pendente
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 border border-border/40 p-3 space-y-2 text-xs">
              <p className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Como funciona o recebível?
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                O sistema criará {numeroParcelas} lançamentos individuais do tipo <b>Entrada</b> programados de mês em mês a partir de {dataPrimeiroVencimento ? format(new Date(dataPrimeiroVencimento + "T00:00:00"), "dd/MM/yyyy") : "hoje"}.
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Cada parcela aparecerá no seu <b>Histórico</b> e nos relatórios mensais como "Pendente", e você poderá marcá-las como "Pago" uma por uma conforme a reclamada realizar as transferências.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
