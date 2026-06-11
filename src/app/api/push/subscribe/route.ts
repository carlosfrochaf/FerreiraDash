import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, keys, unsubscribe } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint de push ausente." }, { status: 400 });
    }

    if (unsubscribe) {
      // Remove a assinatura do banco
      await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
      return NextResponse.json({ success: true, message: "Assinatura removida." });
    }

    if (!keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: "Chaves de criptografia p256dh/auth ausentes." }, { status: 400 });
    }

    // Adiciona ou atualiza a assinatura no banco de dados
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("[POST /api/push/subscribe]", error);
    return NextResponse.json({ error: "Erro interno no servidor de assinatura." }, { status: 500 });
  }
}
