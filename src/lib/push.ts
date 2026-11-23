// Manda notificações para todos os aparelhos inscritos. Só no servidor.
import webpush from "web-push";
import { prisma } from "./prisma";
import type { Notificacao } from "./notificacoes";

export function vapidConfigurado(): boolean {
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

export async function avisarTodos(notificacoes: Notificacao[]): Promise<{ aparelhos: number; enviados: number; removidos: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Chaves VAPID não configuradas no servidor.");
  webpush.setVapidDetails("mailto:carlos@ferreirarocha.adv.br", publicKey, privateKey);

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
      }),
    ),
  );
  const removidos = new Set(expirados).size;
  if (removidos > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: [...new Set(expirados)] } } });
  return { aparelhos: aparelhos.length, enviados, removidos };
}
