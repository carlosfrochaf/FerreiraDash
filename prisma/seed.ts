import { PrismaClient, TipoTransacao } from "@prisma/client";
import { carregarClientesIniciais } from "../src/lib/clientes-servico";

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
    { nome: "Salário", slug: "SALARIO", tipo: "SAIDA" },
    { nome: "Outra saída", slug: "OUTRA_SAIDA", tipo: "SAIDA" },
  ];

  for (const cat of categoriasPadrao) {
    await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, ativo: true },
    });
  }

  // Clientes a partir dos nomes já usados em causas, audiências e petições (só os que faltam).
  const ligados = await carregarClientesIniciais(prisma);
  if (ligados) console.log(`Clientes: ${ligados} registro(s) ligados ao cadastro.`);

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
