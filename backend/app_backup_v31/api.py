from fastapi import FastAPI
from .models import RunRequest, RunOutput
from .engine import run_pipeline

app = FastAPI(title="PromptLoop V3.1 — Local MVP", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok", "scope": "structured_sales_extraction_mvp"}

@app.post("/runs", response_model=RunOutput)
def create_run(request: RunRequest):
    return run_pipeline(request)
