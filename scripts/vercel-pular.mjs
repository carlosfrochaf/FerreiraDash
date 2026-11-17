// "Ignored Build Step" da Vercel: sai com 0 para pular, 1 para publicar.
// Pula só as prévias (pushes de outros ramos); na dúvida, publica.
const env = process.env.VERCEL_ENV;
console.log(`[vercel-pular] VERCEL_ENV=${env ?? "(vazio)"} ramo=${process.env.VERCEL_GIT_COMMIT_REF ?? "?"}`);
process.exit(env === "preview" ? 0 : 1);
