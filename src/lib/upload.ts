import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveUpload(file: File): Promise<{ url: string; nome: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || ".jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, safeName), buffer);

  return {
    url: `/uploads/${safeName}`,
    nome: file.name,
  };
}
