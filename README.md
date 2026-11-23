# PromptLoop — AI Prompt Optimization Platform

PromptLoop is an enterprise SaaS platform that allows anyone to submit a prompt and receive an automatically improved, structured, and production-ready prompt.

> **Core Value:** Write your prompt. Analyze it. Improve it. Use it.

---

## Architecture Overview

PromptLoop is engineered with a strict separation of concerns:
- **Frontend:** Next.js 15+ App Router, TypeScript, Tailwind CSS, Lucide icons, Dark Navy/Anthracite/Cyan design language.
- **Backend:** FastAPI (Python), versioned REST API (`/api/v1`), preflight security filters, heuristic quality scoring.
- **Inference Engine:** Private local or remote inference (default: local Ollama running `qwen3:4b`). No raw inference endpoints are ever exposed directly to the browser.
- **Quality State Policy:** Every optimized prompt is marked as `DRAFT`, `STRUCTURALLY_VALID`, `REVIEW_REQUIRED`, or `BENCHMARK_VERIFIED`. Transparent heuristic scores are never disguised as proven empirical accuracy.

---

## Directory Structure

```
/Users/berkbora/PROMPTLOOP
├── backend/
│   ├── app/
│   │   ├── api.py           # FastAPI entrypoint (with CORS + V1 router + legacy endpoints)
│   │   ├── api_v1.py        # Version 1 SaaS REST endpoints (analyze, optimize, models, health)
│   │   ├── studio.py        # Universal prompt architecture planner & heuristic rubric
│   │   ├── providers.py     # Provider adapters (Ollama, Mock, OpenAI, Anthropic, Gemini)
│   │   ├── security.py      # Secret, PII & credential preflight guards
│   │   ├── benchmark.py     # Offline paired A/B benchmark engine
│   │   ├── engine.py        # Orchestration pipeline
│   │   ├── evidence.py      # Independent dealer evidence gate (V3.4.2)
│   │   ├── models.py        # Pydantic schemas
│   │   └── registry.py      # Telemetry persistence (hashes only, no raw prompts)
│   ├── tests/               # 59 automated unit tests (52 legacy + 7 V1 API tests)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (layout, page, globals.css)
│   │   ├── components/      # PromptOptimizer, CopyButton (accessible live region)
│   │   └── lib/             # API client, TypeScript contracts
│   ├── package.json
│   └── tailwind.config.ts
├── start_backend.sh         # Runs FastAPI backend on http://127.0.0.1:8000
├── start_frontend.sh        # Runs Next.js frontend on http://localhost:3000
├── start_platform.sh        # Starts both backend and frontend simultaneously
└── run_tests.sh             # Executes all 59 backend unittests and frontend build
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js (v20+)
- Python (3.11+)
- Ollama running locally with `qwen3:4b` (`ollama run qwen3:4b`)

### 1. Run All Tests
```bash
./run_tests.sh
```

### 2. Start Platform
```bash
./start_platform.sh
```

Or start individually:
```bash
# Terminal 1: Backend
./start_backend.sh

# Terminal 2: Frontend
./start_frontend.sh
```

- **Web Application:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health Check:** [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

## First Vertical Slice Verification

The core vertical slice is fully implemented and tested:
1. User enters natural-language prompt (English or Turkish).
2. User clicks **"Optimize Prompt"**.
3. Backend performs preflight safety analysis and runs Qwen3:4b prompt planner.
4. AI injects negative constraints, format rules, role persona, and preserves user intent.
5. Optimized prompt is displayed side-by-side with 7-dimension rubric score and specific improvement reasons.
6. User clicks **"Copy Prompt"** with accessible clipboard confirmation.

