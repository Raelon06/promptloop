"""Reference orchestration with deterministic source-completeness precheck."""
import hashlib
import time
import uuid
from datetime import datetime, timezone
from .models import RunRequest, RunOutput
from .evaluator import evaluate_prompt, make_prompt
from .providers import ProviderFailure, get_provider
from .security import preflight
from .completeness import missing_fields_for_labelled_source
from .verifier import verify_output
from .registry import save_run
from .references import get_trusted_reference

MAX_RETRIES = 3
MAX_TOTAL_ATTEMPTS = MAX_RETRIES + 1
MAX_WALL_SECONDS = 210


def run_pipeline(req: RunRequest) -> RunOutput:
    started = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex
    prompt_score, breakdown = evaluate_prompt(req.user_prompt)
    trusted_reference = get_trusted_reference(req.benchmark_id, req.source_text)
    revised_system, revised_user = make_prompt(req)
    attempts = []
    candidate = None
    quality = None
    verified = False
    status = "FAIL"
    messages = []
    missing_fields = []
    model_id = req.model_id or {"mock": "deterministic-fixture-v1", "ollama": "qwen3:4b"}.get(req.provider, "configured-default")

    # Security blocks precede source evaluation. Neither is an LLM decision.
    preflight_errors = preflight(req.source_text, req.user_prompt, req.provider)
    if preflight_errors:
        status = "BLOCKED"
        messages = preflight_errors
    else:
        missing = missing_fields_for_labelled_source(req.source_text)
        if missing:
            # Conclusive ONLY for this strict "Bayi:...; Ürün:...; Miktar:..." grammar.
            # We cannot certify model behaviour since the model was not called.
            status = "ABSTAIN"
            missing_fields = missing
            messages = ["SOURCE_REQUIRED_FIELDS_MISSING", "MODEL_NOT_CALLED"]
        else:
            try:
                backend = get_provider(req.provider, req.model_id)
                model_id = backend.model_id
                deadline = time.monotonic() + MAX_WALL_SECONDS
                feedback = None
                for attempt_idx in range(1, MAX_TOTAL_ATTEMPTS + 1):
                    if time.monotonic() >= deadline:
                        messages.append("TOTAL_TIME_BUDGET_EXCEEDED")
                        break
                    system, user = make_prompt(req, feedback)
                    start = time.perf_counter()
                    try:
                        result = backend.generate(system, user, attempt_idx)
                        report = verify_output(result.content, trusted_reference)
                        latency = int((time.perf_counter() - start) * 1000)
                        attempts.append({"attempt": attempt_idx, "status": report["status"],
                            "failure_code": report["failure_code"], "latency_ms": latency,
                            "schema_pass": report["schema_pass"],
                            "ground_truth_pass": report["ground_truth_pass"],
                            "quality_score": report["quality_score"],
                            "input_tokens": result.input_tokens, "output_tokens": result.output_tokens})
                        if report["candidate"] is not None:
                            candidate = report["candidate"]
                            quality = report["quality_score"]
                        if report["status"] == "PASS":
                            status, verified = "PASS", True
                            break
                        if report["status"] == "UNVERIFIED":
                            status = "UNVERIFIED"
                            messages.append("Reference data was not provided; schema passed but factual truth was not verified.")
                            break
                        if report["status"] == "ABSTAIN":
                            status = "ABSTAIN"
                            messages.append("MODEL_ABSTAINED; no trusted reference to judge whether abstention was correct.")
                            break
                        feedback = report["failure_code"]
                    except ProviderFailure as err:
                        latency = int((time.perf_counter() - start) * 1000)
                        attempts.append({"attempt": attempt_idx, "status": "FAIL",
                            "failure_code": err.code, "latency_ms": latency,
                            "input_tokens": None, "output_tokens": None})
                        messages.append(err.code)
                        if not err.retryable:
                            break
            except ProviderFailure as err:
                messages.append(err.code)

    if not messages and status == "FAIL":
        messages.append("MAX_RETRIES_EXHAUSTED_OR_VALIDATION_FAILED")
    output = RunOutput(
        run_id=run_id, status=status, provider=req.provider, model_id=model_id,
        prompt_score=prompt_score, prompt_breakdown=breakdown,
        attempts=attempts, candidate=candidate, output_quality_score=quality,
        verified=verified, messages=messages, missing_fields=missing_fields,
        revised_prompt=revised_system + "\n\n" + revised_user,
    )
    # Store SHA-256 and telemetry, but NOT raw prompts, source or candidates.
    prompt_hash = hashlib.sha256((req.user_prompt + "\0" + req.source_text).encode()).hexdigest()
    save_run({"run_id": run_id, "started_utc": started, "prompt_hash": prompt_hash,
        "provider": req.provider, "model_id": model_id, "prompt_score": prompt_score,
        "status": status}, attempts)
    return output
