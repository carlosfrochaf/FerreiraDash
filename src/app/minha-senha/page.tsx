import { usuarioAtual } from "@/lib/usuario-atual";
import { MinhaSenhaForm } from "./minha-senha-form";

export const dynamic = "force-dynamic";

export default async function MinhaSenhaPage() {
  await usuarioAtual();
  return (
    <div className="mx-auto max-w-md space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Minha senha</h1>
        <p className="text-sm text-muted-foreground">Troque a senha que você usa para entrar no app.</p>
      </section>
      <MinhaSenhaForm />
    </div>
  );
}
