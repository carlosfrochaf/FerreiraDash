"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Trash2,
  Loader2 
} from "lucide-react";

type Categoria = {
  id: string;
  nome: string;
  slug: string | null;
  tipo: "ENTRADA" | "SAIDA";
  ativo: boolean;
};

type Props = {
  initialCategorias: Categoria[];
};

export function CategoriasContent({ initialCategorias }: Props) {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>(initialCategorias);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [erroCriar, setErroCriar] = useState("");
  const [erroEditar, setErroEditar] = useState("");
  const [pending, startTransition] = useTransition();

  const entradas = categorias.filter((c) => c.tipo === "ENTRADA");
  const saidas = categorias.filter((c) => c.tipo === "SAIDA");

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setErroCriar("");
    if (!novoNome.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: novoNome, tipo: novoTipo }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErroCriar(data.error?.nome?.[0] ?? data.error ?? "Erro ao salvar categoria.");
          return;
        }

        const novaCat = await res.json();
        setCategorias((prev) => [...prev, novaCat].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNovoNome("");
        router.refresh();
      } catch (error) {
        console.error(error);
        setErroCriar("Erro ao salvar categoria.");
      }
    });
  }

  async function handleRenameCategory(id: string) {
    setErroEditar("");
    if (!editNome.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/categorias/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: editNome }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErroEditar(data.error?.nome?.[0] ?? data.error ?? "Erro ao renomear.");
          return;
        }

        const catAtualizada = await res.json();
        setCategorias((prev) =>
          prev.map((c) => (c.id === id ? catAtualizada : c)).sort((a, b) => a.nome.localeCompare(b.nome))
        );
        setEditId(null);
        setEditNome("");
        router.refresh();
      } catch (error) {
        console.error(error);
        setErroEditar("Erro ao renomear.");
      }
    });
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Deseja realmente excluir esta categoria?")) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/categorias/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error ?? "Erro ao excluir categoria.");
          return;
        }

        setCategorias((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } catch (error) {
        console.error(error);
        alert("Erro ao excluir categoria.");
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 items-start">
      {/* Formulário de Criação */}
      <Card className="md:col-span-1 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5 text-primary" />
            Nova Categoria
          </CardTitle>
          <CardDescription>
            Adicione uma nova categoria de entrada ou saída no financeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Categoria</Label>
              <Input
                id="nome"
                placeholder="Ex: Aluguel da Sala"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                required
                disabled={pending}
              />
              {erroCriar && <p className="text-xs text-rose-400 mt-1">{erroCriar}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <Select
                value={novoTipo}
                onValueChange={(v) => setNovoTipo(v as "ENTRADA" | "SAIDA")}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada (Receita)</SelectItem>
                  <SelectItem value="SAIDA">Saída (Despesa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full gap-2 cursor-pointer h-11" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Adicionar Categoria"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Listagem */}
      <div className="md:col-span-2 space-y-6">
        {/* Entradas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-emerald-400">Categorias de Entrada</CardTitle>
            <CardDescription>Visualização das receitas de entrada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {entradas.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-background/50 text-sm"
              >
                <div className="flex-1 min-w-0">
                  {editId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="h-8 py-1 max-w-[200px]"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="success"
                        className="h-8 w-8 p-0 cursor-pointer text-white"
                        onClick={() => handleRenameCategory(cat.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={() => {
                          setEditId(null);
                          setEditNome("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {erroEditar && <p className="text-xs text-rose-400">{erroEditar}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {cat.nome}
                      </span>
                      {cat.slug && (
                        <Badge variant="outline" className="text-[9px] h-4 uppercase tracking-wider font-bold">
                          Sistema
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {editId !== cat.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => {
                        setEditId(cat.id);
                        setEditNome(cat.nome);
                      }}
                      title="Editar Categoria"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {!cat.slug && editId !== cat.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20 cursor-pointer"
                      onClick={() => handleDeleteCategory(cat.id)}
                      title="Excluir Categoria"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Saídas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-rose-400">Categorias de Saída</CardTitle>
            <CardDescription>Visualização das despesas de saída.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {saidas.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-background/50 text-sm"
              >
                <div className="flex-1 min-w-0">
                  {editId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="h-8 py-1 max-w-[200px]"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="success"
                        className="h-8 w-8 p-0 cursor-pointer text-white"
                        onClick={() => handleRenameCategory(cat.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={() => {
                          setEditId(null);
                          setEditNome("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {erroEditar && <p className="text-xs text-rose-400">{erroEditar}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {cat.nome}
                      </span>
                      {cat.slug && (
                        <Badge variant="outline" className="text-[9px] h-4 uppercase tracking-wider font-bold">
                          Sistema
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {editId !== cat.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => {
                        setEditId(cat.id);
                        setEditNome(cat.nome);
                      }}
                      title="Editar Categoria"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {!cat.slug && editId !== cat.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20 cursor-pointer"
                      onClick={() => handleDeleteCategory(cat.id)}
                      title="Excluir Categoria"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
