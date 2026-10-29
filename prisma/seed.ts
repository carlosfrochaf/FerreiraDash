import { PrismaClient, TipoTransacao } from "@prisma/client";

const prisma = new PrismaClient();

// Roda a cada publicação (npm run db:setup). Só cria o que estiver faltando:
// nunca sobrescreve nomes editados pelo usuário e não cria dados de exemplo.
async function main() {
  const categoriasPadrao: { nome: string; slug: string; tipo: TipoTransacao }[] = [
    { nome: "Honorários Contratuais", slug: "HONORARIOS_CONTRATUAIS", tipo: "ENTRADA" },
    { nome: "Honorários de Sucumbência", slug: "HONORARIOS_SUCUMBENCIA", tipo: "ENTRADA" },
    { nome: "Causa Ganha", slug: "ALVARA_CAUSA_GANHA", tipo: "ENTRADA" },
    { nome: "Audiência", slug: "AUDIENCIA", tipo: "SAIDA" },
    { nome: "Advogado / Colaborador", slug: "ADVOGADO_COLABORADOR", tipo: "SAIDA" },
    { nome: "Custo Operacional", slug: "CUSTO_OPERACIONAL", tipo: "SAIDA" },
  ];

  for (const cat of categoriasPadrao) {
    await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, ativo: true },
    });
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
