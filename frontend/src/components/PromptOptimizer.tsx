"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Cpu,
  Edit3,
  Copy,
  Check,
  History,
  Trash2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  X,
} from "lucide-react";
import { optimizePrompt, fetchModels, clarifyPrompt } from "../lib/api";
import {
  OptimizeResponse,
  ModelCapability,
  ClarifyQuestion,
  OptimizeRequest,
} from "../lib/types";

function getClientClarificationQuestions(prompt: string): ClarifyQuestion[] {
  const p = prompt.toLowerCase();

  if (
    p.includes("excel") ||
    p.includes("analiz") ||
    p.includes("rapor") ||
    p.includes("özetle") ||
    p.includes("incele")
  ) {
    return [
      {
        id: "sector_domain",
        question: "Bu analiz hangi sektör veya iş alanı için?",
        options: [
          "FMCG / Hızlı Tüketim & Dağıtım",
          "Perakende, Mağazacılık & E-Ticaret",
          "Üretim, Sanayi & Lojistik",
          "Finans, Muhasebe & Bankacılık",
          "Diğer (Özel Belirtin...)",
        ],
        allow_custom: true,
      },
      {
        id: "target_audience",
        question: "Analiz raporu hangi hedef kitleye sunulacak?",
        options: [
          "C-Level / Üst Düzey Yönetici Özeti (Kısa & Net Aksiyonlar)",
          "Operasyonel / Saha Ekibi (Detaylı Maddeler & KPI'lar)",
          "Teknik & Analitik Uzman Ekip (Ham Metrikler & Formüller)",
        ],
        allow_custom: false,
      },
      {
        id: "focus_metric",
        question: "Analizde öne çıkarılacak ana öncelik nedir?",
        options: [
          "Maliyet, Bütçe ve Finansal Riskler",
          "Operasyonel Hız ve Süreç İyileştirmeleri",
          "Satış Büyümesi, Karlılık & Müşteri Trendleri",
        ],
        allow_custom: false,
      },
    ];
  }

  if (
    p.includes("çıkar") ||
    p.includes("ayıkla") ||
    p.includes("çek") ||
    p.includes("parse") ||
    p.includes("bul")
  ) {
    return [
      {
        id: "sector_domain",
        question: "Bu veri hangi sektör veya iş alanına ait?",
        options: [
          "FMCG / Dağıtım & Bayi Siparişleri",
          "Finans & Muhasebe / Fatura & Ekstre",
          "E-Ticaret / Müşteri Sipariş & Kargo",
          "Diğer (Özel Belirtin...)",
        ],
        allow_custom: true,
      },
      {
        id: "target_format",
        question: "Ayıklanan verinin sunum formatı ne olsun?",
        options: [
          "JSON Şeması (Katı ve Yapılandırılmış)",
          "Markdown Tablosu",
          "Virgülle Ayrılmış CSV / Liste",
        ],
        allow_custom: false,
      },
    ];
  }

  if (
    p.includes("kod") ||
    p.includes("python") ||
    p.includes("script") ||
    p.includes("yazılım") ||
    p.includes("sql")
  ) {
    return [
      {
        id: "sector_domain",
        question: "Kodun çalışacağı iş / uygulama alanı nedir?",
        options: [
          "Veri Mühendisliği & ETL / Otomasyon",
          "Web & API Geliştirme (Fullstack)",
          "Yapay Zeka & Makine Öğrenimi",
          "Diğer (Özel Belirtin...)",
        ],
        allow_custom: true,
      },
      {
        id: "programming_language",
        question: "Hedeflenen programlama dili ve ortamı nedir?",
        options: [
          "Python (Modern 3.11+ / Tip Korumalı)",
          "TypeScript / Node.js",
          "SQL / Veritabanı Sorgusu",
        ],
        allow_custom: false,
      },
    ];
  }

  return [
    {
      id: "sector_domain",
      question: "Bu görev hangi sektör veya uzmanlık alanı ile ilgili?",
      options: [
        "Kurumsal Yönetim & Strateji",
        "Pazarlama, Satış & İletişim",
        "İnsan Kaynakları & Operasyon",
        "Diğer (Özel Belirtin...)",
      ],
      allow_custom: true,
    },
    {
      id: "operational_role",
      question: "Yapay zekanın üstlenmesini istediğiniz uzman rolü nedir?",
      options: [
        "Kıdemli Strateji & Yönetim Danışmanı",
        "Uzman Veri ve İş Analisti",
        "Teknik Çözüm Mimarı",
      ],
      allow_custom: false,
    },
  ];
}

