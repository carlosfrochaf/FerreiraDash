// Pasta do cliente para baixar no computador (.zip): ficha, documentos e provas em subpastas. Puro.
import { rotuloTipo, type TipoDoc } from "./documentos";

/** Subpasta de cada tipo. "" = raiz (documentos pessoais e os da contratação). */
export function pastaDoTipo(tipo: TipoDoc): string {
  switch (tipo) {
    case "RG_CNH":
    case "CPF":
    case "COMPROVANTE_ENDERECO":
    case "CTPS":
    case "PROCURACAO":
    case "CONTRATO_HONORARIOS":
    case "DECLARACAO_HIPOSSUFICIENCIA":
      return "";
    case "PETICAO":
    case "DECISAO":
    case "ACORDO_ATA":
    case "ALVARA":
      return "Processo";
    case "COMPROVANTE":
      return "Comprovantes";
    default:
      return "Provas";
  }
}

/** Tira o que o Windows não aceita em nome de arquivo. */
export function nomeSeguro(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "arquivo";
}

function extensao(nome: string, caminho: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(caminho) ?? /\.([a-z0-9]{2,5})$/i.exec(nome);
  return m ? `.${m[1].toLowerCase()}` : "";
}

/**
 * Nome do arquivo dentro do .zip: o nome dado no app (ou o tipo, se for só o nome do arquivo original),
 * com a extensão do arquivo guardado. Repetidos ganham (2), (3)…
 */
export function nomeNoZip(d: { tipo: TipoDoc; nome: string; caminho: string }, usados: Set<string>): string {
  const ext = extensao(d.nome, d.caminho);
  let base = d.nome.replace(/(\.(pdf|docx?|odt|rtf|jpe?g|png|heic|webp))+$/i, "");
  if (!base.trim()) base = rotuloTipo(d.tipo);
  base = nomeSeguro(base);
  const pasta = pastaDoTipo(d.tipo);
  let nome = `${base}${ext}`;
  for (let n = 2; usados.has(`${pasta}/${nome}`.toLowerCase()); n++) nome = `${base} (${n})${ext}`;
  usados.add(`${pasta}/${nome}`.toLowerCase());
  return pasta ? `${pasta}/${nome}` : nome;
}
