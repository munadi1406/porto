"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AnalysisError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Analysis error:", error);
  }, [error]);

  return (
    <Card className="mx-4 lg:mx-6">
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">Gagal Memuat Analisis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || "Terjadi kesalahan saat memuat data saham."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={reset} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
