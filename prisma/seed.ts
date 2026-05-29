import { PrismaClient, TipoContato } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Carga inicial de categorias padrão do sistema
  const categoriasPadrao = [
    { nome: "Outro", slug: "HONORARIOS_CONTRATUAIS", tipo: "ENTRADA" },
    { nome: "Honorários de Sucumbência", slug: "HONORARIOS_SUCUMBENCIA", tipo: "ENTRADA" },
    { nome: "Causa Ganha", slug: "ALVARA_CAUSA_GANHA", tipo: "ENTRADA" },
    { nome: "Honorários do Escritório", slug: "HONORARIOS_ESCRITORIO", tipo: "ENTRADA" },
    { nome: "Audiência", slug: "AUDIENCIA", tipo: "SAIDA" },
    { nome: "Repasse ao Cliente", slug: "REPASSE_CLIENTE", tipo: "SAIDA" },
    { nome: "Advogado / Colaborador", slug: "ADVOGADO_COLABORADOR", tipo: "SAIDA" },
    { nome: "Custo Operacional", slug: "CUSTO_OPERACIONAL", tipo: "SAIDA" },
  ];

  for (const cat of categoriasPadrao) {
    await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: { nome: cat.nome, tipo: cat.tipo as any },
      create: {
        nome: cat.nome,
        slug: cat.slug,
        tipo: cat.tipo as any,
        ativo: true,
      },
    });
  }

  const cliente = await prisma.contato.upsert({
    where: { id: "seed-cliente-1" },
    update: {},
    create: {
      id: "seed-cliente-1",
      nome: "Maria Silva",
      tipo: TipoContato.CLIENTE,
      pixChave: "maria.silva@email.com",
      telefone: "(11) 99999-0000",
    },
  });

  await prisma.processo.upsert({
    where: { numeroPje: "0001234-56.2024.8.26.0100" },
    update: {},
    create: {
      numeroPje: "0001234-56.2024.8.26.0100",
      nomeAcao: "Ação de Indenização por Danos Morais",
      clienteId: cliente.id,
    },
  });

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
