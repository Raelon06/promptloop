import { HealthResponse, ModelsResponse, OptimizeRequest, OptimizeResponse, AnalyzeRequest, AnalyzeResponse, ClarifyResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://promptloop-api.onrender.com";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/models`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load models list (${res.status})`);
  }
  return res.json();
}

export async function clarifyPrompt(prompt: string, taskType: string = "auto"): Promise<ClarifyResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/prompts/clarify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, task_type: taskType }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || `Clarification failed (${res.status})`);
  }
  return res.json();
}

export async function optimizePrompt(payload: OptimizeRequest): Promise<OptimizeResponse> {
  // Render'daki mevcut ve yeni backend sürümleriyle %100 uyumluluk için
  // Eğer context_answers boş ise payload'a hiç eklemiyoruz (extra="forbid" hatasını önler)
  const cleanPayload: Record<string, unknown> = {
    prompt: payload.prompt,
    provider: payload.provider || "openrouter",
    model_id: payload.model_id || "openrouter/free",
    preserve_language: payload.preserve_language ?? true,
  };

  if (payload.context_answers && Object.keys(payload.context_answers).length > 0) {
    cleanPayload.context_answers = payload.context_answers;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/prompts/optimize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cleanPayload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const detailMsg = typeof errorBody?.detail === "string" 
      ? errorBody.detail 
      : (Array.isArray(errorBody?.detail) ? errorBody.detail.map((e: { msg?: string }) => e.msg).join(", ") : null);
    throw new Error(detailMsg || `Optimization request failed (${res.status})`);
  }
  return res.json();
}

export async function analyzePrompt(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/prompts/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || `Analysis request failed (${res.status})`);
  }
  return res.json();
}

