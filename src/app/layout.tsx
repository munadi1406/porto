import { MobileNav } from "@/components/MobileNav";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "sonner";
import { TopProgressBar } from "@/components/TopProgressBar";
import "./globals.css";

export const metadata = {
  title: "Portfolio Saham IDX",
  description: "Kelola portfolio investasi saham Indonesia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-gray-50 dark:bg-gray-950">
        <QueryProvider>
          <TopProgressBar />
          <Toaster position="top-right" richColors />
          <MobileNav />

          {/* Desktop: with sidebar padding. Mobile: with top and bottom nav padding */}
          <div className="md:pl-64">
            <div className="pt-20 pb-16 md:pt-0 md:pb-0">
              {children}
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
