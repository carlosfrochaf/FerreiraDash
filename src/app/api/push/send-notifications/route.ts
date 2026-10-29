import { NextResponse } from "next/server";
import webpush from "web-push";
import { StatusPeticao, StatusRecebimento, StatusRepasse, StatusTransacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataDoDb, dataParaDb, hojeSaoPaulo } from "@/lib/datas";
import { montarNotificacoes, proximoDiaDePagamento, turnoPorHorario, type Notificacao, type ParcelaAviso, type Turno } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";

/**
 * Disparado por um cron às 8h e às 19h (Brasília), com
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

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Chaves VAPID não configuradas no servidor." }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:carlos@ferreirarocha.adv.br", publicKey, privateKey);

  try {
    const param = new URL(request.url).searchParams.get("turno");
    const hoje = hojeSaoPaulo();

    let notificacoes: Notificacao[];
    let turno: Turno | "teste";

    if (param === "teste") {
      turno = "teste";
      notificacoes = [{ title: "Notificações funcionando ✅", body: "Você vai receber os avisos às 8h e às 19h.", url: "/", tag: "teste" }];
    } else {
      turno = param === "manha" || param === "noite" ? param : turnoPorHorario();
      notificacoes = montarNotificacoes(turno, await buscarDadosDoDia(hoje));
    }

    if (notificacoes.length === 0) {
      return NextResponse.json({ success: true, turno, hoje, mensagem: "Nada para avisar." });
    }

    const aparelhos = await prisma.pushSubscription.findMany();
    let enviados = 0;
    const expirados: string[] = [];

    await Promise.all(
      aparelhos.flatMap((a) =>
        notificacoes.map(async (n) => {
          try {
            await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(n), {
              TTL: 6 * 60 * 60, // se o aparelho estiver offline, ainda entrega por 6h
            });
            enviados++;
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            // 404/410: o aparelho cancelou ou a inscrição expirou.
            if (status === 404 || status === 410) expirados.push(a.id);
            else console.error("[push] falha ao enviar", status, err);
          }
        })
      )
    );

    if (expirados.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: [...new Set(expirados)] } } });
    }

    return NextResponse.json({
      success: true,
      turno,
      hoje,
      notificacoes: notificacoes.map((n) => n.title),
      aparelhos: aparelhos.length,
      enviados,
      aparelhosRemovidos: new Set(expirados).size,
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
  const [vencemHoje, atrasadas, repassesProntos, lancamentosHoje, audienciasHoje, audienciasAmanha, peticoesAValidar, peticoesAPagar, vencemProximo] =
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
      where: { status: StatusTransacao.PENDENTE, dataCompetencia: { gte: dia, lt: new Date(dia.getTime() + 86_400_000) } },
      select: { descricao: true, valor: true, tipo: true, clienteNome: true, categoria: { select: { nome: true } } },
    }),
    prisma.audiencia.findMany({ where: { data: dia }, orderBy: { hora: "asc" } }),
    prisma.audiencia.findMany({ where: { data: amanha }, orderBy: { hora: "asc" } }),
    prisma.peticao.count({ where: { status: StatusPeticao.A_VALIDAR } }),
    prisma.peticao.aggregate({ where: { status: StatusPeticao.A_PAGAR }, _count: true, _sum: { valor: true } }),
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
    peticoesAValidar,
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
