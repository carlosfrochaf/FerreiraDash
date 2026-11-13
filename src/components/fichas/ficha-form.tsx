"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoEscolha } from "@/components/ui/campo-escolha";
import { documentosMarcados, OPCOES_FICHA, podeEnviarFicha, type FichaDados } from "@/lib/ficha";
import type { FichaSerializada } from "@/lib/fichas-servico";
import type { ClienteSerializado } from "@/lib/clientes-servico";

type Tipo = "texto" | "data" | "hora" | "longo" | "simnao" | { opcoes: readonly string[] };
type Campo = { k: string; rotulo: string; tipo?: Tipo; largo?: boolean };
type Bloco = "empresa" | "contrato" | "jornada" | "ambiente" | "verbas" | "outras";
type Valor = string | boolean | null | undefined | string[];

const O = OPCOES_FICHA;

const CAMPOS_CLIENTE: Campo[] = [
  { k: "nome", rotulo: "Nome completo", largo: true },
  { k: "cpf", rotulo: "CPF" },
  { k: "dataNascimento", rotulo: "Data de nascimento", tipo: "data" },
  { k: "telefone", rotulo: "Telefone" },
  { k: "email", rotulo: "E-mail" },
  { k: "estadoCivil", rotulo: "Estado civil", tipo: { opcoes: O.estadoCivil } },
  { k: "endereco", rotulo: "Endereço completo", largo: true },
  { k: "cep", rotulo: "CEP" },
  { k: "cidadeUf", rotulo: "Cidade/UF" },
  { k: "origem", rotulo: "Como chegou ao escritório", tipo: { opcoes: O.origem } },
];

const BLOCOS: { b: Bloco; titulo: string; campos: Campo[] }[] = [
  {
    b: "empresa",
    titulo: "Dados da empresa (reclamada)",
    campos: [
      { k: "cnpj", rotulo: "CNPJ" },
      { k: "nomeFantasia", rotulo: "Nome fantasia" },
      { k: "email", rotulo: "E-mail da empresa" },
      { k: "telefones", rotulo: "Telefone(s)" },
      { k: "endereco", rotulo: "Endereço da sede", largo: true },
      { k: "localTrabalho", rotulo: "Local de trabalho (se diferente da sede)", largo: true },
    ],
  },
  {
    b: "contrato",
    titulo: "Contrato de trabalho",
    campos: [
      { k: "admissao", rotulo: "Data de admissão", tipo: "data" },
      { k: "demissao", rotulo: "Data de demissão", tipo: "data" },
      { k: "funcaoInicial", rotulo: "Função inicial" },
      { k: "funcaoFinal", rotulo: "Função final/outra" },
      { k: "salarioInicial", rotulo: "Salário inicial (R$)" },
      { k: "ultimoSalario", rotulo: "Último salário (R$)" },
      { k: "formaContratacao", rotulo: "Forma de contratação", tipo: { opcoes: O.formaContratacao } },
      { k: "motivoDesligamento", rotulo: "Motivo do desligamento", tipo: { opcoes: O.motivoDesligamento } },
      { k: "registroCtps", rotulo: "Registro em CTPS?", tipo: "simnao" },
      { k: "avisoPrevio", rotulo: "Aviso prévio", tipo: { opcoes: O.avisoPrevio } },
      { k: "dataAvisoPrevio", rotulo: "Data do aviso prévio", tipo: "data" },
      { k: "mudancaFuncao", rotulo: "Mudança de função?", tipo: "simnao" },
      { k: "quandoMudou", rotulo: "Quando ocorreu?" },
      { k: "comissoes", rotulo: "Comissões/gratificações?", tipo: "simnao" },
      { k: "valorMedioComissoes", rotulo: "Valor médio mensal (R$)" },
    ],
  },
  {
    b: "jornada",
    titulo: "Jornada de trabalho",
    campos: [
      { k: "entrada", rotulo: "Horário de entrada", tipo: "hora" },
      { k: "saida", rotulo: "Horário de saída", tipo: "hora" },
      { k: "intervalo", rotulo: "Intervalo" },
      { k: "escala", rotulo: "Escala" },
      { k: "horasExtras", rotulo: "Fazia horas extras?", tipo: "simnao" },
      { k: "horasExtrasPagas", rotulo: "Eram pagas?", tipo: { opcoes: O.horasExtrasPagas } },
      { k: "controlePonto", rotulo: "Controle de ponto?", tipo: { opcoes: O.controlePonto } },
      { k: "trabalhoNoturno", rotulo: "Trabalho noturno?", tipo: "simnao" },
      { k: "adicionalNoturno", rotulo: "Adicional noturno?", tipo: "simnao" },
    ],
  },
  {
    b: "ambiente",
    titulo: "Ambiente e condições de trabalho",
    campos: [
      { k: "epis", rotulo: "Fornecimento de EPIs", tipo: { opcoes: O.epis } },
      { k: "insalubridade", rotulo: "Insalubridade?", tipo: "simnao" },
      { k: "periculosidade", rotulo: "Periculosidade?", tipo: "simnao" },
      { k: "recebiaAdicionais", rotulo: "Recebia adicionais?", tipo: "simnao" },
      { k: "acidente", rotulo: "Acidente de trabalho?", tipo: "simnao" },
      { k: "assedio", rotulo: "Assédio (moral/sexual)?", tipo: "simnao" },
    ],
  },
  {
    b: "verbas",
    titulo: "Verbas rescisórias",
    campos: [
      { k: "recebeu", rotulo: "Recebeu as verbas rescisórias?", tipo: { opcoes: O.verbasRecebidas } },
      { k: "valorPago", rotulo: "Valor pago (R$)" },
      { k: "dataPagamento", rotulo: "Data pagamento", tipo: "data" },
      { k: "recebeuTrct", rotulo: "Recebeu TRCT?", tipo: "simnao" },
      { k: "seguroDesemprego", rotulo: "Seguro-desemprego?", tipo: "simnao" },
      { k: "parcelasSeguro", rotulo: "Nº parcelas" },
      { k: "sacouFgts", rotulo: "Conseguiu sacar FGTS?", tipo: "simnao" },
    ],
  },
  {
    b: "outras",
    titulo: "Testemunhas e outras informações",
    campos: [
      { k: "testemunhas", rotulo: "Possui testemunhas?", tipo: "simnao" },
      { k: "quantasTestemunhas", rotulo: "Quantas?" },
      { k: "acaoAnterior", rotulo: "Já moveu ação anterior?", tipo: "simnao" },
      { k: "outrasAcoes", rotulo: "Outras ações contra a empresa?", tipo: "simnao" },
      { k: "observacoes", rotulo: "Observações adicionais", tipo: "longo", largo: true },
    ],
  },
];

