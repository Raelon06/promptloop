import type { Metadata } from "next";
import "./globals.css";
import { Terminal, Shield, BookOpen, GitCompare, History, Sliders, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "PromptLoop — Yapay Zeka Prompt Optimizasyon Platformu",
  description: "Qwen3:4b destekli evrensel prompt mühendisliği, analiz ve optimizasyon platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        {/* MANDATORY Modern Web Guidance: declare color scheme early to eliminate FOUC */}
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="bg-[#060913] text-[#F8FAFC] min-h-screen flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Global Navigation Header */}
        <header className="sticky top-0 z-50 bg-[#0A0E1A]/90 backdrop-blur-md border-b border-[#1E293B]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo & Tag */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-teal-400 flex items-center justify-center text-[#060913] font-black text-sm shadow-lg shadow-cyan-500/25">
                PL
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                  PROMPT<span className="text-[#00E5FF]">LOOP</span>
                </span>
                <span className="text-[10px] text-gray-400 block -mt-1 font-mono uppercase tracking-wider">
                  Platform V3.4.2
                </span>
              </div>
            </div>

            {/* Navigation Tabs (Türkçe) */}
            <nav className="hidden md:flex items-center gap-1.5">
              <a
                href="/"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#162032] text-[#00E5FF] border border-[#00E5FF]/30 flex items-center gap-1.5 shadow-sm"
              >
                <Terminal className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Prompt Optimizasyonu</span>
              </a>
              <a
                href="#evaluation"
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#162032]/60 transition flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Kalite Değerlendirme</span>
              </a>
              <a
                href="#benchmark"
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#162032]/60 transition flex items-center gap-1.5"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>A/B Kıyaslama</span>
              </a>
              <a
                href="#library"
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#162032]/60 transition flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kütüphane</span>
              </a>
              <a
                href="#history"
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#162032]/60 transition flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                <span>Geçmiş</span>
              </a>
            </nav>

            {/* Live Model & Status Pill */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827] border border-[#1F293D] text-xs text-gray-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[#00E5FF] font-semibold">qwen3:4b</span>
                <span className="text-[11px] text-gray-400 hidden sm:inline">(Yerel Ollama)</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 py-6">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-[#1E293B] bg-[#0A0E1A]/60 py-6 text-xs text-gray-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00E5FF]" />
              <span>PromptLoop Enterprise — Şeffaf Rubrik ve Bağımsız Kanıt Doğrulama Mimarisi</span>
            </div>
            <div className="text-gray-400 font-mono text-[11px]">
              Sürüm: <span className="text-gray-200">V3.4.2</span> | Motor: <span className="text-gray-200">FastAPI + Ollama (Qwen3:4b)</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
