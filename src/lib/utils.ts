import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactIDR(value: number): string {
  if (value >= 1e12) return `Rp${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `Rp${(value / 1e9).toFixed(2)}M`;
  if (value >= 1e6) return `Rp${(value / 1e6).toFixed(2)}JT`;
  if (value >= 1e3) return `Rp${(value / 1e3).toFixed(0)}RB`;
  return formatIDR(value);
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
