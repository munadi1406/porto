import { MobileNav } from "@/components/MobileNav";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "sonner";
import { TopProgressBar } from "@/components/TopProgressBar";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-gradient-to-tr from-[#f8fafc] via-[#f1f5f9] to-[#edf2f7] min-h-screen font-sans antialiased text-slate-800 transition-colors duration-300">
        <QueryProvider>
          <TopProgressBar />
          <Toaster position="top-right" richColors />
          <MobileNav />

          {/* Desktop: with sidebar padding. Mobile: with top and bottom nav padding */}
          <div className="md:pl-72">
            <div className="pt-20 pb-16 md:pt-10 md:pb-10">
              {children}
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
