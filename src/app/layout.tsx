import { MobileNav } from "@/components/MobileNav";
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
        <MobileNav />

        {/* Desktop: with sidebar padding */}
        <div className="md:pl-64">
          {/* Mobile: with bottom nav padding */}
          <div className="pb-16 md:pb-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
