// Ficha de atendimento em Word (.docx), para o escritório e o advogado editarem à vontade.
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { documentosMarcados, OPCOES_FICHA, type FichaDados } from "./ficha";
import { BLOCOS, CAMPOS_CLIENTE, type Campo } from "./ficha-campos";

export type Secao = { titulo: string; linhas: [string, string][] };

function dataBr(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

const capitalizar = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function texto(campo: Campo, v: unknown): string {
  if (v === true) return "Sim";
  if (v === false) return "Não";
  if (typeof v !== "string" || !v.trim()) return "";
  return campo.tipo === "data" ? dataBr(v.trim()) : v.trim();
}

function linhas(campos: Campo[], valores: Record<string, unknown> | undefined): [string, string][] {
  return campos.map((c): [string, string] => [c.rotulo, texto(c, valores?.[c.k])]).filter(([, v]) => v);
}

/** Blocos da ficha prontos para escrever: só o que foi preenchido, com datas e Sim/Não por extenso. */
export function secoesDaFicha(f: {
  dados: FichaDados;
  empresa: string | null;
  advogadoNome: string | null;
  cliente: Record<string, unknown>;
  tiposEnviados?: string[];
}): Secao[] {
  const d = f.dados;
  const lista = (itens: string[] | undefined): [string, string][] => (itens ?? []).map((i): [string, string] => ["", i]);
  const [empresa, contrato, jornada, ambiente, verbas, outras] = BLOCOS;
  const dias = OPCOES_FICHA.dias.filter((x) => d.jornada?.dias?.includes(x.valor)).map((x) => capitalizar(x.rotulo));
  const docs = documentosMarcados(d.documentos ?? [], f.tiposEnviados ?? [])
    .filter((x) => x.marcado)
    .map((x) => (x.enviado ? `${x.item} (no app)` : x.item));

  const secoes: Secao[] = [
    {
      titulo: "Dados do atendimento",
      linhas: [
        ["Data do atendimento", d.dataAtendimento ? dataBr(d.dataAtendimento) : ""],
        ["Advogado(a) responsável", f.advogadoNome ?? ""],
      ].filter(([, v]) => v) as [string, string][],
    },
    { titulo: "Dados do(a) cliente (reclamante)", linhas: linhas(CAMPOS_CLIENTE, f.cliente) },
    { titulo: empresa.titulo, linhas: [...(f.empresa?.trim() ? [["Nome / razão social", f.empresa.trim()] as [string, string]] : []), ...linhas(empresa.campos, d.empresa)] },
    { titulo: contrato.titulo, linhas: linhas(contrato.campos, d.contrato) },
    { titulo: jornada.titulo, linhas: [...(dias.length ? [["Dias trabalhados", dias.join(", ")] as [string, string]] : []), ...linhas(jornada.campos, d.jornada)] },
    { titulo: ambiente.titulo, linhas: linhas(ambiente.campos, d.ambiente) },
    { titulo: verbas.titulo, linhas: linhas(verbas.campos, d.verbas) },
    { titulo: "Principais reclamações e relato do cliente", linhas: d.relato?.trim() ? [["", d.relato.trim()]] : [] },
    { titulo: "Documentos apresentados / solicitados", linhas: lista(docs) },
    { titulo: "Direitos pleiteados (tese)", linhas: lista(d.teses) },
    { titulo: outras.titulo, linhas: linhas(outras.campos, d.outras) },
  ];
  return secoes.filter((s) => s.linhas.length > 0);
}

/** Monta o .docx: nome do escritório, título e um bloco por seção. */
export async function gerarWord(secoes: Secao[], cab: { escritorio: string; cliente: string; empresa: string | null }): Promise<Buffer> {
  const corpo: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cab.escritorio, bold: true, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [new TextRun({ text: "Ficha de Atendimento", bold: true, size: 36 })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: cab.empresa ? `${cab.cliente} × ${cab.empresa}` : cab.cliente, size: 24 })],
    }),
  ];
  for (const s of secoes) {
    corpo.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: s.titulo.toUpperCase(), bold: true })] }));
    for (const [rotulo, valor] of s.linhas) {
      // Texto longo (relato, observações) mantém as quebras de linha.
      const partes = valor.split(/\r?\n/);
      const runs = partes.map((p, i) => new TextRun({ text: p, break: i > 0 ? 1 : undefined }));
      corpo.push(new Paragraph({ spacing: { after: 80 }, children: rotulo ? [new TextRun({ text: rotulo.endsWith("?") ? `${rotulo} ` : `${rotulo}: `, bold: true }), ...runs] : [new TextRun({ text: "• " }), ...runs] }));
    }
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children: corpo }],
  });
  return Packer.toBuffer(doc);
}
