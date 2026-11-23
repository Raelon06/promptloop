"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Edit3,
  FileText,
  Copy,
  Zap,
  ShoppingBag,
  TrendingUp,
  PackageCheck,
  Tag,
  Warehouse,
} from "lucide-react";
import { CopyButton } from "./CopyButton";
import { optimizePrompt, fetchModels, clarifyPrompt } from "../lib/api";
import { OptimizeResponse, ModelCapability, TaskType, ClarifyQuestion, OptimizeRequest } from "../lib/types";

interface SampleCategory {
  category: string;
  items: {
    title: string;
    description: string;
    prompt: string;
  }[];
}

const SAMPLE_PROMPT_CATEGORIES: SampleCategory[] = [
  {
    category: "FMCG (Hızlı Tüketim Ürünleri)",
    items: [
      {
        title: "Bayi & Sipariş Ayrıştırma",
        description: "Ham sipariş metninden bayi kodu, SKU, koli ve adet ayrıştırma",
        prompt: "Aşağıdaki distribütör WhatsApp/e-posta sipariş metninden bayi kodunu, sipariş edilen ürün SKU kodunu, ürün adını, koli ve adet miktarını JSON formatında ayıkla. Belirtilmemiş alanlar için kesinlikle tahmin yapma, null bırak.",
      },
      {
        title: "Tanzim Teşhir & Raf Uyumu",
        description: "Saha denetim raporlarından bulunurluk ve planogram ihlali tespiti",
        prompt: "Ulusal zincir marketlerden gelen saha satış temsilcisi denetim notlarını analiz et. Raf bulunurluğu (OSA), rakip aktivite ihlalleri ve planogram dışı uygulamaları maddeler halinde çıkar ve bölge müdürü için acil aksiyon listesi hazırla.",
      },
      {
        title: "SKT & Stok Risk Analizi",
        description: "Depo stok verilerinden son kullanma tarihi yaklaşan partileri raporlama",
        prompt: "Aşağıdaki merkezi depo stok listesinden son kullanma tarihine (SKT) 90 günden az kalmış kritik SKU'ları tespit et. En yüksek finansal kayıp riski taşıyan ilk 5 ürünü listele ve acil çapraz promosyon/indirim kampanyası önerisi oluştur.",
      },
      {
        title: "Ticari Pazarlama & Kampanya",
        description: "B2B kanal (Geleneksel vs Modern) için promosyon mekaniği tasarımı",
        prompt: "Gazlı içecek ve atıştırmalık kategorisinde geleneksel kanal (bakkal/tekel) ve modern kanal (yerel zincir marketler) için 1 aylık B2B satış artırıcı promosyon kurgusu tasarla. Bütçe verimliliği, ciro hedefi ve iade risklerini dikkate alan net bir tablo hazırla.",
      },
      {
        title: "Zincir Market İtiraz & Ceza",
        description: "Eksik sevkiyat veya lojistik gecikme cezalarına kurumsal yanıt taslağı",
        prompt: "Bir süpermarket zincirinin depomuza kestiği 'eksik ve gecikmeli palet teslimatı cezası' faturasına karşılık, mücbir lojistik gerekçeler ve teslimat irsaliyelerimizi dayanak gösteren resmi, hukuki nezakete uygun ve yapıcı bir itiraz mektubu taslağı yaz.",
      },
    ],
  },
  {
    category: "Yazılım, Veri & Analiz",
    items: [
      {
        title: "Python Veri & API Betiği",
        description: "Döviz ve kripto API entegrasyonu ve gösterge hesabı",
        prompt: "Bir kripto para API'sinden günlük Bitcoin fiyatlarını çeken, 14 günlük RSI hesaplayan ve aşırı alım/satım durumlarını tespit edip e-posta ile bildiren modüler bir Python betiği yaz.",
      },
      {
        title: "Müşteri Destek & Şikayet Sınıflandırma",
        description: "Gelen çağrı/bilet metinlerini duygu ve aciliyet derecesine göre gruplama",
        prompt: "Bana gelen müşteri şikayetlerini ve taleplerini özetle, en sık tekrar eden problemleri çıkar, duygu tonunu (negatif/nötr/pozitif) puanla ve her biri için acil aksiyon maddeleri listele.",
      },
      {
        title: "Yönetici Strateji Özeti",
        description: "Teknik mimarilerin maliyet ve gizlilik karşılaştırması",
        prompt: "Kurum içi GPU kümesi ile bulut yapay zeka API'lerinin maliyet, KVKK/GDPR veri gizliliği ve yanıt süresi (latency) açısından karşılaştırmalı yönetici özetini hazırla.",
      },
    ],
  },
];

