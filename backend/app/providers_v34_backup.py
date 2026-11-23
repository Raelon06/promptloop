"""Explicit provider adapters; API calls are made by middleware, not by the LLM."""
from __future__ import annotations
import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass

@dataclass
class ProviderResult:
    content: str
    input_tokens: int | None = None
    output_tokens: int | None = None

class ProviderFailure(Exception):
    def __init__(self, code: str, retryable: bool = False):
        super().__init__(code)
        self.code = code
        self.retryable = retryable

class MockProvider:
    """A deterministic fixture; first output is bad to exercise retry mechanics."""
    model_id = "deterministic-fixture-v1"
    def generate(self, system: str, user: str, attempt: int) -> ProviderResult:
        if attempt == 1:
            return ProviderResult("INVALID_JSON_FOR_RETRY")
        source = user.split("SOURCE_TEXT_BEGIN\n", 1)[-1].split("\nSOURCE_TEXT_END", 1)[0]
        dealer = re.search(r"Bayi:\s*([A-Z0-9]+)", source, re.I)
        product = re.search(r"Ürün:\s*([^;\n]+)", source, re.I)
        amount = re.search(r"Miktar:\s*(\d+)\s*(karton|adet)", source, re.I)
        if not all((dealer, product, amount)):
            return ProviderResult("{}")
        return ProviderResult(json.dumps({
            "dealer_code": dealer.group(1), "product": product.group(1).strip(),
            "quantity": int(amount.group(1)), "unit": amount.group(2).lower(),
        }, ensure_ascii=False))

def _post(url: str, payload: dict, headers: dict) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        # Never expose response bodies: they may contain private text or keys.
        raise ProviderFailure(f"HTTP_{exc.code}", retryable=exc.code in {408, 429, 500, 502, 503, 504}) from None
    except (urllib.error.URLError, TimeoutError):
        raise ProviderFailure("PROVIDER_NETWORK_OR_TIMEOUT", retryable=True) from None
    except ValueError:
        raise ProviderFailure("PROVIDER_INVALID_RESPONSE") from None

class RemoteProvider:
    def __init__(self, kind: str, model_id: str):
        self.kind = kind
        self.model_id = model_id
        if kind != "ollama" and os.getenv("ALLOW_CLOUD", "false").lower() != "true":
            raise ProviderFailure("CLOUD_DISABLED_SET_ALLOW_CLOUD_TRUE")
        keys = {"openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY", "gemini": "GEMINI_API_KEY"}
        if kind in keys and not os.getenv(keys[kind]):
            raise ProviderFailure("MISSING_" + keys[kind])

    def generate(self, system: str, user: str, attempt: int) -> ProviderResult:
        if self.kind == "ollama":
            data = _post("http://127.0.0.1:11434/api/chat", {
                "model": self.model_id, "messages": [
                    {"role": "system", "content": system}, {"role": "user", "content": user}
                ], "stream": False, "think": False, "format": "json", "options": {"temperature": 0},
            }, {})
            return ProviderResult(data["message"]["content"], data.get("prompt_eval_count"), data.get("eval_count"))
        if self.kind == "openai":
            data = _post("https://api.openai.com/v1/responses", {
                "model": self.model_id, "instructions": system,
                "input": user, "store": False,
            }, {"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"]})
            parts = [part.get("text", "") for output in data.get("output", [])
                     if output.get("type") == "message" for part in output.get("content", [])
                     if part.get("type") == "output_text"]
            usage = data.get("usage") or {}
            return ProviderResult("\n".join(parts), usage.get("input_tokens"), usage.get("output_tokens"))
        if self.kind == "anthropic":
            data = _post("https://api.anthropic.com/v1/messages", {
                "model": self.model_id, "max_tokens": 600, "system": system,
                "messages": [{"role": "user", "content": user}],
            }, {"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"})
            parts = [x.get("text", "") for x in data.get("content", []) if x.get("type") == "text"]
            usage = data.get("usage") or {}
            return ProviderResult("\n".join(parts), usage.get("input_tokens"), usage.get("output_tokens"))
        if self.kind == "gemini":
            data = _post("https://generativelanguage.googleapis.com/v1beta/models/" + self.model_id + ":generateContent", {
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            }, {"x-goog-api-key": os.environ["GEMINI_API_KEY"]})
            candidates = data.get("candidates") or []
            parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
            usage = data.get("usageMetadata") or {}
            return ProviderResult("\n".join(x.get("text", "") for x in parts),
                usage.get("promptTokenCount"), usage.get("candidatesTokenCount"))
        raise ProviderFailure("UNKNOWN_PROVIDER")

def get_provider(kind: str, model_id: str | None):
    if kind == "mock":
        return MockProvider()
    if kind != "ollama" and not model_id:
        raise ProviderFailure("CLOUD_MODEL_ID_REQUIRED")
    return RemoteProvider(kind, model_id or "qwen3:4b")
