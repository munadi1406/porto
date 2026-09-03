import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "sonner";
import { TopProgressBar } from "@/components/TopProgressBar";
import { Inter } from "next/font/google";
import { ThemeInit } from "@/components/ThemeInit";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { LocaleProvider } from "@/config/locale";
import Axelia from "@/components/Axelia";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

export const metadata = {
  title: "Porto - Portfolio Saham IDX",
  description: "Kelola portfolio investasi saham Indonesia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeInit />
        <LocaleProvider>
          <QueryProvider>
            <TooltipProvider>
                <TopProgressBar />
                <Toaster position="top-right" />
                <SidebarProvider
                  style={
                    {
                      "--sidebar-width": "calc(var(--spacing) * 72)",
                      "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                  }
                >
                  <AppSidebar variant="inset" />
                  <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                      <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
                          {children}
                        </div>
                      </div>
                    </div>
                  </SidebarInset>
                </SidebarProvider>
                <Axelia />
              </TooltipProvider>
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
