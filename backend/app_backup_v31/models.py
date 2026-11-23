from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class SaleRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    dealer_code: str = Field(min_length=1, max_length=64)
    product: str = Field(min_length=1, max_length=150)
    quantity: int = Field(ge=0, le=1000000)
    unit: Literal["karton", "adet"]

class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_prompt: str = Field(min_length=3, max_length=2000)
    source_text: str = Field(min_length=5, max_length=5000)
    benchmark_id: str | None = Field(default=None, max_length=80)
    provider: Literal["mock", "ollama", "openai", "anthropic", "gemini"] = "mock"
    model_id: str | None = Field(default=None, max_length=120)

    @field_validator("model_id")
    @classmethod
    def valid_model_id(cls, value):
        if value is not None:
            import re
            if not re.fullmatch(r"[A-Za-z0-9._:/-]+", value):
                raise ValueError("Model ID contains invalid characters")
        return value

class RunOutput(BaseModel):
    run_id: str
    status: Literal["PASS", "FAIL", "UNVERIFIED", "BLOCKED"]
    provider: str
    model_id: str
    prompt_score: float
    prompt_breakdown: dict
    attempts: list[dict]
    candidate: dict | None
    output_quality_score: float | None
    verified: bool
    messages: list[str]
    revised_prompt: str
