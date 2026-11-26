// App do escritório: senha única (conferida no middleware). Quem usa é sempre o escritório, como dono.
import type { NextResponse } from "next/server";
import type { Perfil } from "./perfis";

export type UsuarioLogado = { id: string; nome: string; perfil: Perfil; advogadoChave: string | null };

export const ESCRITORIO: UsuarioLogado = { id: "escritorio", nome: "Escritório", perfil: "DONO", advogadoChave: null };

export async function usuarioAtual(): Promise<UsuarioLogado> {
  return ESCRITORIO;
}

export async function usuarioOpcional(): Promise<UsuarioLogado | null> {
  return ESCRITORIO;
}

/** A senha já foi conferida no middleware; aqui só devolve quem usa. */
export async function exigirPerfilApi(_request: Request): Promise<UsuarioLogado | NextResponse> {
  return ESCRITORIO;
}
