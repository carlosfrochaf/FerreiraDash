import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num || 0);
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export function maskCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  const cents = parseInt(digits || "0", 10);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toDecimalNumber(value: number): number {
  return Math.round(value * 100) / 100;
}
