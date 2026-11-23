"use client";

import React, { useState, useRef } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
}

export function CopyButton({ textToCopy, label = "Promptu Kopyala", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    if (!textToCopy) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for insecure contexts or restricted permissions
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setStatusMessage("Prompt panoya kopyalandı");

      timerRef.current = setTimeout(() => {
        setCopied(false);
        setStatusMessage("");
      }, 2500);
    } catch {
      setCopied(false);
      setStatusMessage("Panoya kopyalama başarısız oldu");
      timerRef.current = setTimeout(() => {
        setStatusMessage("");
      }, 2500);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* 
        MANDATORY Modern Web Guidance:
        1. type="button" to prevent form submission
        2. Sized >= 24x24 px (min-h-[38px], min-w-[38px])
        3. aria-label identifies specific content being copied
        4. Does NOT disable on click to preserve keyboard focus & idempotency
      */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="İyileştirilmiş promptu panoya kopyala"
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 border min-h-[38px] cursor-pointer ${
          copied
            ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
            : "bg-[#111827] hover:bg-[#162032] active:bg-[#0D1322] border-[#1F293D] text-gray-200 hover:text-white hover:border-[#00E5FF]/50"
        } ${className}`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-400 animate-in zoom-in-50" aria-hidden="true" />
            <span>Kopyalandı!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </button>

      {/* 
        MANDATORY Modern Web Guidance:
        role="status" live region outside the button so screen readers reliably announce the outcome
      */}
      <span className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </span>
    </div>
  );
}
