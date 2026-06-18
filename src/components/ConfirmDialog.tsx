"use client";

import { AlertTriangle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    const btnVariant = variant === "danger" ? "destructive" : variant === "warning" ? "secondary" : "default";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mb-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">{title}</DialogTitle>
                    <DialogDescription className="text-center">{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>{cancelText}</Button>
                    <Button variant={btnVariant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
