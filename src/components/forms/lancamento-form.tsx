"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
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
import { maskCurrencyInput, parseCurrencyInput } from "@/lib/utils";
import { hojeSaoPaulo } from "@/lib/datas";
import { usaFormularioSimples } from "@/lib/formulario-lancamento";
import type { StatusTransacao, TipoTransacao } from "@prisma/client";

type ProcessoOption = { id: string; numeroPje: string; nomeAcao: string; clienteNome: string };
type ContatoOption = { id: string; nome: string; tipo: string };
type CategoriaOption = { id: string; nome: string; tipo: string; slug?: string | null };

type Props = {
  processos: ProcessoOption[];
  contatos: ContatoOption[];
  categorias: CategoriaOption[];
  transacaoEdicao?: {
    id: string;
    tipo: TipoTransacao;
    categoriaId: string;
    valor: number;
    dataCompetencia: string;
    dataPagamento: string;
    status: StatusTransacao;
    descricao: string;
    processoId: string;
    contatoId: string;
    processoNumero: string;
    clienteNome: string;
    reclamada: string;
    recorrencia?: { id: string; valor: number; ativa: boolean } | null;
  };
};

export function LancamentoForm({ processos, contatos, categorias, transacaoEdicao }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoInicial = transacaoEdicao?.tipo || (searchParams.get("tipo") as TipoTransacao) || "ENTRADA";

  const [tipo, setTipo] = useState<TipoTransacao>(tipoInicial);
  
  const [categoriaId, setCategoriaId] = useState<string>(
    transacaoEdicao?.categoriaId || categorias.filter((c) => c.tipo === tipoInicial)[0]?.id || ""
  );

  const [valorMasked, setValorMasked] = useState(
    transacaoEdicao ? maskCurrencyInput(transacaoEdicao.valor.toFixed(2)) : ""
  );
  const [dataCompetencia, setDataCompetencia] = useState(
    transacaoEdicao?.dataCompetencia || hojeSaoPaulo()
  );
  const [dataPagamento, setDataPagamento] = useState(transacaoEdicao?.dataPagamento || "");
  const [status, setStatus] = useState<StatusTransacao>(transacaoEdicao?.status || "PENDENTE");
  const [descricao, setDescricao] = useState(transacaoEdicao?.descricao || "");
  const [processoId, setProcessoId] = useState(transacaoEdicao?.processoId || "");
  const [contatoId, setContatoId] = useState(transacaoEdicao?.contatoId || "");

  // Novos campos opcionais da Causa Jurídica
  const [processoNumero, setProcessoNumero] = useState(transacaoEdicao?.processoNumero || "");
  const [clienteNome, setClienteNome] = useState(transacaoEdicao?.clienteNome || "");
  const [reclamada, setReclamada] = useState(transacaoEdicao?.reclamada || "");

  // Campo de contato por texto com autocompletar
  const [contatoNome, setContatoNome] = useState(() => {
    if (transacaoEdicao?.contatoId) {
      const match = contatos.find((c) => c.id === transacaoEdicao.contatoId);
      if (match) return match.nome;
    }
    return transacaoEdicao?.clienteNome || "";
  });

  const [repetir, setRepetir] = useState(false);
  const [recorrencia, setRecorrencia] = useState(transacaoEdicao?.recorrencia ?? null);
  const [avisoRecorrencia, setAvisoRecorrencia] = useState("");

  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  const slugCategoria = categorias.find((c) => c.id === categoriaId)?.slug;
  const simples = usaFormularioSimples(tipo, slugCategoria);
  const rotuloNome = slugCategoria === "SALARIO" ? "Nome do funcionário" : "Nome do custo";

  const categoriasFiltradas = useMemo(() => {
    return categorias.filter((c) => c.tipo === tipo);
  }, [categorias, tipo]);

  function handleTipoChange(novoTipo: TipoTransacao) {
    setTipo(novoTipo);
    const cats = categorias.filter((c) => c.tipo === novoTipo);
    setCategoriaId(cats[0]?.id || "");
  }

  function handleProcessoNumeroChange(val: string) {
    setProcessoNumero(val);
    
    // Tenta associar a um processo existente no banco se coincidir com o número PJE
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
    
    // Tenta associar a um contato existente se o nome for idêntico
    const match = contatos.find((c) => c.nome.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setContatoId(match.id);
      if (!clienteNome) {
        setClienteNome(match.nome);
      }
    } else {
      setContatoId("");
    }
  }

  const [loadingDatajud, setLoadingDatajud] = useState(false);

  async function handleBuscarDatajud() {
    const cleaned = processoNumero.replace(/\D/g, "");
    if (cleaned.length !== 20) {
      setErro("Digite o número completo do processo (20 dígitos) para buscar no Datajud.");
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
      if (data.cliente) setClienteNome(data.cliente);
      if (data.reclamada) setReclamada(data.reclamada);

      // Tenta associar com algum processo no banco local
      const match = processos.find((p) => p.numeroPje.replace(/\D/g, "") === data.numero.replace(/\D/g, ""));
      if (match) {
        setProcessoId(match.id);
      } else {
        setProcessoId("");
      }
    } catch (err) {
      console.error(err);
      setErro("Erro ao conectar com a busca do Datajud.");
    } finally {
      setLoadingDatajud(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const valor = parseCurrencyInput(valorMasked);
    if (valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (simples && !descricao.trim()) {
      setErro("Informe o nome.");
      return;
    }

    // Resolve IDs dinamicamente antes de submeter
    let finalProcessoId = processoId;
    if (processoNumero) {
      const match = processos.find((p) => p.numeroPje.replace(/\D/g, "") === processoNumero.replace(/\D/g, ""));
      if (match) finalProcessoId = match.id;
      else finalProcessoId = "";
    } else {
      finalProcessoId = "";
    }

    let finalContatoId = contatoId;
    if (contatoNome) {
      const match = contatos.find((c) => c.nome.toLowerCase() === contatoNome.trim().toLowerCase());
      if (match) finalContatoId = match.id;
      else finalContatoId = "";
    } else {
      finalContatoId = "";
    }

    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("categoriaId", categoriaId);
    formData.append("valor", String(valor));
    formData.append("dataCompetencia", dataCompetencia);
    if (dataPagamento) formData.append("dataPagamento", dataPagamento);
    formData.append("status", status);
    if (descricao) formData.append("descricao", descricao);
    if (simples) {
      if (repetir && !transacaoEdicao) formData.append("recorrente", "true");
    } else {
      if (finalProcessoId) formData.append("processoId", finalProcessoId);
      if (finalContatoId) formData.append("contatoId", finalContatoId);
      if (processoNumero) formData.append("processoNumero", processoNumero);

      let finalClienteNome = clienteNome;
      if (!finalClienteNome && contatoNome) {
        finalClienteNome = contatoNome;
      }
      if (finalClienteNome) formData.append("clienteNome", finalClienteNome);
      if (reclamada) formData.append("reclamada", reclamada);
    }

    startTransition(async () => {
      const url = transacaoEdicao ? `/api/transacoes/${transacaoEdicao.id}` : "/api/transacoes";
      const method = transacaoEdicao ? "PATCH" : "POST";
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(typeof data.error === "string" ? data.error : "Erro ao salvar lançamento.");
        return;
      }
      router.push(transacaoEdicao ? "/historico" : "/");
      router.refresh();
    });
  }

  async function alterarRecorrencia(corpo: { valor: number } | { ativa: false }) {
    if (!recorrencia) return;
    setErro("");
    setAvisoRecorrencia("");
    const res = await fetch(`/api/recorrencias/${recorrencia.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setErro(data?.error ?? "Não foi possível alterar a despesa recorrente.");
      return;
    }
    setRecorrencia({ id: data.id, valor: Number(data.valor), ativa: data.ativa });
    setAvisoRecorrencia("ativa" in corpo ? "Esta despesa não vai mais se repetir." : "Os próximos meses vão usar este valor.");
  }

  function pararDeRepetir() {
    if (!confirm("Parar de lançar esta despesa todo mês? Os meses já lançados continuam.")) return;
    alterarRecorrencia({ ativa: false });
  }

  function usarValorNosProximos() {
    const valor = parseCurrencyInput(valorMasked);
    if (valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    alterarRecorrencia({ valor });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>
            {transacaoEdicao
              ? `Editar Lançamento (#${transacaoEdicao.id.slice(-6)})`
              : tipo === "ENTRADA"
              ? "Nova Entrada"
              : "Nova Saída"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={tipo === "ENTRADA" ? "success" : "outline"}
              onClick={() => handleTipoChange("ENTRADA")}
            >
              Entrada
            </Button>
            <Button
              type="button"
              variant={tipo === "SAIDA" ? "danger" : "outline"}
              onClick={() => handleTipoChange("SAIDA")}
            >
              Saída
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              inputMode="decimal"
              placeholder="0,00"
              className="text-2xl font-bold"
              value={valorMasked}
              onChange={(e) => setValorMasked(maskCurrencyInput(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasFiltradas.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="competencia">{simples ? "Vencimento" : "Data da Competência"}</Label>
              <Input
                id="competencia"
                type="date"
                value={dataCompetencia}
                onChange={(e) => setDataCompetencia(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pagamento">Data do Pagamento</Label>
              <Input
                id="pagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusTransacao)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="NAO_PAGO">Não Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!simples && (
          <>
          {/* Novos Campos Opcionais da Causa Jurídica */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Informações da Causa / Processo</h4>
            
            <div className="space-y-2">
              <Label htmlFor="processoNumero">Número do Processo (PJE) ou Vincular Processo</Label>
              <div className="flex gap-2">
                <Input
                  id="processoNumero"
                  list="processos-list"
                  placeholder="Ex: 0001234-56.2024.8.26.0100 ou digite/selecione..."
                  value={processoNumero}
                  onChange={(e) => handleProcessoNumeroChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 px-3 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer shrink-0"
                  onClick={handleBuscarDatajud}
                  disabled={loadingDatajud}
                  title="Buscar no CNJ Datajud"
                >
                  {loadingDatajud ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline ml-1.5">Buscar</span>
                </Button>
              </div>
              <datalist id="processos-list">
                {processos.map((p) => (
                  <option key={p.id} value={p.numeroPje}>
                    {p.numeroPje} — {p.clienteNome}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clienteNome">Nome do Cliente</Label>
                <Input
                  id="clienteNome"
                  placeholder="Nome do cliente/autor"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reclamada">Empresa Reclamada</Label>
                <Input
                  id="reclamada"
                  placeholder="Nome do réu/devedor/empresa"
                  value={reclamada}
                  onChange={(e) => setReclamada(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contatoNome">Contato / Cliente (opcional)</Label>
            <Input
              id="contatoNome"
              list="contatos-list"
              placeholder="Digite o nome ou selecione um contato..."
              value={contatoNome}
              onChange={(e) => handleContatoNomeChange(e.target.value)}
            />
            <datalist id="contatos-list">
              {contatos.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome} ({c.tipo === "CLIENTE" ? "Cliente" : c.tipo === "ADVOGADO_PARCEIRO" ? "Advogado" : c.tipo === "FORNECEDOR" ? "Fornecedor" : "Colaborador"})
                </option>
              ))}
            </datalist>
          </div>
          </>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao">{simples ? rotuloNome : "Descrição"}</Label>
            <Input
              id="descricao"
              placeholder={
                !simples
                  ? "Ex: Audiência TJSP — custas e deslocamento"
                  : slugCategoria === "SALARIO"
                  ? "Ex.: Maria Souza"
                  : "Ex.: Aluguel, Tráfego pago – Google"
              }
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required={simples}
            />
          </div>

          {simples && !transacaoEdicao && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-primary"
                checked={repetir}
                onChange={(e) => setRepetir(e.target.checked)}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-semibold">Repetir todo mês</span>
                <span className="block text-xs text-muted-foreground">
                  O app lança sozinho todo mês, no mesmo dia, como pendente.
                </span>
              </span>
            </label>
          )}

          {recorrencia && (
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <p className="text-sm font-semibold">
                {recorrencia.ativa ? "Esta despesa se repete todo mês." : "Esta despesa parou de se repetir."}
              </p>
              {recorrencia.ativa && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={usarValorNosProximos}>
                    Usar este valor nos próximos meses
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={pararDeRepetir}>
                    Parar de repetir
                  </Button>
                </div>
              )}
              {avisoRecorrencia && <p className="text-xs text-emerald-400">{avisoRecorrencia}</p>}
            </div>
          )}

          {erro && <p className="text-sm text-rose-400">{erro}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Lançamento"
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
