import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIDR(value: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatCompactIDR(value: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Rp0";
  if (num >= 1e12) return `Rp${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `Rp${(num / 1e9).toFixed(2)}M`;
  if (num >= 1e6) return `Rp${(num / 1e6).toFixed(2)}JT`;
  if (num >= 1e3) return `Rp${(num / 1e3).toFixed(0)}RB`;
  return formatIDR(num);
}

export function formatPercentage(value: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.00%";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
}
