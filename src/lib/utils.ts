import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatIDR(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat("id-ID").format(num);
}

export function formatPercentage(num: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num / 100);
}

export function formatCompactIDR(amount: number): string {
    if (amount >= 1e15) return `Rp ${(amount / 1e15).toFixed(2)} Kua`;
    if (amount >= 1e12) return `Rp ${(amount / 1e12).toFixed(2)} T`;
    if (amount >= 1e9) return `Rp ${(amount / 1e9).toFixed(2)} M`;
    if (amount >= 1e6) return `Rp ${(amount / 1e6).toFixed(2)} Juta`;
    return formatIDR(amount);
}
