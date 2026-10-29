// Aplica as migrations do Prisma durante o build (Render).
// Na primeira vez, o banco de produção (criado com `db push`) ainda não tem histórico
// de migrations: o Prisma responde P3005, e então marcamos a 0_init como já aplicada
// antes de rodar as seguintes.
import { execSync } from "node:child_process";

if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "")) {
  console.log("[migrate] DATABASE_URL não é PostgreSQL nesta máquina; migrations ignoradas.");
  process.exit(0);
}

function run(cmd) {
  const out = execSync(cmd, { stdio: "pipe", encoding: "utf8" });
  if (out) console.log(out);
}

try {
  run("npx prisma migrate deploy");
} catch (err) {
  const msg = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  if (!msg.includes("P3005")) {
    console.error(msg);
    process.exit(1);
  }
  console.log("[migrate] Banco sem histórico de migrations. Registrando 0_init como base.");
  try {
    run("npx prisma migrate resolve --applied 0_init");
    run("npx prisma migrate deploy");
  } catch (err2) {
    console.error(`${err2.stdout ?? ""}${err2.stderr ?? ""}`);
    process.exit(1);
  }
}
