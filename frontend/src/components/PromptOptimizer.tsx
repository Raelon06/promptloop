"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  X,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { optimizePrompt, fetchModels, clarifyPrompt } from "../lib/api";
import {
  OptimizeResponse,
  ModelCapability,
  ClarifyQuestion,
  OptimizeRequest,
} from "../lib/types";
import { AdaptiveImprovementPanel } from "./AdaptiveImprovementPanel";

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
  const [isTweaking, setIsTweaking] = useState<boolean>(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [editablePrompt, setEditablePrompt] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // 🎯 ADAPTIVE PROMPT IMPROVEMENT PANEL STATE'LERİ
  // Kural: SADECE ilk optimizasyon başarılı olduktan sonra açılır!
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<ClarifyQuestion[]>([]);
  const [adaptiveAnswers, setAdaptiveAnswers] = useState<Record<string, string>>({});
  const [isAnalyzingQuestions, setIsAnalyzingQuestions] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"questions" | "studio">("studio");

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
    } catch {}
  }, []);

  // Modelleri çek
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

  // Optimize edildikten sonra dinamik soruları arka planda çek
  const fetchClarificationQuestions = async (promptText: string) => {
    setIsAnalyzingQuestions(true);
    try {
      const clarifyData = await clarifyPrompt(promptText.trim(), "auto");
      if (clarifyData?.questions && clarifyData.questions.length > 0) {
        setAdaptiveQuestions(clarifyData.questions);
      }
    } catch {
      // Hata durumunda güvenli ve kaliteli fallback soruları
      setAdaptiveQuestions([
        {
          id: "writing_style",
          question: "Yazı stiline veya uzmanlık rolüne uyum sağla",
          priority: "critical",
          helper_text: "Modelin üstlenmesini istediğin uzmanlık tonu veya yazı dili nedir?",
          options: ["Kıdemli ve profesyonel lider tonu", "Samimi ve doğrudan anlatım", "Analitik ve akademik derinlik"],
          allow_custom: true,
          category: "role",
        },
        {
          id: "target_audience",
          question: "Bu çıktıyı kim okuyacak veya değerlendirecek?",
          priority: "high",
          helper_text: "Hedef kitleyi bilmek çıktının terminolojisini ve derinliğini doğrudan şekillendirir.",
          options: ["C-Level & Üst Düzey Yönetim", "Saha & Operasyon Ekibi", "Genel Müşteri & Son Kullanıcı"],
          allow_custom: true,
          category: "context",
        },
        {
          id: "output_format",
          question: "Çıktı formatı ve şablonu nasıl olsun?",
          priority: "medium",
          helper_text: "Çıktının sunum ve aktarım biçimini belirler.",
          options: ["Yapılandırılmış Markdown Tablosu", "Yönetici Özeti + Aksiyon Maddeleri", "Yalın Metin"],
          allow_custom: true,
          category: "format",
        },
      ]);
    } finally {
      setIsAnalyzingQuestions(false);
    }
  };

  // Optimizasyon Motoru
  const handleOptimize = async (overrideAnswers?: Record<string, string>) => {
    if (!inputPrompt.trim() || inputPrompt.trim().length < 5) {
      setErrorMessage("Lütfen optimize etmek için en az 5 karakterden oluşan bir prompt yazın.");
      return;
    }

    const isReTweak = Boolean(result);
    if (isReTweak) {
      setIsTweaking(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const answersToUse = overrideAnswers || adaptiveAnswers;
      
      // Cevapları prompt bağlamına formatla
      const validAnswers = Object.entries(answersToUse).filter(
        ([, v]) => v && v !== "__SKIPPED__"
      );

      let promptToSend = inputPrompt.trim();

      if (validAnswers.length > 0) {
        const contextLines = validAnswers
          .map(([qId, ans]) => {
            const questionObj = adaptiveQuestions.find((q) => q.id === qId);
            const label = questionObj?.question || qId;
            return `• ${label}: ${ans}`;
          })
          .join("\n");

        promptToSend = `${inputPrompt.trim()}\n\n[KULLANICI TERCİHLERİ VE OPERASYONEL BAĞLAM]:\n${contextLines}`;
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

      // İlk defa optimize edildiyse, hemen ardından soruları analiz et ve sol paneli aç
      if (!isReTweak && adaptiveQuestions.length === 0) {
        fetchClarificationQuestions(inputPrompt.trim());
      }

      // Geçmişe kaydet
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
      setIsTweaking(false);
    }
  };

  // Soru cevaplandığında canlı olarak sağdaki Harika Prompt'u güncelle
  const handleAnswerChange = (questionId: string, answer: string) => {
    const updatedAnswers = { ...adaptiveAnswers };
    if (!answer) {
      delete updatedAnswers[questionId];
    } else {
      updatedAnswers[questionId] = answer;
    }
    setAdaptiveAnswers(updatedAnswers);

    // Prompt optimize edilmişse anında geliştirilmiş sonucu üret
    handleOptimize(updatedAnswers);
  };

  const handleSkipQuestion = (questionId: string) => {
    const updatedAnswers = {
      ...adaptiveAnswers,
      [questionId]: "__SKIPPED__",
    };
    setAdaptiveAnswers(updatedAnswers);
  };

  const handleCopy = async () => {
    if (!editablePrompt) return;
    try {
      await navigator.clipboard.writeText(editablePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
    setAdaptiveAnswers({});
    setAdaptiveQuestions([]);
  };

  const activeModelObj = models.find((m) => m.id === selectedModel);
  const isModelOnline =
    activeModelObj?.status === "ready" ||
    selectedProvider === "openrouter" ||
    selectedProvider === "mock";

  // Prompt optimize edildikten sonra sol panel görünür olur
  const hasOptimizedResult = Boolean(result);

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#07090E] text-[#EDEDED]">
      {/* 1. ÜST BAR: Minimal Marka, Model Seçici & Durum, Geçmiş */}
      <header className="w-full border-b border-[#141925] bg-[#0A0D14]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Sol: Minimal Marka */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#0099FF] flex items-center justify-center shadow-sm shadow-[#00E5FF]/20">
              <Sparkles className="w-4 h-4 text-[#07090E]" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              Prompt<span className="text-[#00E5FF]">Loop</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161D2B] text-[#94A3B8] border border-[#212A3D] hidden sm:inline-block">
              Studio
            </span>
          </div>

          {/* Sağ: Model Seçici & Geçmiş */}
          <div className="flex items-center gap-3">
            {/* Model Seçici */}
            <div className="relative flex items-center bg-[#0B0E17] border border-[#1C2538] hover:border-[#2A3752] rounded-lg px-2.5 py-1.5 text-xs transition">
              <span
                className={`w-2 h-2 rounded-full mr-2 transition-colors ${
                  isModelOnline ? "bg-emerald-400" : "bg-rose-500 animate-pulse"
                }`}
                title={isModelOnline ? "Model Aktif ve Hazır" : "Bağlantı Bekleniyor"}
              />
              <Cpu className="w-3.5 h-3.5 text-[#00E5FF] mr-1.5 opacity-80" />
              <select
                value={selectedModel}
                onChange={(e) => {
                  const modelId = e.target.value;
                  setSelectedModel(modelId);
                  const found = models.find((m) => m.id === modelId);
                  if (found) {
                    if (found.provider === "mock") setSelectedProvider("mock");
                    else if (found.provider === "openrouter")
                      setSelectedProvider("openrouter");
                    else setSelectedProvider("ollama");
                  }
                }}
                className="bg-transparent text-xs text-[#E2E8F0] focus:outline-none cursor-pointer pr-4 font-medium appearance-none"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#0B0E17] text-white">
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#64748B] pointer-events-none absolute right-2" />
            </div>

            {/* Geçmiş Butonu */}
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 bg-[#0B0E17] hover:bg-[#121826] border border-[#1C2538] hover:border-[#2A3752] text-[#94A3B8] hover:text-white rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="hidden sm:inline">Geçmiş</span>
              {promptHistory.length > 0 && (
                <span className="text-[10px] font-mono px-1 rounded bg-[#00E5FF]/20 text-[#00E5FF]">
                  {promptHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MOBİL GEÇİŞ BUTONU (Sadece Sonuç Varsa Görünür) */}
      {hasOptimizedResult && (
        <div className="lg:hidden max-w-7xl mx-auto px-4 pt-3 w-full">
          <div className="grid grid-cols-2 p-1 bg-[#0A0D15] border border-[#141A27] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMobileTab("studio")}
              className={`py-1.5 rounded-lg transition ${
                mobileTab === "studio"
                  ? "bg-[#00E5FF] text-[#060913]"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Prompt Stüdyo
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("questions")}
              className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                mobileTab === "questions"
                  ? "bg-[#00E5FF] text-[#060913]"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <span>Prompt&apos;unu Geliştir</span>
              {adaptiveQuestions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
                  {adaptiveQuestions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. ANA ÇALIŞMA ALANI */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col">
        <div
          className={`grid gap-5 flex-1 items-start transition-all duration-300 ${
            hasOptimizedResult
              ? "grid-cols-1 lg:grid-cols-12"
              : "grid-cols-1 lg:grid-cols-2"
          }`}
        >
          {/* 🎯 SOL PANEL: PROMPT'UNU GELİŞTİR (YALNIZCA OPTİMİZE SONUÇ GELDİKTEN SONRA AÇILIR) */}
          {hasOptimizedResult && (
            <div
              className={`lg:col-span-4 xl:col-span-4 flex flex-col space-y-4 animate-in fade-in slide-in-from-left-4 duration-300 ${
                mobileTab === "questions" ? "block" : "hidden lg:flex"
              }`}
            >
              <AdaptiveImprovementPanel
                questions={adaptiveQuestions}
                answers={adaptiveAnswers}
                onAnswerChange={handleAnswerChange}
                onSkipQuestion={handleSkipQuestion}
                onReanalyze={() => fetchClarificationQuestions(inputPrompt)}
                isAnalyzing={isAnalyzingQuestions}
              />
            </div>
          )}

          {/* SAĞ ALAN: TEMBEL PROMPT & HARİKA PROMPT */}
          <div
            className={`flex flex-col space-y-4 ${
              hasOptimizedResult
                ? "lg:col-span-8 xl:col-span-8"
                : "lg:col-span-2"
            } ${mobileTab === "studio" ? "block" : "hidden lg:flex"}`}
          >
            <div
              className={`grid gap-4 flex-1 items-stretch ${
                hasOptimizedResult
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {/* SOL İÇ PANEL: TEMBEL PROMPT */}
              <div className="flex flex-col rounded-xl bg-[#0B0E17] border border-[#161D2C] hover:border-[#222C42] transition p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#141A27] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      Tembel Prompt
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
                <div className="flex-1 flex flex-col min-h-[260px] sm:min-h-[360px]">
                  <textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder="Ham promptunu buraya yaz (ör. 'linkedin gönderisi planlamak istiyorum excel ile ilgili', 'python ile veri çek')..."
                    className="w-full flex-1 bg-transparent text-[#F1F5F9] placeholder-[#475569] text-xs sm:text-sm focus:outline-none resize-none prompt-editor leading-relaxed"
                    spellCheck={false}
                  />
                </div>

                {/* Hata Bildirimi */}
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">Hata Oluştu</p>
                      <p className="text-rose-200/80 text-[11px]">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Aksiyon Butonu */}
                <div className="pt-2 border-t border-[#141A27]">
                  <button
                    type="button"
                    onClick={() => handleOptimize()}
                    disabled={isLoading || isTweaking || !inputPrompt.trim()}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#00E5FF] hover:bg-[#33EAFF] active:bg-[#00C4D9] text-[#060913] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#00E5FF]/10"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#060913] border-t-transparent rounded-full animate-spin" />
                        <span>Optimize Ediliyor...</span>
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

              {/* SAĞ İÇ PANEL: HARİKA PROMPT */}
              <div className="flex flex-col rounded-xl bg-[#0B0E17] border border-[#161D2C] hover:border-[#222C42] transition p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#141A27] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      Harika Prompt
                    </h2>
                  </div>
                  {result && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                        ✓ Otomatik güncellendi
                      </span>
                    </div>
                  )}
                </div>

                {/* LOADING DURUMU */}
                {isLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[360px] text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#E2E8F0]">
                        Prompt mimarisi oluşturuluyor
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Rol, bağlam ve güvenlik bariyerleri optimize ediliyor...
                      </p>
                    </div>
                  </div>
                )}

                {/* SUCCESS DURUMU */}
                {!isLoading && result && (
                  <div className="flex-1 flex flex-col space-y-3 animate-in fade-in duration-200">
                    <div
                      className={`flex-1 relative min-h-[260px] sm:min-h-[360px] transition-opacity ${
                        isTweaking ? "opacity-40 pointer-events-none" : "opacity-100"
                      }`}
                    >
                      {isTweaking && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#07090E]/60 backdrop-blur-xs rounded-xl">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E131F] border border-[#00E5FF]/40 text-[#00E5FF] text-xs font-medium shadow-lg">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Cevabınızla geliştiriliyor...</span>
                          </div>
                        </div>
                      )}
                      <textarea
                        value={editablePrompt}
                        onChange={(e) => setEditablePrompt(e.target.value)}
                        className="w-full h-full min-h-[260px] sm:min-h-[360px] bg-transparent text-[#E2E8F0] text-xs sm:text-sm focus:outline-none resize-none prompt-editor leading-relaxed selection:bg-[#00E5FF]/20"
                        spellCheck={false}
                      />
                    </div>

                    {/* Alt Aksiyon Çubuğu */}
                    <div className="pt-2 border-t border-[#141A27] flex items-center justify-between">
                      <span className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                        <Edit3 className="w-3 h-3" />
                        <span>Sol paneldeki soruları yanıtlayarak promptu daha da keskinleştirebilirsiniz</span>
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
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* EMPTY DURUMU */}
                {!isLoading && !result && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[360px] text-center space-y-3 text-[#475569]">
                    <div className="w-10 h-10 rounded-xl bg-[#0E131F] border border-[#161D2C] flex items-center justify-center text-[#64748B]">
                      <Sparkles className="w-5 h-5 text-[#64748B]" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <p className="text-xs font-semibold text-[#94A3B8]">
                        Henüz optimize edilmiş prompt yok
                      </p>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">
                        Sol alana bir prompt girin ve <strong>Promptu Optimize Et</strong> butonuna tıklayın. Sonuç geldiğinde sol panelde promptunuzu geliştirecek özel sorular açılacaktır.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. PROMPT GEÇMİŞİ MODAL PENCERESİ */}
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
