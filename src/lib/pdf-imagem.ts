// Foto vira PDF no navegador antes do envio (o PJe só aceita PDF).

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = 18;

/** Tamanho em pixels para a foto no PDF: no máximo `max` no lado maior, sem aumentar. */
export function escalaParaPdf(largura: number, altura: number, max = 2000): { largura: number; altura: number } {
  const fator = Math.min(1, max / Math.max(largura, altura));
  return { largura: Math.round(largura * fator), altura: Math.round(altura * fator) };
}

export function ehImagem(mime: string): boolean {
  return mime.startsWith("image/");
}

export function ehPdf(f: { type: string; name: string }): boolean {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}

export function nomePdf(nome: string): string {
  return `${nome.replace(/\.[^./\\]+$/, "")}.pdf`;
}

async function abrirImagem(arquivo: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(arquivo);
  } catch {
    // Alguns navegadores só abrem certos formatos (ex.: HEIC no iPhone) pela tag <img>.
    const url = URL.createObjectURL(arquivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function fotoEmJpeg(arquivo: File): Promise<{ bytes: ArrayBuffer; largura: number; altura: number }> {
  let img;
  try {
    img = await abrirImagem(arquivo);
  } catch {
    throw new Error(`Não foi possível abrir ${arquivo.name}.`);
  }
  const t = escalaParaPdf(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = t.largura;
  canvas.height = t.altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`Não foi possível abrir ${arquivo.name}.`);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, t.largura, t.altura);
  ctx.drawImage(img, 0, 0, t.largura, t.altura);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
  if (!blob) throw new Error(`Não foi possível abrir ${arquivo.name}.`);
  return { bytes: await blob.arrayBuffer(), ...t };
}

type Doc = Awaited<ReturnType<typeof import("pdf-lib").PDFDocument.create>>;

async function colocarFoto(pdf: Doc, arquivo: File) {
  const foto = await fotoEmJpeg(arquivo);
  const img = await pdf.embedJpg(foto.bytes);
  // Página A4 deitada quando a foto é mais larga que alta.
  const deitada = foto.largura > foto.altura;
  const pw = deitada ? A4.altura : A4.largura;
  const ph = deitada ? A4.largura : A4.altura;
  const s = Math.min((pw - 2 * MARGEM) / foto.largura, (ph - 2 * MARGEM) / foto.altura);
  const w = foto.largura * s;
  const h = foto.altura * s;
  pdf.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
}

async function emPdf(pdf: Doc): Promise<ArrayBuffer> {
  const bytes = await pdf.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Converte os arquivos em PDF. PDFs passam direto; fotos viram uma página A4 cada.
 * `juntar`: tudo num PDF só (uma página por foto, páginas dos PDFs na ordem), com o nome do primeiro.
 */
export async function paraPdf(arquivos: File[], juntar: boolean): Promise<File[]> {
  const precisa = arquivos.some((a) => !ehPdf(a));
  if (!precisa && (!juntar || arquivos.length < 2)) return arquivos;
  const { PDFDocument } = await import("pdf-lib");

  if (juntar && arquivos.length > 1) {
    const pdf = await PDFDocument.create();
    for (const a of arquivos) {
      if (ehPdf(a)) {
        let origem;
        try {
          origem = await PDFDocument.load(await a.arrayBuffer(), { ignoreEncryption: true });
        } catch {
          throw new Error(`Não foi possível abrir ${a.name}.`);
        }
        for (const pg of await pdf.copyPages(origem, origem.getPageIndices())) pdf.addPage(pg);
      } else {
        await colocarFoto(pdf, a);
      }
    }
    return [new File([await emPdf(pdf)], nomePdf(arquivos[0].name), { type: "application/pdf" })];
  }

  const saida: File[] = [];
  for (const a of arquivos) {
    if (ehPdf(a)) {
      saida.push(a.type === "application/pdf" ? a : new File([a], a.name, { type: "application/pdf" }));
      continue;
    }
    const pdf = await PDFDocument.create();
    await colocarFoto(pdf, a);
    saida.push(new File([await emPdf(pdf)], nomePdf(a.name), { type: "application/pdf" }));
  }
  return saida;
}
