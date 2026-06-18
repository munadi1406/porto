import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "sonner";
import { TopProgressBar } from "@/components/TopProgressBar";
import { Inter } from "next/font/google";
import { ThemeInit } from "@/components/ThemeInit";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClientMobileNav } from "@/components/ClientMobileNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

export const metadata = {
  title: "Portfolio Saham IDX",
  description: "Kelola portfolio investasi saham Indonesia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeInit />
        <QueryProvider>
          <TooltipProvider>
            <TopProgressBar />
            <Toaster position="top-right" />
            <ClientMobileNav />
            <div className="md:pl-64">
              <div className="pt-14 pb-20 md:pt-6 md:pb-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {children}
                </div>
              </div>
            </div>
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
