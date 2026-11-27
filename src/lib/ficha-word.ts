// Ficha de atendimento em Word (.docx), para o escritório e o advogado editarem à vontade.
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
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
    {
      titulo: "Documentos apresentados / solicitados",
      linhas: [...lista(docs), ...(d.provasPedidas?.length ? [["Provas pedidas ao cliente", d.provasPedidas.join(", ")] as [string, string]] : [])],
    },
    { titulo: "Direitos pleiteados (tese)", linhas: lista(d.teses) },
    { titulo: outras.titulo, linhas: linhas(outras.campos, d.outras) },
  ];
  return secoes.filter((s) => s.linhas.length > 0);
}

const AZUL = "1B2A4A";
const BORDA = { style: BorderStyle.SINGLE, size: 4, color: "BFC7D5" };
const BORDAS = { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA };
const LARGURA = 9638; // A4 com margens de 2 cm, em twips
const MARGEM_CELULA = { top: 60, bottom: 60, left: 100, right: 100 };

/** Texto com as quebras de linha mantidas (relato, observações). */
function runsDoValor(valor: string, tamanho = 20): TextRun[] {
  return valor.split(/\r?\n/).map((p, i) => new TextRun({ text: p, size: tamanho, break: i > 0 ? 1 : undefined }));
}

/** Célula "Rótulo: valor", com o rótulo em negrito azul, como no modelo do escritório. */
function celula(rotulo: string, valor: string, colunas = 1): TableCell {
  const titulo = rotulo ? [new TextRun({ text: rotulo.endsWith("?") ? `${rotulo} ` : `${rotulo}: `, bold: true, color: AZUL, size: 20 })] : [];
  return new TableCell({
    columnSpan: colunas > 1 ? colunas : undefined,
    width: { size: (LARGURA / 2) * colunas, type: WidthType.DXA },
    margins: MARGEM_CELULA,
    children: [new Paragraph({ children: [...titulo, ...runsDoValor(valor)] })],
  });
}

/** Faixa azul com o título da seção. */
function faixa(titulo: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 0 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: AZUL },
    children: [new TextRun({ text: ` ${titulo}`, bold: true, color: "FFFFFF", size: 24 })],
  });
}

/** Linhas da seção em tabela: dois campos por linha; texto longo e itens de lista ocupam a linha toda. */
function tabela(linhas: [string, string][]): Table {
  const longo = ([r, v]: [string, string]) => !r || v.length > 55 || v.includes("\n");
  const rows: TableRow[] = [];
  const itens = linhas.filter(([r]) => !r).map(([, v]) => v);
  let par: [string, string][] = [];
  const fecharPar = () => {
    if (par.length === 0) return;
    rows.push(new TableRow({ children: par.length === 2 ? par.map(([r, v]) => celula(r, v)) : [celula(par[0][0], par[0][1], 2)] }));
    par = [];
  };
  for (const l of linhas) {
    if (!l[0]) continue; // itens de lista vão juntos no fim
    if (longo(l)) {
      fecharPar();
      rows.push(new TableRow({ children: [celula(l[0], l[1], 2)] }));
      continue;
    }
    par.push(l);
    if (par.length === 2) fecharPar();
  }
  fecharPar();
  if (itens.length) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: LARGURA, type: WidthType.DXA },
            margins: MARGEM_CELULA,
            children: itens.map((v) => new Paragraph({ children: [...(itens.length > 1 ? [new TextRun({ text: "• ", size: 20 })] : []), ...runsDoValor(v)] })),
          }),
        ],
      })
    );
  }
  return new Table({ width: { size: LARGURA, type: WidthType.DXA }, columnWidths: [LARGURA / 2, LARGURA / 2], borders: BORDAS, rows });
}

/** Monta o .docx no modelo do escritório: cabeçalho, e cada seção com faixa azul numerada e tabela com linhas. */
export async function gerarWord(secoes: Secao[], cab: { escritorio: string; cliente: string; empresa: string | null }): Promise<Buffer> {
  const corpo: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cab.escritorio, bold: true, size: 26, color: AZUL })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FICHA DE ATENDIMENTO", bold: true, size: 34, color: AZUL })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: cab.empresa ? `${cab.cliente} × ${cab.empresa}` : cab.cliente, size: 22 })],
    }),
  ];
  let n = 0;
  for (const s of secoes) {
    // "Dados do atendimento" abre a ficha sem número; as demais seguem 1, 2, 3…
    const titulo = s.titulo === "Dados do atendimento" ? s.titulo : `${++n}. ${s.titulo}`;
    corpo.push(faixa(titulo), tabela(s.linhas));
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } }, children: corpo }],
  });
  return Packer.toBuffer(doc);
}
