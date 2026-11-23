import os
from pathlib import Path

# Load .env variables securely on startup
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip().strip("'\""))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .models import RunRequest, RunOutput
from .engine import run_pipeline
from .api_v1 import router as api_v1_router

app = FastAPI(
    title="PromptLoop Platform API",
    description="Enterprise AI Prompt Optimization & Benchmark Platform",
    version="3.4.2",
)

# CORS configuration for Next.js frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount V1 Versioned SaaS APIs
app.include_router(api_v1_router)

# --- Legacy Endpoints (Preserved 100% backward-compatible with V3.1 - V3.4.2) ---
@app.get("/health")
def health():
    return {"status": "ok", "scope": "structured_sales_extraction_mvp"}

@app.post("/runs", response_model=RunOutput)
def create_run(request: RunRequest):
    return run_pipeline(request)
