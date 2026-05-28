"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Loader2, Search } from "lucide-react";
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
import type { StatusTransacao, TipoTransacao } from "@prisma/client";

type ProcessoOption = { id: string; numeroPje: string; nomeAcao: string; clienteNome: string };
type ContatoOption = { id: string; nome: string; tipo: string };
type CategoriaOption = { id: string; nome: string; tipo: string };

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
    transacaoEdicao?.dataCompetencia || new Date().toISOString().slice(0, 10)
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

  const [anexo, setAnexo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

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
    if (finalProcessoId) formData.append("processoId", finalProcessoId);
    if (finalContatoId) formData.append("contatoId", finalContatoId);
    if (processoNumero) formData.append("processoNumero", processoNumero);

    let finalClienteNome = clienteNome;
    if (!finalClienteNome && contatoNome) {
      finalClienteNome = contatoNome;
    }
    if (finalClienteNome) formData.append("clienteNome", finalClienteNome);
    if (reclamada) formData.append("reclamada", reclamada);
    if (anexo) formData.append("anexo", anexo);

    startTransition(async () => {
      const url = transacaoEdicao ? `/api/transacoes/${transacaoEdicao.id}` : "/api/transacoes";
      const method = transacaoEdicao ? "PATCH" : "POST";
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao salvar lançamento.");
        return;
      }
      router.push("/");
      router.refresh();
    });
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
              <Label htmlFor="competencia">Data da Competência</Label>
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

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Ex: Audiência TJSP — custas e deslocamento"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anexo">Comprovante / Alvará</Label>
            <label
              htmlFor="anexo"
              className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50"
            >
              <Camera className="h-5 w-5" />
              {anexo ? anexo.name : "Tirar foto ou anexar arquivo"}
            </label>
            <input
              id="anexo"
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="sr-only"
              onChange={(e) => setAnexo(e.target.files?.[0] ?? null)}
            />
          </div>

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
