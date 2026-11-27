import { NextResponse } from "next/server";
import { avisarTodos, vapidConfigurado } from "@/lib/push";
import { StatusPagamento, StatusPeticao, StatusRecebimento, StatusRepasse, StatusTransacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataDoDb, dataParaDb, hojeSaoPaulo } from "@/lib/datas";
import { gerarDespesasRecorrentes } from "@/lib/despesas-recorrentes";
import { avisoDasIntimacoes, sincronizarIntimacoes } from "@/lib/intimacoes-servico";
import { avisoFichasParadas, limiteFichaParada } from "@/lib/fichas-paradas";
import { avisoDasAudiencias } from "@/lib/audiencia-intimacao";
import { agruparAdvogados, ehSexta, montarNotificacoes, proximoDiaDePagamento, turnoPorHorario, type DadosDoDia, type Notificacao, type ParcelaAviso, type Turno } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";

/**
 * Disparado pelo pg_cron do Supabase às 8h e às 19h (Brasília; ver supabase/agendamento-notificacoes.sql), com
 * "Authorization: Bearer <CRON_SECRET>".
 * O turno vem do horário; dá para forçar com ?turno=manha|noite.
 * ?turno=teste manda uma notificação de teste para todos os aparelhos.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado no servidor." }, { status: 500 });
  }
  if (request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Gatilho não autorizado." }, { status: 401 });
  }

  if (!vapidConfigurado()) {
    return NextResponse.json({ error: "Chaves VAPID não configuradas no servidor." }, { status: 500 });
  }

  try {
    const param = new URL(request.url).searchParams.get("turno");
    const hoje = hojeSaoPaulo();

    let notificacoes: Notificacao[];
    let turno: Turno | "teste" | "intimacoes";
    let despesasCriadas = 0;

    if (param === "intimacoes") {
      // De hora em hora: avisa na hora só quando chega intimação nova (Diário de Justiça Eletrônico Nacional).
      turno = "intimacoes";
      const r = await sincronizarIntimacoes(hoje);
      const aviso = avisoDasIntimacoes(r);
      const audiencias = r.primeiraCarga ? null : avisoDasAudiencias(r.audiencias ?? []);
      notificacoes = [aviso, audiencias].filter((n): n is Notificacao => !!n);
    } else if (param === "teste") {
      turno = "teste";
      notificacoes = [{ title: "Notificações funcionando ✅", body: "Você vai receber os avisos às 8h e às 19h.", url: "/", tag: "teste" }];
    } else {
      turno = param === "manha" || param === "noite" ? param : turnoPorHorario();
      if (turno === "manha") {
        // Lança antes os custos fixos e salários do mês, para entrarem no aviso do dia.
        try {
          despesasCriadas = await gerarDespesasRecorrentes(hoje);
        } catch (err) {
          console.error("[recorrencias]", err);
        }
      }
      const dados: DadosDoDia = await buscarDadosDoDia(hoje);
      if (turno === "manha" && ehSexta(hoje)) dados.advogadosAPagar = await buscarAdvogadosAPagar(hoje);
      notificacoes = montarNotificacoes(turno, dados);
      if (turno === "manha") {
        try {
          const paradas = await prisma.ficha.findMany({
            where: { situacao: "RASCUNHO", createdAt: { lt: limiteFichaParada(hoje) } },
            orderBy: { createdAt: "asc" },
            select: { id: true, clienteId: true, cliente: { select: { nome: true } } },
          });
          const aviso = avisoFichasParadas(paradas.map((f) => ({ fichaId: f.id, clienteId: f.clienteId, nome: f.cliente.nome })));
          if (aviso) notificacoes.push(aviso);
        } catch (err) {
          console.error("[fichas paradas]", err);
        }
      }
    }

    if (notificacoes.length === 0) {
      return NextResponse.json({ success: true, turno, hoje, despesasCriadas, mensagem: "Nada para avisar." });
    }

    const r = await avisarTodos(notificacoes);

    return NextResponse.json({
      success: true,
      turno,
      hoje,
      despesasCriadas,
      notificacoes: notificacoes.map((n) => n.title),
      aparelhos: r.aparelhos,
      enviados: r.enviados,
      aparelhosRemovidos: r.removidos,
    });
  } catch (error) {
    console.error("[POST /api/push/send-notifications]", error);
    return NextResponse.json({ error: "Erro interno no disparador de notificações." }, { status: 500 });
  }
}

async function buscarDadosDoDia(hoje: string) {
  const dia = dataParaDb(hoje);
  const incluir = {
    recebimento: { select: { clienteNome: true, reclamada: true, processoNumero: true, numeroParcelas: true } },
  } as const;

  const amanha = new Date(dia.getTime() + 86_400_000);
  const proximo = proximoDiaDePagamento(hoje);
  const [vencemHoje, atrasadas, repassesProntos, lancamentosHoje, audienciasHoje, audienciasAmanha, peticoesAPagar, vencemProximo] =
    await Promise.all([
    prisma.parcela.findMany({
      where: { statusRecebimento: StatusRecebimento.PENDENTE, vencimento: dia },
      include: incluir,
      orderBy: { valorParcela: "desc" },
    }),
    prisma.parcela.findMany({
      where: { statusRecebimento: StatusRecebimento.PENDENTE, vencimento: { lt: dia } },
      include: incluir,
      orderBy: { vencimento: "asc" },
    }),
    prisma.parcela.findMany({
      where: { statusRecebimento: StatusRecebimento.RECEBIDO, statusRepasse: StatusRepasse.PENDENTE },
      include: incluir,
      orderBy: { dataRecebimento: "asc" },
    }),
    // Lançamentos avulsos guardam a data como meia-noite UTC do dia.
    prisma.transacao.findMany({
      where: {
        status: StatusTransacao.PENDENTE,
        dataCompetencia: { gte: dia, lt: new Date(dia.getTime() + 86_400_000) },
        // Salário não tem vencimento (a data é o dia 1 do mês de referência): fica fora do aviso.
        OR: [{ categoria: { slug: null } }, { categoria: { slug: { not: "SALARIO" } } }],
      },
      select: { descricao: true, valor: true, tipo: true, clienteNome: true, categoria: { select: { nome: true } } },
    }),
    prisma.audiencia.findMany({ where: { data: dia }, orderBy: { hora: "asc" } }),
    prisma.audiencia.findMany({ where: { data: amanha }, orderBy: { hora: "asc" } }),
    prisma.peticao.aggregate({ where: { status: { not: StatusPeticao.PAGA } }, _count: true, _sum: { valor: true } }),
    prisma.parcela.findMany({
      where: { statusRecebimento: StatusRecebimento.PENDENTE, vencimento: dataParaDb(proximo.data) },
      include: incluir,
      orderBy: { valorParcela: "desc" },
    }),
  ]);

  const audiencia = (a: (typeof audienciasHoje)[number]) => ({
    hora: a.hora,
    clienteNome: a.clienteNome,
    reclamada: a.reclamada,
    advogadoNome: a.advogadoNome,
    processoNumero: a.processoNumero,
  });

  const aviso = (p: (typeof vencemHoje)[number]): ParcelaAviso => ({
    numero: p.numero,
    totalParcelas: p.recebimento.numeroParcelas,
    vencimento: dataDoDb(p.vencimento),
    valorParcela: Number(p.valorParcela),
    valorEscritorio: Number(p.valorEscritorio),
    valorCliente: Number(p.valorCliente),
    clienteNome: p.recebimento.clienteNome,
    reclamada: p.recebimento.reclamada,
    processoNumero: p.recebimento.processoNumero,
  });

  return {
    vencemHoje: vencemHoje.map(aviso),
    atrasadas: atrasadas.map(aviso),
    repassesProntos: repassesProntos.map(aviso),
    proximoPagamento: { quando: proximo.quando, parcelas: vencemProximo.map(aviso) },
    peticoesAPagar: { quantidade: peticoesAPagar._count, total: Number(peticoesAPagar._sum.valor ?? 0) },
    audienciasHoje: audienciasHoje.map(audiencia),
    audienciasAmanha: audienciasAmanha.map(audiencia),
    lancamentosHoje: lancamentosHoje.map((t) => ({
      descricao: t.descricao || [t.categoria.nome, t.clienteNome].filter(Boolean).join(" · "),
      valor: Number(t.valor),
      tipo: t.tipo,
    })),
  };
}

/** O que falta pagar a cada advogado: audiências já feitas e petições não pagas, com valor. */
async function buscarAdvogadosAPagar(hoje: string) {
  const [audiencias, peticoes] = await Promise.all([
    prisma.audiencia.findMany({
      where: { statusPagamento: StatusPagamento.PENDENTE, valor: { not: null }, data: { lt: dataParaDb(hoje) } },
      select: { advogadoNome: true, valor: true },
    }),
    prisma.peticao.findMany({
      where: { status: { not: StatusPeticao.PAGA }, valor: { not: null } },
      select: { advogadoNome: true, valor: true },
    }),
  ]);
  return agruparAdvogados(
    audiencias.map((a) => ({ advogadoNome: a.advogadoNome, valor: Number(a.valor) })),
    peticoes.map((p) => ({ advogadoNome: p.advogadoNome, valor: Number(p.valor) }))
  );
}
