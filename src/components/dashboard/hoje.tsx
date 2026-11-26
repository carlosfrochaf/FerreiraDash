import Link from "next/link";
import { Bell, CalendarClock, ClipboardList, FileSignature, FileWarning, MessageCircle, Send } from "lucide-react";
import { filtroIntimacoesDoUsuario } from "@/lib/intimacoes-acesso";
import { ROTULO_TIPO } from "@/lib/intimacoes";
import { quemAvisarHoje } from "@/lib/mensagens-cliente";
import { prisma } from "@/lib/prisma";
import { filtroDoUsuario } from "@/lib/acesso-dados";
import { resumoPagamentos } from "@/lib/meus-pagamentos";
import { documentosFaltando } from "@/lib/documentos";
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

/** Aba "Escritório" do Início (e o Início da secretária e do advogado): o que precisa de atenção. */
export async function Hoje({ eu }: { eu: UsuarioLogado }) {
  const hoje = hojeSaoPaulo();
  const amanha = somarDias(hoje, 1);
  const semana = somarDias(hoje, 7);
  const onde = filtroDoUsuario(eu);
  const advogado = eu.perfil === "ADVOGADO";

  const filtroIntimacoes = { ...filtroIntimacoesDoUsuario(eu), lidaEm: null };
  const filtroFichas = {
    situacao: "RASCUNHO" as const,
    ...(advogado ? { advogadoChave: { equals: eu.advogadoChave ?? "\u0000sem-advogado", mode: "insensitive" as const } } : {}),
  };
  const [audiencias, peticoes, meus, clientes, intimacoes, totalIntimacoes, fichas, totalFichas] = await Promise.all([
    prisma.audiencia.findMany({
      where: { ...onde, data: { gte: dataParaDb(hoje), lte: dataParaDb(semana) } },
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
          select: {
            id: true,
            nome: true,
            cpf: true,
            telefone: true,
            createdAt: true,
            recebimentos: { select: { id: true } },
            documentos: { select: { tipo: true, recebimentoId: true, createdAt: true } },
            fichas: { select: { empresa: true, dados: true } },
          },
        }),
    prisma.intimacao.findMany({
      where: filtroIntimacoes,
      orderBy: { data: "desc" },
      take: 5,
      select: { id: true, tipo: true, data: true, processoMascara: true, numeroProcesso: true, cliente: { select: { nome: true } } },
    }),
    prisma.intimacao.count({ where: filtroIntimacoes }),
    prisma.ficha.findMany({
      where: filtroFichas,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, clienteId: true, empresa: true, updatedAt: true, cliente: { select: { nome: true } } },
    }),
    prisma.ficha.count({ where: filtroFichas }),
  ]);

  const faltando = (clientes ?? []).filter((c) => {
    const f = documentosFaltando(c.documentos, c.recebimentos, c.cpf);
    return f.cpf || f.pessoais.length > 0 || Object.keys(f.porCausa).length > 0;
  });
  const avisar = advogado ? [] : quemAvisarHoje(clientes ?? []).slice(0, 5);
  const resumo = meus
    ? resumoPagamentos([
        ...meus[0].map((a) => ({ valor: a.valor ? Number(a.valor) : null, pago: a.statusPagamento === "PAGO" })),
        ...meus[1].map((p) => ({ valor: p.valor ? Number(p.valor) : null, pago: p.status === "PAGA" })),
      ])
    : null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {resumo && (
        <Link href="/meus-pagamentos" className="grid grid-cols-2 gap-3 lg:col-span-2 rounded-2xl border border-border bg-card p-4 hover:bg-accent/40">
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

      {avisar.length > 0 && (
        <Bloco titulo="Avisar hoje" icone={Send}>
          <ul className="divide-y divide-border/60">
            {avisar.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.motivo}</p>
                </div>
                <Link href={`/clientes/${c.id}?avisar=1`} className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Link>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Bloco titulo="Próximas audiências (7 dias)" icone={CalendarClock}>
        {audiencias.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma audiência nos próximos 7 dias.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {audiencias.map((a) => {
              // Abre o cliente já com o WhatsApp e a mensagem de audiência.
              const zap = !advogado && a.clienteId && a.cliente?.telefone ? `/clientes/${a.clienteId}?avisar=1` : null;
              const d = dataDoDb(a.data);
              const dia = d === hoje ? "Hoje" : d === amanha ? "Amanhã" : formatarDataCurta(d).replace(/ \d{4}$/, "");
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
                    <Link href={zap} className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent">
                      <MessageCircle className="h-3.5 w-3.5" /> Avisar cliente
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Bloco>

      <Bloco titulo={`Intimações novas (${totalIntimacoes})`} icone={Bell}>
        {intimacoes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma intimação nova.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {intimacoes.map((i) => (
              <li key={i.id}>
                <Link href="/intimacoes" className="flex items-center justify-between gap-2 py-2 hover:opacity-80">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {ROTULO_TIPO[i.tipo]} · {i.cliente?.nome ?? "Cliente não identificado"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{i.processoMascara ?? i.numeroProcesso}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatarDataCurta(dataDoDb(i.data)).replace(/ \d{4}$/, "")}</span>
                </Link>
              </li>
            ))}
            {totalIntimacoes > intimacoes.length && (
              <li className="pt-2">
                <Link href="/intimacoes" className="text-xs font-semibold text-primary hover:underline">
                  Ver todas as {totalIntimacoes}
                </Link>
              </li>
            )}
          </ul>
        )}
      </Bloco>

      <Bloco titulo={`Fichas para terminar (${totalFichas})`} icone={ClipboardList}>
        {fichas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma ficha em rascunho.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {fichas.map((f) => (
              <li key={f.id}>
                <Link href={`/clientes/${f.clienteId}/fichas/${f.id}`} className="flex items-center justify-between gap-2 py-2 hover:opacity-80">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{f.cliente.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{f.empresa || "Empresa não informada"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">mexida {formatarDataCurta(f.updatedAt.toISOString().slice(0, 10)).replace(/ \d{4}$/, "")}</span>
                </Link>
              </li>
            ))}
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
