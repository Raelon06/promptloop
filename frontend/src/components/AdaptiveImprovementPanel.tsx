"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  SkipForward,
  RotateCw,
  Star,
  Check,
} from "lucide-react";
import { ClarifyQuestion } from "../lib/types";

interface AdaptiveImprovementPanelProps {
  questions: ClarifyQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onSkipQuestion: (questionId: string) => void;
  onReanalyze: () => void;
  isAnalyzing?: boolean;
}

export function AdaptiveImprovementPanel({
  questions,
  answers,
  onAnswerChange,
  onSkipQuestion,
  onReanalyze,
  isAnalyzing = false,
}: AdaptiveImprovementPanelProps) {
  // Açık olan kartın ID'si (varsayılan olarak ilk cevaplanmamış kart açık)
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    questions.length > 0 ? questions[0].id : null
  );
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const answeredCount = questions.filter(
    (q) => answers[q.id] && answers[q.id] !== "__SKIPPED__"
  ).length;
  const totalQuestions = questions.length;

  const handleSelectOption = (qId: string, option: string) => {
    onAnswerChange(qId, option);
  };

  const handleCustomSubmit = (qId: string) => {
    const val = customInputs[qId]?.trim();
    if (val) {
      onAnswerChange(qId, val);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
            <span>Kritik</span>
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            Orta öncelik
          </span>
        );
      case "high":
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
            Yüksek öncelik
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col rounded-xl bg-[#0B0E17] border border-[#161D2C] p-4 sm:p-5 space-y-4">
      {/* 1. Üst Sekme & Başlık Alanı (Referans: Girdiler, Bağlam vb.) */}
      <div className="flex items-center justify-between border-b border-[#141A27] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Prompt&apos;unu geliştir</span>
              <span className="text-[11px] font-mono text-[#00E5FF] px-1.5 py-0.2 rounded bg-[#00E5FF]/10">
                ({answeredCount}/{totalQuestions})
              </span>
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onReanalyze}
          disabled={isAnalyzing}
          title="Soruları yeniden analiz et"
          className="text-[11px] text-[#64748B] hover:text-[#00E5FF] transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
        >
          <RotateCw className={`w-3 h-3 ${isAnalyzing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Yeniden Analiz Et</span>
        </button>
      </div>

      {/* İlerleme Çubuğu */}
      {totalQuestions > 0 && (
        <div className="w-full bg-[#121724] h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00B4D8] transition-all duration-300 ease-out"
            style={{
              width: `${(answeredCount / totalQuestions) * 100}%`,
            }}
          />
        </div>
      )}

      {/* 2. Soru Kartları Listesi */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 max-h-[580px]">
        {questions.length === 0 ? (
          <div className="text-center py-10 px-4 text-[#64748B] text-xs space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto text-[#2A344A] stroke-1" />
            <p className="font-medium text-[#94A3B8]">
              Promptunuz henüz analiz edilmedi
            </p>
            <p className="text-[11px] leading-relaxed">
              Orijinal prompt alanına bir görev yazdığınızda, yapay zekâ eksik
              noktaları analiz ederek buraya özel geliştirme soruları üretecektir.
            </p>
          </div>
        ) : (
          questions.map((q) => {
            const isAnswered =
              answers[q.id] && answers[q.id] !== "__SKIPPED__";
            const isSkipped = answers[q.id] === "__SKIPPED__";
            const isOpen = activeQuestionId === q.id;

            return (
              <div
                key={q.id}
                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                  isOpen
                    ? "bg-[#0E1320] border-[#00E5FF]/40 shadow-sm"
                    : isAnswered
                    ? "bg-[#0A0D15] border-[#182235] hover:border-[#22304A]"
                    : "bg-[#090C14] border-[#141A27] hover:border-[#1E273A]"
                }`}
              >
                {/* Kart Başlığı / Accordion Tetikleyici */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveQuestionId(isOpen ? null : q.id)
                  }
                  className="w-full p-3 sm:p-3.5 text-left flex items-start justify-between gap-2.5 cursor-pointer"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(q.priority)}
                      {isAnswered && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Cevaplandı</span>
                        </span>
                      )}
                      {isSkipped && (
                        <span className="text-[10px] text-[#64748B] font-mono">
                          (Atlandı)
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug">
                      {q.question}
                    </h4>
                    {q.helper_text && (
                      <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                        {q.helper_text}
                      </p>
                    )}
                  </div>

                  <div className="pt-0.5 text-[#64748B]">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#00E5FF]" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Açık Kart İçeriği: Hazır Seçenekler + Özel Giriş */}
                {isOpen && (
                  <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 pt-1 border-t border-[#141B29] space-y-2.5 animate-in fade-in duration-100">
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((opt) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`p-2 sm:p-2.5 rounded-lg text-xs text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40 font-medium"
                                : "bg-[#070A10] text-[#94A3B8] hover:text-white hover:bg-[#111726] border border-[#141A27]"
                            }`}
                          >
                            <span className="leading-snug text-[11px] sm:text-xs">
                              {opt}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF] flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Serbest Metin Girişi (Kendim yazacağım) */}
                    {q.allow_custom && (
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customInputs[q.id] || ""}
                            onChange={(e) =>
                              setCustomInputs((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCustomSubmit(q.id);
                              }
                            }}
                            placeholder="Veya kendin özel bir cevap yaz..."
                            className="flex-1 bg-[#070A10] border border-[#1A2335] focus:border-[#00E5FF]/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleCustomSubmit(q.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-semibold cursor-pointer"
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Alt Aksiyon: Soruyu Atla / Cevabı Temizle */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#141A27]/60 text-[11px]">
                      {answers[q.id] ? (
                        <button
                          type="button"
                          onClick={() => onAnswerChange(q.id, "")}
                          className="text-rose-400 hover:text-rose-300 transition cursor-pointer"
                        >
                          Cevabı Kaldır
                        </button>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => onSkipQuestion(q.id)}
                        className="text-[#64748B] hover:text-[#CBD5E1] transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <SkipForward className="w-3 h-3" />
                        <span>Soruyu Atla</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
