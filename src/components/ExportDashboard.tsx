"use client";

import { useState } from "react";
import { Download, Eye, EyeOff } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface ExportDashboardProps {
    targetRef: React.RefObject<HTMLDivElement | null>;
    filename?: string;
}

export function ExportDashboard({ targetRef, filename = "dashboard" }: ExportDashboardProps) {
    const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!targetRef.current) {
            toast.error("Dashboard tidak ditemukan");
            return;
        }

        setIsExporting(true);
        toast.info("Memproses export...");

        try {
            // Wait a bit for privacy mode to apply if needed
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(targetRef.current, {
                backgroundColor: "#ffffff",
                scale: 2, // Higher quality
                logging: false,
                useCORS: true,
                allowTaint: true,
                windowWidth: targetRef.current.scrollWidth,
                windowHeight: targetRef.current.scrollHeight,
            });

            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (!blob) {
                    toast.error("Gagal membuat gambar");
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                const timestamp = new Date().toISOString().split("T")[0];
                link.download = `${filename}-${timestamp}${isPrivacyMode ? "-private" : ""}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);

                toast.success("Dashboard berhasil di-export!");
            }, "image/png");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Gagal export dashboard");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Privacy Mode Toggle */}
            <button
                onClick={togglePrivacyMode}
                className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm
          transition-all duration-200 border
          ${isPrivacyMode
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                    }
          hover:shadow-md active:scale-95
        `}
                title={isPrivacyMode ? "Nonaktifkan Mode Privacy" : "Aktifkan Mode Privacy"}
            >
                {isPrivacyMode ? (
                    <>
                        <EyeOff className="w-4 h-4" />
                        <span className="hidden sm:inline">Privacy ON</span>
                    </>
                ) : (
                    <>
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Privacy OFF</span>
                    </>
                )}
            </button>

            {/* Export Button */}
            <button
                onClick={handleExport}
                disabled={isExporting}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm
          bg-gradient-to-r from-blue-500 to-blue-600 text-white
          border border-blue-600 shadow-md
          hover:from-blue-600 hover:to-blue-700 hover:shadow-lg
          active:scale-95 transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
            >
                <Download className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} />
                <span className="hidden sm:inline">
                    {isExporting ? "Exporting..." : "Export"}
                </span>
            </button>

            {/* Hidden style for privacy mode */}
            {isPrivacyMode && (
                <style jsx global>{`
          .privacy-blur {
            filter: blur(8px);
            user-select: none;
          }
        `}</style>
            )}
        </div>
    );
}
