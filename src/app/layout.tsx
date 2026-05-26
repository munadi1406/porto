import { MobileNav } from "@/components/MobileNav";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "sonner";
import { TopProgressBar } from "@/components/TopProgressBar";
import { Inter, Geist } from "next/font/google";
import { ThemeInit } from "@/components/ThemeInit";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="id" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeInit />
        <QueryProvider>
          <TopProgressBar />
          <Toaster position="top-right" />
          <MobileNav />
          <div className="md:pl-64">
            <div className="pt-16 pb-20 md:pt-8 md:pb-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
