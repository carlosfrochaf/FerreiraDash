import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { confirm } = body;

    // Validação de segurança no corpo da requisição
    if (confirm !== "APAGAR") {
      return NextResponse.json(
        { error: "Confirmação inválida. Operação abortada." },
        { status: 400 }
      );
    }

    // Executa a limpeza em lote na ordem correta de integridade referencial
    await prisma.$transaction([
      prisma.transacao.deleteMany(),      // Remove lançamentos
      prisma.repasse.deleteMany(),        // Remove repasses
      prisma.processo.deleteMany(),       // Remove processos
      prisma.contato.deleteMany(),        // Remove contatos (clientes, fornecedores, etc.)
    ]);

    return NextResponse.json({
      success: true,
      message: "Banco de dados limpo com sucesso! Categorias e assinaturas push mantidas.",
    });
  } catch (error: any) {
    console.error("[POST /api/admin/reset-db]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao resetar o banco de dados." },
      { status: 500 }
    );
  }
}
