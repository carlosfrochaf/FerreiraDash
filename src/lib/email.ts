// E-mail pelo Gmail (SMTP com "senha de app"). Sem GMAIL_USUARIO/GMAIL_SENHA_APP, o app não manda e-mail.
import nodemailer from "nodemailer";
import { APP_NAME } from "./constants";

export function emailConfigurado(): boolean {
  return !!process.env.GMAIL_USUARIO?.trim() && !!process.env.GMAIL_SENHA_APP?.trim();
}

export async function enviarEmail(para: string, assunto: string, texto: string, html: string): Promise<void> {
  const usuario = process.env.GMAIL_USUARIO!.trim();
  const transporte = nodemailer.createTransport({
    service: "gmail",
    auth: { user: usuario, pass: process.env.GMAIL_SENHA_APP!.replace(/\s/g, "") },
  });
  await transporte.sendMail({ from: `"${APP_NAME.replace(/"/g, "")}" <${usuario}>`, to: para, subject: assunto, text: texto, html });
}
