import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

// Garante que o route handler use o runtime clássico do Node (para web-push crypto)
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Validar autenticação do Cron Job (shared secret token)
    const authHeader = request.headers.get("Authorization");
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Segredo CRON_SECRET não configurado no servidor." }, { status: 500 });
    }

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: "Gatilho não autorizado." }, { status: 401 });
    }

    // 2. Configurar chaves VAPID
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Chaves VAPID não configuradas no servidor." }, { status: 500 });
    }

    webpush.setVapidDetails(
      "mailto:carlos@ferreirarocha.adv.br",
      publicKey,
      privateKey
    );

    // 3. Obter o dia de hoje no fuso horário de Brasília (America/Sao_Paulo)
    const agora = new Date();
    const dataStr = agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // Formato YYYY-MM-DD
    const startOfDay = new Date(`${dataStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dataStr}T23:59:59.999Z`);

    // 4. Buscar recebíveis/acordos pendentes que vencem hoje
    const transacoesHoje = await prisma.transacao.findMany({
      where: {
        tipo: "ENTRADA",
        status: "PENDENTE",
        dataCompetencia: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        processo: {
          include: {
            cliente: true,
          },
        },
        contato: true,
      },
    });

    if (transacoesHoje.length === 0) {
      return NextResponse.json({ success: true, message: "Nenhum vencimento pendente para hoje." });
    }

    // 5. Buscar todos os dispositivos registrados
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: `Encontrado ${transacoesHoje.length} vencimento(s), mas nenhuma assinatura de dispositivo ativa.` });
    }

    let enviados = 0;
    let falhasRemovidas = 0;

    // Função auxiliar para formatar moeda
    const formatBRL = (val: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

    // 6. Disparar notificações
    for (const t of transacoesHoje) {
      const cliente = t.clienteNome || t.processo?.cliente?.nome || t.contato?.nome || "Sem Nome";
      const valorStr = formatBRL(Number(t.valor));
      const processoNum = t.processoNumero || t.processo?.numeroPje || "Sem número";

      const payload = {
        title: "Vencimento de Acordo Hoje! ⚖️",
        body: `Cliente: ${cliente}\nValor: ${valorStr}\nProc: ${processoNum}`,
        url: "/historico",
      };

      for (const sub of subscriptions) {
        const pushSubscriptionObject = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(
            pushSubscriptionObject,
            JSON.stringify(payload)
          );
          enviados++;
        } catch (err: any) {
          console.error(`Falha ao enviar push para endpoint ${sub.endpoint}:`, err);
          // Se o dispositivo cancelou permissão ou expirou (404 ou 410), deleta a assinatura do banco
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            falhasRemovidas++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      vencimentos: transacoesHoje.length,
      disparados: enviados,
      assinaturasExpiradasRemovidas: falhasRemovidas,
    });
  } catch (error) {
    console.error("[POST /api/push/send-notifications]", error);
    return NextResponse.json({ error: "Erro interno no disparador de notificações." }, { status: 500 });
  }
}