interface HistoryItem {
  id: string;
  original: string;
  improved: string;
  date: string;
  taskType: string;
}

export function PromptOptimizer() {
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("openrouter/free");
  const [selectedProvider, setSelectedProvider] = useState<
    "ollama" | "mock" | "openrouter"
  >("openrouter");
  const [models, setModels] = useState<ModelCapability[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [editablePrompt, setEditablePrompt] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Etkileşimli Bağlam Soruları State'leri
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [showClarifyModal, setShowClarifyModal] = useState<boolean>(false);

  // Doğrulanmış Çalışan Geçmiş (History) State'leri
  const [promptHistory, setPromptHistory] = useState<HistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Sayfa açılışında geçmişi localStorage'dan güvenle yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem("promptloop_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPromptHistory(parsed);
        }
      }
    } catch {
      // LocalStorage erişilemezse sessizce devam et
    }
  }, []);

  // Modelleri çek ve gerçek bağlantı durumunu doğrula
  useEffect(() => {
    async function loadModels() {
      try {
        const data = await fetchModels();
        setModels(data.models);
        if (data.default_model) {
          setSelectedModel(data.default_model);
          const defaultProvider = data.models.find(
            (m) => m.id === data.default_model
          )?.provider;
          if (defaultProvider === "mock") setSelectedProvider("mock");
          else if (defaultProvider === "openrouter")
            setSelectedProvider("openrouter");
          else setSelectedProvider("ollama");
        }
      } catch {
        setModels([
          {
            id: "openrouter/free",
            name: "OpenRouter Ücretsiz Akıllı Model",
            provider: "openrouter",
            context_length: 131072,
            capabilities: ["prompt_optimization"],
            status: "ready",
          },
          {
            id: "mock",
            name: "Deterministik Test Modeli (Mock)",
            provider: "mock",
            context_length: 4096,
            capabilities: ["prompt_optimization"],
            status: "ready",
          },
        ]);
      }
    }
    loadModels();
  }, []);

  const handleStartOptimization = async () => {
    if (!inputPrompt.trim() || inputPrompt.trim().length < 5) {
      setErrorMessage("Lütfen optimize etmek için en az 5 karakterden oluşan bir prompt yazın.");
      return;
    }

    setErrorMessage(null);
    setIsClarifying(true);

    let questionsToAsk: ClarifyQuestion[] = [];

    try {
      const clarifyData = await clarifyPrompt(inputPrompt);
      if (
        clarifyData &&
        clarifyData.questions &&
        clarifyData.questions.length > 0
      ) {
        questionsToAsk = clarifyData.questions;
      }
    } catch {
      // Sunucu henüz hazır değilse yerel soru seti
    }

    if (questionsToAsk.length === 0) {
      questionsToAsk = getClientClarificationQuestions(inputPrompt);
    }

    if (questionsToAsk.length > 0) {
      setClarifyQuestions(questionsToAsk);
      const initialAnswers: Record<string, string> = {};
      questionsToAsk.forEach((q: ClarifyQuestion) => {
        if (q.options && q.options.length > 0) {
          initialAnswers[q.id] = q.options[0];
        }
      });
      setSelectedAnswers(initialAnswers);
      setShowClarifyModal(true);
      setIsClarifying(false);
      return;
    }

    setIsClarifying(false);
    executeOptimization({});
  };

  const executeOptimization = async (answersToUse: Record<string, string>) => {
    setIsLoading(true);
    setErrorMessage(null);
    setShowClarifyModal(false);

    try {
      const resolvedAnswers: Record<string, string> = { ...answersToUse };
      Object.keys(resolvedAnswers).forEach((key) => {
        if (
          resolvedAnswers[key]?.includes("Diğer") &&
          customAnswers[key]?.trim()
        ) {
          resolvedAnswers[key] = `Özel Belirtilen Sektör/Alan: ${customAnswers[key].trim()}`;
        }
      });

      let promptToSend = inputPrompt;
      if (resolvedAnswers && Object.keys(resolvedAnswers).length > 0) {
        const contextLines = Object.entries(resolvedAnswers)
          .map(([k, v]) => `• ${v}`)
          .join("\n");
        promptToSend = `${inputPrompt}\n\n[KULLANICI TERCİHLERİ VE OPERASYONEL BAĞLAM]:\n${contextLines}`;
      }

      const payload: OptimizeRequest = {
        prompt: promptToSend,
        provider: selectedProvider,
        model_id: selectedModel,
        preserve_language: true,
      };

      const data = await optimizePrompt(payload);

      setResult(data);
      setEditablePrompt(data.improved_prompt);

      // Çalışan geçmişe kaydet
      try {
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          original: inputPrompt,
          improved: data.improved_prompt,
          date: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          taskType: data.task_type || "Genel",
        };
        const updated = [historyItem, ...promptHistory.slice(0, 24)];
        setPromptHistory(updated);
        localStorage.setItem("promptloop_history", JSON.stringify(updated));
      } catch {}
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Prompt optimizasyonu sırasında bir hata oluştu. Lütfen tekrar deneyin.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!editablePrompt) return;
    try {
      await navigator.clipboard.writeText(editablePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback kopyalama
      const textArea = document.createElement("textarea");
      textArea.value = editablePrompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setInputPrompt("");
    setResult(null);
    setEditablePrompt("");
    setErrorMessage(null);
  };

  const activeModelObj = models.find((m) => m.id === selectedModel);
  const isModelOnline =
    activeModelObj?.status === "ready" ||
    selectedProvider === "openrouter" ||
    selectedProvider === "mock";

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#07090E] text-[#EDEDED]">
      {/* 1. ÜST BAR: Minimal Marka, Model Seçici & Durum, Geçmiş Butonu */}
      <header className="w-full border-b border-[#141925] bg-[#0A0D14]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Sol: Minimal Marka ve Başlık */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#0E1522] border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] font-black text-xs">
              PL
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                Prompt<span className="text-[#00E5FF]">Loop</span>
              </span>
              <span className="text-[11px] font-medium text-[#64748B] hidden sm:inline">
                / Studio
              </span>
            </div>
          </div>

          {/* Sağ: Model Seçimi, Durum Rozeti ve Geçmiş */}
          <div className="flex items-center gap-2.5">
            {/* Model Seçici */}
            <div className="relative flex items-center">
              <select
                value={selectedModel}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedModel(val);
                  const matched = models.find((m) => m.id === val);
                  if (matched) {
                    if (matched.provider === "mock") setSelectedProvider("mock");
                    else if (matched.provider === "openrouter")
                      setSelectedProvider("openrouter");
                    else setSelectedProvider("ollama");
                  }
                }}
                className="appearance-none bg-[#0E131F] hover:bg-[#131A2B] border border-[#1C2538] hover:border-[#2D3B59] text-xs text-[#E2E8F0] font-medium rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:border-[#00E5FF] transition cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#0A0D14] text-white">
                    {m.name}
                  </option>
                ))}
              </select>
              <Cpu className="w-3.5 h-3.5 text-[#00E5FF] absolute left-2.5 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2 pointer-events-none" />
            </div>

            {/* Gerçek Bağlantı Durumu */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0E131F] border border-[#1C2538] text-[11px] font-mono text-[#94A3B8]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isModelOnline ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span>{isModelOnline ? "Bağlı" : "Çevrimdışı"}</span>
            </div>

            {/* Geçmiş Butonu (Doğrulanmış çalışan özellik) */}
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0E131F] hover:bg-[#131A2B] border border-[#1C2538] text-xs text-[#94A3B8] hover:text-white transition cursor-pointer"
              title="Önceki optimizasyon geçmişinizi görüntüleyin"
            >
              <History className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="hidden md:inline">Geçmiş</span>
              {promptHistory.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1C2538] text-[#00E5FF] font-mono">
                  {promptHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. KOMPAKT ÜST BAŞLIK */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-[#141925] pb-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Prompt Studio</span>
            </h1>
            <p className="text-xs text-[#64748B]">
              Promptunu yaz, yapay zekâ ile geliştir ve daha etkili sonuçlar elde et.
            </p>
          </div>
          <div className="text-[11px] text-[#475569] font-mono self-start sm:self-auto">
            {inputPrompt.length > 0 ? `${inputPrompt.length} karakter` : "Hazır"}
          </div>
        </div>
      </div>

      {/* 3. ANA ÇALIŞMA ALANI: YAN YANA İKİ DENGELİ PANEL */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10 flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 items-stretch">
          {/* SOL PANEL: ORİJİNAL PROMPT EDİTÖRÜ */}
          <div className="flex flex-col rounded-xl bg-[#0B0E17] border border-[#161D2C] hover:border-[#222C42] transition p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#141A27] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Orijinal Prompt
                </h2>
              </div>
              {inputPrompt && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-[#64748B] hover:text-[#E2E8F0] transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Temizle
                </button>
              )}
            </div>

            {/* Metin Alanı */}
            <div className="flex-1 flex flex-col min-h-[300px] sm:min-h-[380px]">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="İyileştirmek istediğin promptu buraya yaz veya yapıştır (ör. 'Excel dosyasındaki satışları analiz et', 'LinkedIn için yapay zeka içerik stratejisi yaz')..."
                className="w-full flex-1 bg-transparent text-[#F1F5F9] placeholder-[#475569] text-xs sm:text-sm focus:outline-none resize-none prompt-editor leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Hata Bildirimi */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Optimizasyon Başarısız</p>
                  <p className="text-rose-200/80 text-[11px]">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Aksiyon Butonu */}
            <div className="pt-2 border-t border-[#141A27]">
              <button
                type="button"
                onClick={handleStartOptimization}
                disabled={isLoading || isClarifying || !inputPrompt.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-[#00E5FF] hover:bg-[#33EAFF] active:bg-[#00C4D9] text-[#060913] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading || isClarifying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#060913] border-t-transparent rounded-full animate-spin" />
                    <span>
                      {isClarifying
                        ? "Bağlam Hazırlanıyor..."
                        : "Yapay Zekâ ile Optimize Ediliyor..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#060913]" />
                    <span>Promptu Optimize Et</span>
                    <ArrowRight className="w-4 h-4 text-[#060913]" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SAĞ PANEL: OPTİMİZE EDİLMİŞ PROMPT SONUÇ ALANI */}
          <div className="flex flex-col rounded-xl bg-[#0B0E17] border border-[#161D2C] hover:border-[#222C42] transition p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#141A27] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Optimize Edilmiş Prompt
                </h2>
              </div>
              {result && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                    Hazır
                  </span>
                </div>
              )}
            </div>

            {/* DURUM 1: LOADING */}
            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px] text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#E2E8F0]">
                    Prompt mimarisi oluşturuluyor
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Rol, negatif kısıtlar ve editoryal akış optimize ediliyor...
                  </p>
                </div>
              </div>
            )}

            {/* DURUM 2: SUCCESS */}
            {!isLoading && result && (
              <div className="flex-1 flex flex-col space-y-3 animate-in fade-in duration-200">
                <div className="flex-1 min-h-[300px] sm:min-h-[380px]">
                  <textarea
                    value={editablePrompt}
                    onChange={(e) => setEditablePrompt(e.target.value)}
                    className="w-full h-full min-h-[300px] sm:min-h-[380px] bg-transparent text-[#E2E8F0] text-xs sm:text-sm focus:outline-none resize-none prompt-editor leading-relaxed selection:bg-[#00E5FF]/20"
                    spellCheck={false}
                  />
                </div>

                {/* Alt Aksiyon Çubuğu */}
                <div className="pt-2 border-t border-[#141A27] flex items-center justify-between">
                  <span className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <Edit3 className="w-3 h-3" />
                    <span>Metin üzerinde doğrudan düzenleme yapabilirsiniz</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      copied
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-[#0E1522] hover:bg-[#152033] text-[#00E5FF] border border-[#00E5FF]/40"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#00E5FF]" />
                        <span>Promptu Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* DURUM 3: EMPTY */}
            {!isLoading && !result && (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px] text-center space-y-3 text-[#475569]">
                <div className="w-10 h-10 rounded-xl bg-[#0E131F] border border-[#161D2C] flex items-center justify-center text-[#64748B]">
                  <Sparkles className="w-5 h-5 text-[#64748B]" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <p className="text-xs font-semibold text-[#94A3B8]">
                    Henüz optimize edilmiş prompt yok
                  </p>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    Sol panele ham promptunu girip <strong>Promptu Optimize Et</strong> butonuna bastığında sonuç burada listelenir.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. ETKİLEŞİMLİ BAĞLAM SORULARI MODAL PENCERESİ */}
      {showClarifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#0B0E17] border border-[#1C2538] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#141A27] pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#00E5FF] font-semibold">
                  Akıllı Bağlam Derinleştirme
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Daha Keskin Bir Çıktı İçin Hızlı Tercihler
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClarifyModal(false)}
                className="text-[#64748B] hover:text-white transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Soru Listesi */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {clarifyQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl bg-[#080B12] border border-[#141A27] space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#00E5FF]/15 text-[#00E5FF] text-[10px] font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-semibold text-[#E2E8F0]">
                      {q.question}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [q.id]: opt,
                            }));
                          }}
                          className={`p-2 rounded-lg text-xs text-left transition flex items-start gap-2 cursor-pointer ${
                            isSelected
                              ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/50 font-medium"
                              : "bg-[#0E131F] text-[#94A3B8] hover:text-white hover:bg-[#131A2B] border border-transparent"
                          }`}
                        >
                          <span
                            className={`w-3 h-3 rounded-full border mt-0.5 flex-shrink-0 flex items-center justify-center ${
                              isSelected
                                ? "border-[#00E5FF] bg-[#00E5FF]"
                                : "border-[#475569]"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1 h-1 rounded-full bg-[#060913]" />
                            )}
                          </span>
                          <span className="leading-snug text-[11px]">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Diğer Seçeneği için Özel Giriş */}
                  {selectedAnswers[q.id]?.includes("Diğer") && (
                    <div className="pt-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={customAnswers[q.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomAnswers((prev) => ({ ...prev, [q.id]: val }));
                        }}
                        placeholder="Özel sektör veya alanı yazın (ör. Otomotiv Yedek Parça, Sağlık)..."
                        className="w-full bg-[#0E131F] border border-[#00E5FF]/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#00E5FF]"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-between border-t border-[#141A27] pt-3">
              <button
                type="button"
                onClick={() => executeOptimization({})}
                className="text-xs text-[#64748B] hover:text-white transition px-2 py-1.5"
              >
                Soruları Atla
              </button>

              <button
                type="button"
                onClick={() => executeOptimization(selectedAnswers)}
                className="py-2 px-5 rounded-lg bg-[#00E5FF] hover:bg-[#33EAFF] text-[#060913] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Güçlendir ve Başlat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PROMPT GEÇMİŞİ MODAL PENCERESİ (Çalışan Özellik) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#0B0E17] border border-[#1C2538] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#141A27] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white">
                  Optimizasyon Geçmişi
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {promptHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPromptHistory([]);
                      try {
                        localStorage.removeItem("promptloop_history");
                      } catch {}
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Temizle</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="text-[#64748B] hover:text-white transition p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {promptHistory.length === 0 ? (
                <div className="text-center py-12 text-[#64748B] text-xs">
                  Henüz kaydedilmiş bir prompt geçmişi bulunmuyor.
                </div>
              ) : (
                promptHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#080B12] border border-[#141A27] hover:border-[#1F293D] transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono">
                      <span className="text-[#00E5FF]">{item.taskType}</span>
                      <span>{item.date}</span>
                    </div>
                    <p className="text-xs text-[#CBD5E1] line-clamp-2 leading-relaxed">
                      {item.original}
                    </p>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setInputPrompt(item.original);
                          setEditablePrompt(item.improved);
                          setResult({
                            run_id: item.id,
                            status: "PLAN_READY",
                            quality_state: "STRUCTURALLY_VALID",
                            original_prompt: item.original,
                            improved_prompt: item.improved,
                            task_type: "other",
                            goal: item.original,
                            constraints: [],
                            output_format: "text",
                            improvement_reasons: [],
                            evaluation: { score: 100, method: "HISTORY", breakdown: {} },
                            validation: { status: "RESTORED" },
                            preflight_errors: [],
                          });
                          setShowHistoryModal(false);
                        }}
                        className="text-[11px] font-semibold text-[#00E5FF] hover:underline cursor-pointer"
                      >
                        Editöre Yükle
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-[#141A27] pt-3">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#141A27] hover:bg-[#1E2536] text-xs text-[#94A3B8] hover:text-white transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
