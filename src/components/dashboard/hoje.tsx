import Link from "next/link";
import { CalendarClock, FileSignature, FileWarning, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { filtroDoUsuario } from "@/lib/acesso-dados";
import { resumoPagamentos } from "@/lib/meus-pagamentos";
import { documentosFaltando } from "@/lib/documentos";
import { linkWhatsApp } from "@/lib/clientes";
import { dataDoDb, dataParaDb, formatarDataCurta, hojeSaoPaulo } from "@/lib/datas";
import { formatCurrency } from "@/lib/utils";
import type { UsuarioLogado } from "@/lib/usuario-atual";

function somarDias(data: string, n: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function Bloco({ titulo, icone: Icone, children }: { titulo: string; icone: typeof CalendarClock; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icone className="h-4 w-4 text-primary" /> {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Início da secretária e do advogado: o que tem para hoje e amanhã. */
export async function Hoje({ eu }: { eu: UsuarioLogado }) {
  const hoje = hojeSaoPaulo();
  const amanha = somarDias(hoje, 1);
  const onde = filtroDoUsuario(eu);
  const advogado = eu.perfil === "ADVOGADO";

  const [audiencias, peticoes, meus, clientes] = await Promise.all([
    prisma.audiencia.findMany({
      where: { ...onde, data: { gte: dataParaDb(hoje), lte: dataParaDb(amanha) } },
      orderBy: [{ data: "asc" }, { hora: "asc" }],
      include: { cliente: { select: { telefone: true } } },
    }),
    prisma.peticao.findMany({ where: { ...onde, dataEntrega: { gte: dataParaDb(somarDias(hoje, -7)) } }, orderBy: { dataEntrega: "desc" }, take: 10 }),
    advogado
      ? Promise.all([
          prisma.audiencia.findMany({ where: onde, select: { valor: true, statusPagamento: true } }),
          prisma.peticao.findMany({ where: onde, select: { valor: true, status: true } }),
        ])
      : null,
    advogado
      ? null
      : prisma.cliente.findMany({
          orderBy: { nome: "asc" },
          select: { id: true, nome: true, recebimentos: { select: { id: true } }, documentos: { select: { tipo: true, recebimentoId: true } } },
        }),
  ]);

  const faltando = (clientes ?? []).filter((c) => {
    const f = documentosFaltando(c.documentos, c.recebimentos);
    return f.pessoais.length > 0 || Object.keys(f.porCausa).length > 0;
  });
  const resumo = meus
    ? resumoPagamentos([
        ...meus[0].map((a) => ({ valor: a.valor ? Number(a.valor) : null, pago: a.statusPagamento === "PAGO" })),
        ...meus[1].map((p) => ({ valor: p.valor ? Number(p.valor) : null, pago: p.status === "PAGA" })),
      ])
    : null;

  return (
    <div className="space-y-4">
      {resumo && (
        <Link href="/meus-pagamentos" className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-accent/40">
          <div>
            <p className="text-xs text-muted-foreground">Já recebido</p>
            <p className="text-lg font-bold tabular-nums text-emerald-400">{formatCurrency(resumo.recebido)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">A receber</p>
            <p className="text-lg font-bold tabular-nums text-amber-300">{formatCurrency(resumo.aReceber)}</p>
          </div>
        </Link>
      )}

      <Bloco titulo="Audiências de hoje e amanhã" icone={CalendarClock}>
        {audiencias.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma audiência hoje nem amanhã.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {audiencias.map((a) => {
              const zap = !advogado && a.cliente?.telefone ? linkWhatsApp(a.cliente.telefone) : null;
              const dia = dataDoDb(a.data) === hoje ? "Hoje" : "Amanhã";
              return (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {dia}
                      {a.hora ? ` ${a.hora}` : ""} · {a.clienteNome}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {advogado ? a.reclamada || "Empresa não informada" : a.advogadoNome}
                      {a.processoNumero ? ` · ${a.processoNumero}` : ""}
                    </p>
                  </div>
                  {zap && (
                    <a href={zap} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent">
                      <MessageCircle className="h-3.5 w-3.5" /> Avisar cliente
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Petições da última semana" icone={FileSignature}>
        {peticoes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma petição nos últimos 7 dias.</p>
        ) : (
          <ul className="space-y-1">
            {peticoes.map((p) => (
              <li key={p.id} className="truncate text-sm">
                {formatarDataCurta(dataDoDb(p.dataEntrega))} · {p.descricao} · <span className="text-muted-foreground">{p.clienteNome}</span>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {!advogado && (
        <Bloco titulo={`Clientes com documentos faltando (${faltando.length})`} icone={FileWarning}>
          {faltando.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todos os clientes estão com os documentos em dia.</p>
          ) : (
            <ul className="space-y-1">
              {faltando.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/clientes/${c.id}`} className="text-sm hover:underline">
                    {c.nome}
                  </Link>
                </li>
              ))}
              {faltando.length > 5 && (
                <li>
                  <Link href="/clientes" className="text-xs text-primary hover:underline">
                    Ver todos
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Bloco>
      )}
    </div>
  );
}
