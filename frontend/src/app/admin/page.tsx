"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  KeyRound,
  Users,
  Activity,
  Calendar,
  Layers,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface RecentLog {
  id: number;
  run_id: string;
  ip: string;
  task_type: string;
  model_id: string;
  prompt_preview: string;
  prompt_length: number;
  status: string;
  created_at: number;
}

interface AdminData {
  total_requests: number;
  unique_visitors: number;
  requests_today: number;
  task_distribution: { task_type: string; count: number }[];
  recent_logs: RecentLog[];
}

export default function AdminPage() {
  const [pin, setPin] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [filterText, setFilterText] = useState<string>("");

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://promptloop-api.onrender.com";

  // Daha önce kaydedilmiş PIN varsa otomatik yükle
  useEffect(() => {
    const savedPin = sessionStorage.getItem("promptloop_admin_pin");
    if (savedPin) {
      setPin(savedPin);
      fetchMetrics(savedPin);
    }
  }, []);

  const fetchMetrics = async (secretKey: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_key: secretKey, limit: 100 }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Geçersiz Yönetici Şifresi! Lütfen tekrar deneyin.");
        }
        throw new Error(`İstatistikler alınamadı (${res.status})`);
      }

      const data: AdminData = await res.json();
      setAdminData(data);
      setIsAuthenticated(true);
      sessionStorage.setItem("promptloop_admin_pin", secretKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bağlantı hatası oluştu.";
      setErrorMessage(msg);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage("Lütfen yönetici şifresini girin.");
      return;
    }
    fetchMetrics(pin);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminData(null);
    setPin("");
    sessionStorage.removeItem("promptloop_admin_pin");
  };

  const filteredLogs = adminData?.recent_logs.filter((log) => {
    if (!filterText) return true;
    const s = filterText.toLowerCase();
    return (
      log.prompt_preview.toLowerCase().includes(s) ||
      log.ip.toLowerCase().includes(s) ||
      log.task_type.toLowerCase().includes(s) ||
      log.model_id.toLowerCase().includes(s)
    );
  });

  return (
    <div className="w-full min-h-screen bg-[#07090E] text-[#EDEDED] font-sans">
      {/* Üst Bar */}
      <header className="border-b border-[#141925] bg-[#0A0D14]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white transition px-2 py-1 rounded bg-[#0E131F] border border-[#1C2538]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Stüdyoya Dön</span>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00E5FF]" />
              <span className="font-bold text-sm text-white">PromptLoop</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] font-mono border border-[#00E5FF]/30">
                Yönetici Paneli
              </span>
            </div>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchMetrics(pin)}
                disabled={isLoading}
                className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-white px-2.5 py-1 rounded bg-[#0E131F] border border-[#1C2538] transition cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#00E5FF] ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">Yenile</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 transition"
              >
                Çıkış
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          /* GİRİŞ EKRANI (ŞİFRELİ / PIN) */
          <div className="max-w-md mx-auto pt-16 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0E17] border border-[#1C2538] shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-[#0E1522] border border-[#00E5FF]/30 text-[#00E5FF] flex items-center justify-center mx-auto shadow-sm">
                  <KeyRound className="w-6 h-6 text-[#00E5FF]" />
                </div>
                <h1 className="text-lg font-bold text-white">Yönetici Girişi</h1>
                <p className="text-xs text-[#64748B]">
                  Ziyaretçi etkinliklerini ve kullanım metriklerini görmek için yönetici şifrenizi girin.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-medium block">
                    Yönetici Şifresi / PIN
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Şifreyi buraya yazın..."
                    className="w-full bg-[#080B12] border border-[#1C2538] focus:border-[#00E5FF] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                    autoFocus
                  />
                  <span className="text-[10px] text-[#475569] block">
                    Varsayılan şifre: <code className="text-[#00E5FF]">promptloop2026</code>
                  </span>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !pin.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33EAFF] text-[#060913] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-[#060913] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Panele Giriş Yap</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* YÖNETİCİ GÖSTERGE PANELİ */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Metrik Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0B0E17] border border-[#161D2C] space-y-1">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-xs font-medium">Toplam İstek</span>
                  <Activity className="w-4 h-4 text-[#00E5FF]" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {adminData?.total_requests || 0}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Sistem kurulduğundan bu yana üretilen prompt sayısı
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0E17] border border-[#161D2C] space-y-1">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-xs font-medium">Tekil Ziyaretçi</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {adminData?.unique_visitors || 0}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Farklı cihaz/IP üzerinden optimize eden kişi sayısı
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0E17] border border-[#161D2C] space-y-1">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-xs font-medium">Bugünkü İstekler</span>
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {adminData?.requests_today || 0}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Son 24 saat içinde gerçekleşen optimizasyonlar
                </div>
              </div>
            </div>

            {/* Görev Dağılımı Rozetleri */}
            {adminData?.task_distribution && adminData.task_distribution.length > 0 && (
              <div className="p-4 rounded-xl bg-[#0B0E17] border border-[#161D2C] flex flex-wrap items-center gap-3 text-xs">
                <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#00E5FF]" />
                  En Çok Kullanılan Görevler:
                </span>
                {adminData.task_distribution.map((t) => (
                  <span
                    key={t.task_type}
                    className="px-2.5 py-1 rounded-md bg-[#0E131F] border border-[#1C2538] text-[#E2E8F0] font-mono text-[11px]"
                  >
                    {t.task_type}: <strong className="text-[#00E5FF]">{t.count}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Son İstekler Tablosu & Arama */}
            <div className="rounded-xl bg-[#0B0E17] border border-[#161D2C] overflow-hidden space-y-3 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#141A27] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00E5FF]" />
                    <span>Ziyaretçi Optimizasyon Akışı</span>
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Giren kişilerin optimize ettiği promptlar ve zaman damgaları
                  </p>
                </div>

                {/* Filtreleme */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Prompt veya IP filtrele..."
                    className="bg-[#080B12] border border-[#1C2538] rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              {/* Tablo */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#141A27] text-[#64748B] text-[11px] font-mono">
                      <th className="py-2.5 pr-4">ZAMAN</th>
                      <th className="py-2.5 pr-4">CİHAZ / IP</th>
                      <th className="py-2.5 pr-4">GÖREV TÜRÜ</th>
                      <th className="py-2.5 pr-4">MODEL</th>
                      <th className="py-2.5">PROMPT ÖZETİ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141A27]">
                    {filteredLogs && filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-[#0E131F]/60 transition"
                        >
                          <td className="py-3 pr-4 text-[#94A3B8] font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.created_at * 1000).toLocaleString("tr-TR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3 pr-4 font-mono text-[#00E5FF] text-[11px] whitespace-nowrap">
                            {log.ip}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-[#162032] text-[#93C5FD] font-mono text-[10px]">
                              {log.task_type}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-[#94A3B8] font-mono text-[10px] whitespace-nowrap">
                            {log.model_id}
                          </td>
                          <td className="py-3 text-[#E2E8F0] font-mono text-[11px] leading-relaxed max-w-md">
                            {log.prompt_preview}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-[#64748B] text-xs"
                        >
                          Henüz kayıtlı bir istek bulunmuyor veya filtreye uyan sonuç yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
