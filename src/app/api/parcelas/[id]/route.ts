import { NextResponse } from "next/server";
import { parcelaAcaoSchema } from "@/lib/validations";
import { aplicarAcaoParcela, ErroRecebimento, type Comprovante } from "@/lib/recebimentos";
import { saveUpload } from "@/lib/upload";

export const dynamic = "force-dynamic";

/**
 * Ações na parcela. Aceita JSON ou multipart (multipart quando houver comprovante).
 *   { acao: "receber", data? }            { acao: "desfazer_recebimento" }
 *   { acao: "repassar", data?, comprovante? }  { acao: "desfazer_repasse" }
 *   { acao: "alterar_vencimento", vencimento }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";

    let body: Record<string, unknown> | null;
    let arquivo: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      body = {};
      for (const campo of ["acao", "data", "vencimento"]) {
        const v = form.get(campo);
        if (typeof v === "string" && v) body[campo] = v;
      }
      const f = form.get("comprovante");
      if (f instanceof File && f.size > 0) arquivo = f;
    } else {
      body = await request.json().catch(() => null);
    }

    const parsed = parcelaAcaoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (arquivo && parsed.data.acao !== "repassar") {
      return NextResponse.json({ error: "Comprovante só pode ser enviado ao marcar o repasse." }, { status: 400 });
    }

    const comprovante: Comprovante | undefined = arquivo ? await saveUpload(arquivo) : undefined;
    return NextResponse.json(await aplicarAcaoParcela(id, parsed.data, comprovante));
  } catch (error) {
    if (error instanceof ErroRecebimento) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[PATCH /api/parcelas/:id]", error);
    return NextResponse.json({ error: "Erro interno ao atualizar parcela." }, { status: 500 });
  }
}
