"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
    isOpen, onClose, onConfirm, title, message,
    confirmText = "Hapus", cancelText = "Batal", variant = "danger",
}: ConfirmDialogProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: { icon: "text-[var(--danger)]", iconBg: "bg-[var(--danger-bg)]", button: "bg-[var(--danger)] hover:opacity-90" },
        warning: { icon: "text-[var(--warning)]", iconBg: "bg-[var(--warning-bg)]", button: "bg-[var(--warning)] hover:opacity-90" },
        info: { icon: "text-[var(--accent)]", iconBg: "bg-[var(--accent)]/10", button: "bg-[var(--accent)] hover:opacity-90" },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} />
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--fg)] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3", styles.iconBg)}>
                        <AlertTriangle className={cn("w-5 h-5", styles.icon)} />
                    </div>
                    <h3 className="font-medium text-[var(--fg)] text-center mb-2">{title}</h3>
                    <p className="text-sm text-[var(--muted-fg)] text-center mb-5">{message}</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] transition-colors">
                            {cancelText}
                        </button>
                        <button onClick={() => { onConfirm(); onClose(); }} className={cn("flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors", styles.button)}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
