"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground">Terjadi Kesalahan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message || "Gagal memuat data. Silakan coba lagi."}
        </p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Coba Lagi
      </Button>
    </div>
  );
}
