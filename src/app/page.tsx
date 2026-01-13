import Dashboard from "@/components/Dashboard";
import { LayoutDashboard, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-600 rounded-xl blur-lg opacity-20"></div>
                  <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
                    <LayoutDashboard className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Portfolio Saham IDX
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Kelola investasi Anda dengan data real-time
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-xs font-medium text-green-700 dark:text-green-400">Market Status</div>
                  <div className="text-sm font-bold text-green-600 dark:text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    IDX Live
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard */}
        <Dashboard />

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Portfolio Saham IDX • Data by Yahoo Finance
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Bukan saran investasi • Gunakan dengan bijak
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