const caixa =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm [color-scheme:dark] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

function Entrada({ campo, valor, onChange, disabled }: { campo: Campo; valor: Valor; onChange: (v: Valor) => void; disabled: boolean }) {
  const t = campo.tipo ?? "texto";
  if (t === "simnao") {
    return (
      <div className="flex gap-2">
        {[
          [true, "Sim"],
          [false, "Não"],
        ].map(([v, r]) => (
          <button
            key={String(v)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(valor === v ? null : (v as boolean))}
            className={`h-10 flex-1 rounded-lg border text-sm ${valor === v ? "border-primary bg-primary/15 font-semibold" : "border-border hover:bg-accent"}`}
          >
            {r as string}
          </button>
        ))}
      </div>
    );
  }
  if (typeof t === "object") {
    return (
      <CampoEscolha value={(valor as string) ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">—</option>
        {t.opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </CampoEscolha>
    );
  }
  if (t === "longo") {
    return (
      <textarea
        className={`${caixa} h-28 py-2`}
        value={(valor as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      className={caixa}
      type={t === "data" ? "date" : t === "hora" ? "time" : "text"}
      value={(valor as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function Grade({ campos, valores, set, disabled }: { campos: Campo[]; valores: Record<string, Valor>; set: (k: string, v: Valor) => void; disabled: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {campos.map((c) => (
        <label key={c.k} className={`space-y-1 ${c.largo ? "sm:col-span-2" : ""}`}>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.rotulo}</span>
          <Entrada campo={c} valor={valores[c.k]} onChange={(v) => set(c.k, v)} disabled={disabled} />
        </label>
      ))}
    </div>
  );
}

function Secao({ n, titulo, aberta, children }: { n: number; titulo: string; aberta?: boolean; children: React.ReactNode }) {
  return (
    <details open={aberta} className="group rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-semibold">
        <span>
          <span className="mr-2 text-primary">{n}</span>
          {titulo}
        </span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}

function Marcar({ itens, marcados, onToggle, disabled, travados }: { itens: readonly string[]; marcados: string[]; onToggle: (i: string) => void; disabled: boolean; travados?: Set<string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {itens.map((i) => {
        const on = marcados.includes(i);
        const travado = travados?.has(i);
        return (
          <button
            key={i}
            type="button"
            disabled={disabled || travado}
            onClick={() => onToggle(i)}
            title={travado ? "Já enviado ao app" : undefined}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${on ? "border-primary bg-primary/15 font-semibold" : "border-border hover:bg-accent"}`}
          >
            {travado && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
            {i}
          </button>
        );
      })}
    </div>
  );
}

export function FichaForm({
  ficha,
  cliente,
  advogados,
  tiposEnviados,
  causas,
  podeEditar,
  podeTrocarAdvogado,
}: {
  ficha: FichaSerializada;
  cliente: ClienteSerializado;
  advogados: { chave: string; nome: string }[];
  tiposEnviados: string[];
  causas: { id: string; titulo: string }[] | null;
  podeEditar: boolean;
  podeTrocarAdvogado: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [dados, setDados] = useState<FichaDados>(ficha.dados);
  const [empresa, setEmpresa] = useState(ficha.empresa ?? "");
  const [advogado, setAdvogado] = useState(ficha.advogadoChave ?? "");
  const [causa, setCausa] = useState(ficha.recebimentoId ?? "");
  const [cli, setCli] = useState<Record<string, Valor>>(() => Object.fromEntries(CAMPOS_CLIENTE.map((c) => [c.k, (cliente as Record<string, unknown>)[c.k] as Valor])));
  const off = !podeEditar || pending;

  const setBloco = (b: Bloco) => (k: string, v: Valor) => setDados((d) => ({ ...d, [b]: { ...((d[b] as object) ?? {}), [k]: v } }));
  const lista = documentosMarcados(dados.documentos ?? [], tiposEnviados);
  const enviados = new Set(lista.filter((d) => d.enviado).map((d) => d.item));
  const alternar = (campo: "documentos" | "teses" | "dias") => (i: string) =>
    setDados((d) => {
      if (campo === "dias") {
        const atual = d.jornada?.dias ?? [];
        return { ...d, jornada: { ...d.jornada, dias: atual.includes(i) ? atual.filter((x) => x !== i) : [...atual, i] } };
      }
      const atual = d[campo] ?? [];
      return { ...d, [campo]: atual.includes(i) ? atual.filter((x) => x !== i) : [...atual, i] };
    });

  function salvar(enviar: boolean) {
    setMsg(null);
    if (enviar) {
      const motivo = podeEnviarFicha({ empresa, advogadoChave: advogado });
      if (motivo) return setMsg({ ok: false, texto: motivo });
    }
    start(async () => {
      const corpo = {
        empresa,
        dados,
        cliente: Object.fromEntries(Object.entries(cli).map(([k, v]) => [k, v ?? ""])),
        ...(podeTrocarAdvogado && { advogadoChave: advogado || null }),
        ...(causas && { recebimentoId: causa || null }),
        ...(enviar && { acao: "enviar" }),
      };
      const res = await fetch(`/api/fichas/${ficha.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
      const j = await res?.json().catch(() => ({}));
      if (!res?.ok) return setMsg({ ok: false, texto: j?.error ?? "Não foi possível salvar." });
      setMsg({ ok: true, texto: enviar ? "Ficha enviada ao advogado." : "Ficha salva." });
      router.refresh();
    });
  }

  const nomeAdvogado = advogados.find((a) => a.chave === advogado)?.nome ?? advogado;

  return (
    <div className="space-y-3">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Ficha de atendimento</h1>
        <p className="text-sm text-muted-foreground">
          {ficha.situacao === "ENVIADA" ? "Enviada ao advogado" : "Rascunho"}
          {!podeEditar && " · só leitura"}
        </p>
      </section>

      <Secao n={0} titulo="Dados do atendimento" aberta>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data do atendimento</span>
            <input type="date" className={caixa} value={dados.dataAtendimento ?? ""} onChange={(e) => setDados((d) => ({ ...d, dataAtendimento: e.target.value }))} disabled={off} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advogado(a) responsável</span>
            {podeTrocarAdvogado ? (
              <CampoEscolha value={advogado} onChange={(e) => setAdvogado(e.target.value)} disabled={off}>
                <option value="">Escolha…</option>
                {advogado && !advogados.some((a) => a.chave === advogado) && <option value={advogado}>{advogado}</option>}
                {advogados.map((a) => (
                  <option key={a.chave} value={a.chave}>
                    {a.nome}
                  </option>
                ))}
              </CampoEscolha>
            ) : (
              <input className={caixa} value={nomeAdvogado} disabled />
            )}
          </label>
          {causas && causas.length > 0 && (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ligar a uma causa (depois do acordo)</span>
              <CampoEscolha value={causa} onChange={(e) => setCausa(e.target.value)} disabled={off}>
                <option value="">Nenhuma</option>
                {causas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </CampoEscolha>
            </label>
          )}
        </div>
      </Secao>

      <Secao n={1} titulo="Dados do(a) cliente (reclamante)">
        <p className="text-xs text-muted-foreground">Estes dados são os do cadastro do cliente: mudar aqui muda lá.</p>
        <Grade campos={CAMPOS_CLIENTE} valores={cli} set={(k, v) => setCli((c) => ({ ...c, [k]: v }))} disabled={off} />
      </Secao>

      <Secao n={2} titulo={BLOCOS[0].titulo}>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome / razão social *</span>
          <input className={caixa} value={empresa} onChange={(e) => setEmpresa(e.target.value)} disabled={off} />
        </label>
        <Grade campos={BLOCOS[0].campos} valores={(dados.empresa ?? {}) as Record<string, Valor>} set={setBloco("empresa")} disabled={off} />
      </Secao>

      <Secao n={3} titulo={BLOCOS[1].titulo}>
        <Grade campos={BLOCOS[1].campos} valores={(dados.contrato ?? {}) as Record<string, Valor>} set={setBloco("contrato")} disabled={off} />
      </Secao>

      <Secao n={4} titulo={BLOCOS[2].titulo}>
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dias trabalhados</span>
          <Marcar
            itens={O.dias.map((d) => d.rotulo)}
            marcados={O.dias.filter((d) => dados.jornada?.dias?.includes(d.valor)).map((d) => d.rotulo)}
            onToggle={(r) => alternar("dias")(O.dias.find((d) => d.rotulo === r)!.valor)}
            disabled={off}
          />
        </div>
        <Grade campos={BLOCOS[2].campos} valores={(dados.jornada ?? {}) as Record<string, Valor>} set={setBloco("jornada")} disabled={off} />
      </Secao>

      <Secao n={5} titulo={BLOCOS[3].titulo}>
        <Grade campos={BLOCOS[3].campos} valores={(dados.ambiente ?? {}) as Record<string, Valor>} set={setBloco("ambiente")} disabled={off} />
      </Secao>

      <Secao n={6} titulo={BLOCOS[4].titulo}>
        <Grade campos={BLOCOS[4].campos} valores={(dados.verbas ?? {}) as Record<string, Valor>} set={setBloco("verbas")} disabled={off} />
      </Secao>

      <Secao n={7} titulo="Principais reclamações e relato do cliente">
        <textarea className={`${caixa} h-48 py-2`} value={dados.relato ?? ""} onChange={(e) => setDados((d) => ({ ...d, relato: e.target.value }))} disabled={off} />
      </Secao>

      <Secao n={8} titulo="Documentos apresentados / solicitados">
        <p className="text-xs text-muted-foreground">Os que já foram enviados ao app aparecem marcados sozinhos.</p>
        <Marcar itens={O.documentosChecklist} marcados={lista.filter((d) => d.marcado).map((d) => d.item)} onToggle={alternar("documentos")} disabled={off} travados={enviados} />
      </Secao>

      <Secao n={9} titulo="Direitos pleiteados (tese)">
        <Marcar itens={O.teses} marcados={dados.teses ?? []} onToggle={alternar("teses")} disabled={off} />
      </Secao>

      <Secao n={10} titulo={BLOCOS[5].titulo}>
        <Grade campos={BLOCOS[5].campos} valores={(dados.outras ?? {}) as Record<string, Valor>} set={setBloco("outras")} disabled={off} />
      </Secao>

      {podeEditar && (
        <div className="sticky bottom-24 z-30 rounded-2xl border border-border bg-background/95 p-3 backdrop-blur md:bottom-4">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2">
            {msg && <p className={`mr-auto text-sm ${msg.ok ? "text-emerald-400" : "text-rose-300"}`}>{msg.texto}</p>}
            <Button type="button" variant="outline" onClick={() => salvar(false)} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar
            </Button>
            {podeTrocarAdvogado && (
              <Button type="button" onClick={() => salvar(true)} disabled={pending}>
                <Send /> {ficha.situacao === "ENVIADA" ? "Reenviar ao advogado" : "Enviar ao advogado"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
