import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";

export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
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
      // O aparelho passa a ser de quem ativou (recebe os avisos do perfil dessa pessoa).
      update: { p256dh: keys.p256dh, auth: keys.auth, usuarioId: quem.id },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, usuarioId: quem.id },
    });

    return NextResponse.json({ success: true, id: subscription.id });
  } catch (error) {
    console.error("[POST /api/push/subscribe]", error);
    return NextResponse.json({ error: "Erro interno no servidor de assinatura." }, { status: 500 });
  }
}
