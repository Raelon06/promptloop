import { HealthResponse, ModelsResponse, OptimizeRequest, OptimizeResponse, AnalyzeRequest, AnalyzeResponse } from "./types";

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

export async function optimizePrompt(payload: OptimizeRequest): Promise<OptimizeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/prompts/optimize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || `Optimization request failed (${res.status})`);
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

