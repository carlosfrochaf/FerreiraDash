import { usuarioAtual } from "@/lib/usuario-atual";
import { listarModelos } from "@/lib/mensagens-servico";
import { ModelosMensagem } from "./modelos-mensagem";

export const dynamic = "force-dynamic";

export default async function MensagensPage() {
  await usuarioAtual();
  const modelos = await listarModelos();
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Textos prontos do botão de WhatsApp do cliente. Cada mensagem aparece só no momento escolhido, e dá para mudar o texto antes de enviar.
        </p>
      </section>
      <ModelosMensagem modelos={modelos} />
    </div>
  );
}