export function PromptOptimizer() {
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("openrouter/free");
  const [selectedProvider, setSelectedProvider] = useState<"ollama" | "mock" | "openrouter">("openrouter");
  const [models, setModels] = useState<ModelCapability[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [editablePrompt, setEditablePrompt] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRubricDetails, setShowRubricDetails] = useState<boolean>(false);
  const [showSampleDropdown, setShowSampleDropdown] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("FMCG (Hızlı Tüketim Ürünleri)");

  // Etkileşimli Bağlam Soruları State'leri
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [showClarifyModal, setShowClarifyModal] = useState<boolean>(false);

  useEffect(() => {
    async function loadModels() {
      try {
        const data = await fetchModels();
        setModels(data.models);
        if (data.default_model) {
          setSelectedModel(data.default_model);
          const defaultProvider = data.models.find((m) => m.id === data.default_model)?.provider;
          if (defaultProvider === "mock") setSelectedProvider("mock");
          else if (defaultProvider === "openrouter") setSelectedProvider("openrouter");
          else setSelectedProvider("ollama");
        }
      } catch {
        setModels([
          {
            id: "qwen3:4b",
            name: "Qwen 3 (4B)",
            provider: "ollama",
            context_length: 262144,
            capabilities: ["prompt_optimization", "thinking"],
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
      setErrorMessage("Lütfen en az 5 karakterden oluşan bir prompt yazın.");
      return;
    }

    setErrorMessage(null);
    setIsClarifying(true);

    try {
      // 1. Önce soruları getir
      const clarifyData = await clarifyPrompt(inputPrompt);
      if (clarifyData && clarifyData.questions && clarifyData.questions.length > 0) {
        setClarifyQuestions(clarifyData.questions);
        // Varsayılan olarak ilk şıkkı seç
        const initialAnswers: Record<string, string> = {};
        clarifyData.questions.forEach((q: ClarifyQuestion) => {
          if (q.options && q.options.length > 0) {
            initialAnswers[q.id] = q.options[0];
          }
        });
        setSelectedAnswers(initialAnswers);
        setShowClarifyModal(true);
        setIsClarifying(false);
        return;
      }
    } catch (e) {
      // Render henüz güncellenmediyse veya endpoint yoksa hata fırlatma, doğrudan optimizasyona geç
      console.warn("Clarification endpoint unavailable, bypassing to direct optimization:", e);
    }
    setIsClarifying(false);
    executeOptimization({});
  };

  const executeOptimization = async (answersToUse: Record<string, string>) => {
    setIsLoading(true);
    setErrorMessage(null);
    setShowClarifyModal(false);

    try {
      const payload: OptimizeRequest = {
        prompt: inputPrompt,
        provider: selectedProvider,
        model_id: selectedModel,
        preserve_language: true,
      };
      // Yalnızca cevap varsa ekle
      if (answersToUse && Object.keys(answersToUse).length > 0) {
        payload.context_answers = answersToUse;
      }

      const data = await optimizePrompt(payload);

      setResult(data);
      setEditablePrompt(data.improved_prompt);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Prompt optimizasyonu sırasında bir hata oluştu";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSample = (sample: string) => {
    setInputPrompt(sample);
    setErrorMessage(null);
  };

  const handleClear = () => {
    setInputPrompt("");
    setResult(null);
    setEditablePrompt("");
    setErrorMessage(null);
  };

  const formatTaskType = (task: TaskType): string => {
    const labels: Record<TaskType, string> = {
      data_extraction: "Veri Çıkarma",
      analysis: "Analitik Değerlendirme",
      creative: "Yaratıcı & Üretken",
      code: "Kod & Teknik Görev",
      other: "Genel Amaçlı Görev",
    };
    return labels[task] || task;
  };

  const formatQualityState = (state: string): string => {
    const labels: Record<string, string> = {
      STRUCTURALLY_VALID: "YAPISAL OLARAK GEÇERLİ",
      REVIEW_REQUIRED: "İNCELEME GEREKLİ",
      DRAFT: "TASLAK",
      BENCHMARK_VERIFIED: "BENCHMARK DOĞRULANDI",
      BLOCKED: "GÜVENLİK ENGELİ",
    };
    return labels[state] || state;
  };

  const formatRubricName = (key: string): string => {
    const names: Record<string, string> = {
      task: "GÖREV TANIMI",
      context: "BAĞLAM & HEDEF",
      constraints: "NEGATİF KISITLAR",
      format: "ÇIKTI FORMATI",
      reasoning: "GEREKÇE & AKIL",
      few_shot: "ÖRNEK DEMOLAR",
      consistency: "İÇ TUTARLILIK",
    };
    return names[key] || key.toUpperCase();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Başlık Bölümü */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-semibold tracking-wider uppercase">
          <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span>PromptLoop Engine V3.4.2</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          Yapay Zeka Prompt Optimizasyonu
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Ham promptunuzu yazın. Yapay zeka sistem eksikliklerini ve zafiyetlerini tespit etsin; negatif kısıtlar, açık rol tanımları ve deterministik format ekleyerek profesyonel seviyeye yükseltsin.
        </p>
      </div>

      {/* Kontrol Şeridi & Örnek Promptlar */}
      <div className="rounded-2xl bg-[#0D1322] border border-[#1E293B] shadow-xl overflow-hidden transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          {/* Hızlı Doldur Açılır/Kapanır Tetikleyici Butonu */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSampleDropdown(!showSampleDropdown)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#162032] to-[#1E293B] hover:from-[#1E293B] hover:to-[#27354F] text-white text-xs font-bold transition border border-[#00E5FF]/30 hover:border-[#00E5FF] shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#00E5FF]" />
              <span>Hızlı Şablon Kütüphanesi</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#00E5FF]/20 text-[#00E5FF] font-mono">FMCG +</span>
              {showSampleDropdown ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <span className="text-xs text-gray-400 hidden sm:inline">
              FMCG, satış ve veri analizi hazır senaryoları
            </span>
          </div>

          {/* Model Seçimi */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
              <Cpu className="w-4 h-4 text-[#00E5FF]" />
              <span>Model:</span>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedModel(val);
                const matchedModel = models.find((m) => m.id === val);
                if (matchedModel) {
                  if (matchedModel.provider === "mock") setSelectedProvider("mock");
                  else if (matchedModel.provider === "openrouter") setSelectedProvider("openrouter");
                  else setSelectedProvider("ollama");
                } else {
                  setSelectedProvider(val === "mock" ? "mock" : "ollama");
                }
              }}
              className="bg-[#162032] border border-[#1F293D] text-gray-200 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00E5FF] focus:border-[#00E5FF] cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Açılır / Kapanır Şablon Paneli */}
        {showSampleDropdown && (
          <div className="border-t border-[#1E293B] bg-[#0A0E1A]/80 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Kategori Sekmeleri */}
            <div className="flex flex-wrap gap-2 border-b border-[#1E293B] pb-3">
              {SAMPLE_PROMPT_CATEGORIES.map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setActiveCategory(cat.category)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeCategory === cat.category
                      ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/50 shadow-sm"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#162032] border border-transparent"
                  }`}
                >
                  {cat.category.includes("FMCG") ? (
                    <ShoppingBag className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5" />
                  )}
                  <span>{cat.category}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#162032] font-mono">
                    {cat.items.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Seçili Kategorinin Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SAMPLE_PROMPT_CATEGORIES.find((c) => c.category === activeCategory)?.items.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    handleUseSample(item.prompt);
                    setShowSampleDropdown(false);
                  }}
                  className="p-3.5 rounded-xl bg-[#0D1322] hover:bg-[#141D30] border border-[#1E293B] hover:border-[#00E5FF]/50 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-2 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#00E5FF] transition flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-[#00E5FF]" />
                        {item.title}
                      </h4>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#00E5FF] transition group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#1E293B]/60 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>Tıkla ve Doldur</span>
                    <span className="text-[#00E5FF]/70">Hazır Senaryo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ana Çift Çalışma Alanı: Orijinal vs İyileştirilmiş */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Sol Kolon: Orijinal Prompt Alanı */}
        <div className="rounded-2xl p-6 bg-[#0D1322] border border-[#1E293B] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-sm shadow-[#00E5FF]/50" />
              <h2 className="text-sm font-bold text-white tracking-wider uppercase">
                1. Orijinal Prompt
              </h2>
            </div>
            {inputPrompt && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-white transition inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Temizle
              </button>
            )}
          </div>

          <div className="relative">
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="İyileştirmek istediğiniz promptu buraya yazın (örn. 'Müşteri siparişlerini ve bayi kodlarını ayıkla' veya 'Hisse senedi verilerini analiz eden Python kodu yaz')..."
              rows={12}
              className="w-full bg-[#080D1A] border border-[#1E293B] rounded-xl p-4 text-[#F8FAFC] placeholder-gray-500 text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/50 resize-y leading-relaxed font-mono selection:bg-[#00E5FF]/30"
              style={{ minHeight: "280px" }}
            />
            <div className="flex items-center justify-between pt-2 text-xs text-gray-400 font-mono">
              <span>{inputPrompt.length} karakter</span>
              <span>En az 5 karakter</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Hata Bildirimi</p>
                <p className="text-amber-200/90">{errorMessage}</p>
                {selectedProvider === "ollama" && (
                  <p className="text-gray-400 mt-1">
                    İpucu: Yerel Ollama servisine bağlanılamıyorsa üst menüden <strong>Deterministik Test Modeli (Mock)</strong> seçeneğini kullanabilirsiniz.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartOptimization}
            disabled={isLoading || isClarifying || !inputPrompt.trim()}
            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#14B8A6] hover:from-[#33EAFF] hover:to-[#2DD4BF] text-[#060913] font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cyan-button-glow cursor-pointer"
          >
            {isLoading || isClarifying ? (
              <>
                <div className="w-4 h-4 border-2 border-[#060913] border-t-transparent rounded-full animate-spin" />
                <span>
                  {isClarifying
                    ? "Görev Türü Tespit Ediliyor & Bağlam Soruları Hazırlanıyor..."
                    : "Analiz Ediliyor ve Güçlendiriliyor..."}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Promptu Optimize Et</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Sağ Kolon: İyileştirilmiş Prompt Alanı */}
        <div className="rounded-2xl p-6 bg-[#0D1322] border border-[#1E293B] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] shadow-sm shadow-[#14B8A6]/50" />
              <h2 className="text-sm font-bold text-white tracking-wider uppercase">
                2. İyileştirilmiş Prompt
              </h2>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#14B8A6]/20 text-[#2DD4BF] border border-[#14B8A6]/40 font-semibold">
                  {formatTaskType(result.task_type)}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-bold font-mono">
                  Skor: {result.evaluation?.score ?? 80}/100
                </span>
              </div>
            )}
          </div>

          {result ? (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <div className="relative">
                <textarea
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  rows={12}
                  className="w-full bg-[#080D1A] border border-[#14B8A6]/40 rounded-xl p-4 text-[#E2E8F0] text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/50 resize-y leading-relaxed font-mono selection:bg-[#00E5FF]/30"
                  style={{ minHeight: "280px" }}
                />
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                    <span>Metin üzerinde doğrudan düzenleme yapabilirsiniz</span>
                  </div>
                  <CopyButton textToCopy={editablePrompt} label="Promptu Kopyala" />
                </div>
              </div>

              {/* Kalite ve Durum Bildirimi */}
              <div className="p-3.5 rounded-xl bg-[#080D1A] border border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-400 font-medium">Kalite Durumu:</span>
                  <span className="font-bold text-emerald-300">
                    {formatQualityState(result.quality_state)}
                  </span>
                </div>
                <div className="text-gray-400">
                  Değerlendirme: <span className="text-gray-300 font-mono font-medium">Şeffaf Heuristik Analiz (V3.4.2)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#1E293B] rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[340px] text-gray-400 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#162032] flex items-center justify-center text-[#00E5FF]/60 border border-[#1F293D]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-200">Henüz optimize edilmiş bir prompt yok</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Soldaki alana ham promptunuzu girin ve <strong>Promptu Optimize Et</strong> butonuna basın. Model otomatik olarak rol tanımı, negatif kısıtlar ve net çıktı formatı ekleyecektir.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Etkileşimli Bağlam Soruları Modal Penceresi (PromptCowboy Yaklaşımı) */}
      {showClarifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0D1322] border border-[#00E5FF]/40 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Başlığı */}
            <div className="flex items-start justify-between border-b border-[#1E293B] pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#00E5FF]/15 text-[#00E5FF] text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-[#00E5FF]" />
                  <span>Akıllı Prompt Derinleştirme</span>
                </div>
                <h3 className="text-lg font-black text-white">
                  Daha Kusursuz Bir Prompt İçin 2-3 Hızlı Tercih
                </h3>
                <p className="text-xs text-gray-400">
                  Aşağıdaki tercihler yapay zekanın tam olarak hedeflediğiniz formatta ve uzmanlıkta çıktı üretmesini sağlar.
                </p>
              </div>
            </div>

            {/* Sorular Listesi */}
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {clarifyQuestions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-[#080D1A] border border-[#1E293B] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] text-xs font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-gray-200">{q.question}</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }));
                          }}
                          className={`p-2.5 rounded-lg text-xs text-left transition flex items-start gap-2 cursor-pointer ${
                            isSelected
                              ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/60 font-semibold shadow-sm"
                              : "bg-[#101728] text-gray-400 hover:text-gray-200 hover:bg-[#162035] border border-[#1E293B]"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex-shrink-0 flex items-center justify-center ${
                            isSelected ? "border-[#00E5FF] bg-[#00E5FF]" : "border-gray-600"
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#060913]" />}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-between border-t border-[#1E293B] pt-4">
              <button
                type="button"
                onClick={() => executeOptimization({})}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#162032] transition cursor-pointer"
              >
                Soruları Atla & Doğrudan Optimize Et
              </button>

              <button
                type="button"
                onClick={() => executeOptimization(selectedAnswers)}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#14B8A6] hover:from-[#33EAFF] hover:to-[#2DD4BF] text-[#060913] font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-[#00E5FF]/20"
              >
                <span>Tercihlerle Güçlendir ve Başlat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yapay Zeka İyileştirme Analizi & Rubrik Detayları */}
      {result && (
        <div className="rounded-2xl p-6 bg-[#0D1322] border border-[#1E293B] shadow-xl space-y-6 animate-in fade-in-50">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#00E5FF]" />
                Yapay Zeka İyileştirme Analizi ve Raporu
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                PromptLoop Motoru tarafından uygulanan mimari güçlendirmeler ve gerekçeleri
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRubricDetails(!showRubricDetails)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#162032] hover:bg-[#1E293B] text-gray-200 hover:text-white border border-[#1F293D] transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>{showRubricDetails ? "7 Kriterli Rubriği Gizle" : "7 Kriterli Rubriği İncele"}</span>
              {showRubricDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Neden Daha İyi? */}
            <div className="space-y-3 md:col-span-2">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                Neden bu prompt daha iyi?
              </h4>
              <ul className="space-y-2">
                {result.improvement_reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-gray-200 bg-[#080D1A] p-3 rounded-xl border border-[#1E293B]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#14B8A6] flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Eklenen Negatif Kısıtlar */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Eklenen Negatif Kısıtlar:
              </h4>
              <div className="space-y-2">
                {result.constraints.map((constraint, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-amber-200/90 bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/20 flex items-start gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{constraint}</span>
                  </div>
                ))}
                <div className="p-3 rounded-xl bg-[#080D1A] border border-[#1E293B] text-xs text-gray-300 flex items-center justify-between font-mono">
                  <span>Hedef Format:</span>
                  <span className="text-[#00E5FF] uppercase font-bold px-2 py-0.5 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/30">
                    {result.output_format}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7 Kriterli Rubrik Detayı */}
          {showRubricDetails && result.evaluation?.breakdown && (
            <div className="pt-4 border-t border-[#1E293B] space-y-4 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#00E5FF]" />
                  7 Boyutlu Heuristik Kalite Rubriği Dağılımı
                </h4>
                <span className="text-xs text-amber-400 font-medium">
                  *Şeffaf kural tabanlı analiz skoru. Doğrulanmış model başarısı değildir.
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(result.evaluation.breakdown).map(([key, val]) => (
                  <div key={key} className="bg-[#080D1A] p-3.5 rounded-xl border border-[#1E293B] text-center space-y-1.5 shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-bold">
                      {formatRubricName(key)}
                    </span>
                    <span className="text-lg font-black text-[#00E5FF] block font-mono">
                      {val.score_0_10 !== null ? `${val.score_0_10}/10` : "Yok"}
                    </span>
                    <span className="text-[10px] text-gray-500 block font-mono">Ağırlık: %{val.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
