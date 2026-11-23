export type TaskType = "data_extraction" | "analysis" | "creative" | "code" | "other";

export type QualityState = "DRAFT" | "STRUCTURALLY_VALID" | "REVIEW_REQUIRED" | "BENCHMARK_VERIFIED";

export interface RubricCriterion {
  weight: number;
  score_0_10: number | null;
}

export interface PromptEvaluation {
  score: number;
  method: string;
  breakdown: Record<string, RubricCriterion>;
}

export interface ModelCapability {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  capabilities: string[];
  status: "ready" | "offline" | "untested";
}

export interface ModelsResponse {
  default_model: string;
  models: ModelCapability[];
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: number;
  inference: {
    provider: string;
    endpoint: string;
    available: boolean;
    default_model: string;
    models_detected: string[];
  };
  storage: {
    type: string;
    connected: boolean;
    path: string;
  };
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  options: string[];
  allow_custom: boolean;
  priority?: "critical" | "high" | "medium";
  helper_text?: string;
  category?: "role" | "context" | "task" | "format";
}

export interface ClarifyResponse {
  task_type: TaskType;
  questions: ClarifyQuestion[];
}

export interface OptimizeRequest {
  prompt: string;
  provider?: "ollama" | "mock" | "openai" | "anthropic" | "gemini" | "openrouter";
  model_id?: string;
  preserve_language?: boolean;
  context_answers?: Record<string, string>;
}

export interface OptimizeResponse {
  run_id: string;
  status: "PLAN_READY" | "NEEDS_REVIEW" | "PLAN_FAILED" | "BLOCKED" | "FAIL";
  quality_state: QualityState;
  original_prompt: string;
  improved_prompt: string;
  task_type: TaskType;
  goal: string;
  constraints: string[];
  output_format: string;
  improvement_reasons: string[];
  evaluation: PromptEvaluation;
  validation: {
    status: string;
    prompt_assembly?: string;
    semantic_validation?: string;
    warnings?: string[];
  };
  preflight_errors: string[];
}

export interface AnalyzeRequest {
  prompt: string;
  task_type?: TaskType | "auto";
}

export interface AnalyzeResponse {
  task_type: TaskType;
  structure_score: number;
  quality_state: "STRUCTURALLY_VALID" | "REVIEW_REQUIRED" | "BLOCKED";
  scoring_method: string;
  breakdown: Record<string, RubricCriterion>;
  weaknesses: string[];
  preflight_errors: string[];
}

