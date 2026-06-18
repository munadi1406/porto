"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportPDFButtonProps {
    onClick: () => void;
    variant?: "default" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ExportPDFButton({
    onClick,
    variant = "outline",
    size = "sm",
    className,
}: ExportPDFButtonProps) {
    const baseStyles = "inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variantStyles = {
        default: "bg-primary hover:bg-primary/80 text-primary-foreground focus:ring-primary/50",
        ghost: "bg-transparent hover:bg-muted text-muted-foreground",
        outline: "border border-border bg-card hover:bg-muted text-muted-foreground focus:ring-muted-foreground",
    };

    const sizeStyles = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-2.5 text-base",
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                baseStyles,
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
        >
            <Download className={cn(
                size === "sm" && "w-3.5 h-3.5",
                size === "md" && "w-4 h-4",
                size === "lg" && "w-5 h-5",
            )} />
            Export PDF
        </button>
    );
}
