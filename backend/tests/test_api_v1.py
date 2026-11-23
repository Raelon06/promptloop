import unittest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.api import health as legacy_health
from app.api_v1 import (
    PromptAnalyzeRequest,
    PromptOptimizeRequest,
    analyze_prompt,
    get_v1_health,
    get_v1_models,
    optimize_prompt,
)
from app.rate_limiter import limiter


def make_fake_request(ip: str = "127.0.0.1"):
    req = MagicMock()
    req.headers = {}
    req.client.host = ip
    return req


class ApiV1Tests(unittest.TestCase):
    def setUp(self):
        limiter.reset_for_test()

    def test_legacy_health_preserved(self):
        res = legacy_health()
        self.assertEqual(res, {"status": "ok", "scope": "structured_sales_extraction_mvp"})

    def test_v1_health(self):
        res = get_v1_health()
        self.assertIn(res.status, ("healthy", "degraded"))
        self.assertEqual(res.version, "3.4.2")
        self.assertIn("provider", res.inference)
        self.assertEqual(res.storage["type"], "sqlite")

    def test_v1_models(self):
        res = get_v1_models()
        self.assertIn(res.default_model, ("openrouter/free", "qwen3:4b", "mock"))
        self.assertTrue(len(res.models) >= 2)
        model_ids = [m.id for m in res.models]
        self.assertIn("qwen3:4b", model_ids)
        self.assertIn("mock", model_ids)

    def test_v1_analyze_prompt(self):
        req = PromptAnalyzeRequest(
            prompt="Extract dealer code and total quantity from this invoice text"
        )
        res = analyze_prompt(req, make_fake_request())
        self.assertEqual(res.task_type, "data_extraction")
        self.assertIsInstance(res.structure_score, float)
        self.assertIn(res.quality_state, ("STRUCTURALLY_VALID", "REVIEW_REQUIRED"))
        self.assertIn("task", res.breakdown)
        self.assertIsInstance(res.weaknesses, list)
        self.assertEqual(res.preflight_errors, [])

    def test_v1_analyze_secret_blocked(self):
        req = PromptAnalyzeRequest(
            prompt="Analyze this data with API key sk-abcdef123456789012345678"
        )
        res = analyze_prompt(req, make_fake_request())
        self.assertEqual(res.quality_state, "BLOCKED")
        self.assertIn("SECRET_PATTERN_BLOCKED", res.preflight_errors)

    def test_v1_optimize_mock(self):
        req = PromptOptimizeRequest(
            prompt="Write a python script to process CSV files",
            provider="mock"
        )
        res = optimize_prompt(req, make_fake_request())
        self.assertEqual(res.status, "PLAN_READY")
        self.assertEqual(res.quality_state, "STRUCTURALLY_VALID")
        self.assertTrue(len(res.improved_prompt) > 20)
        self.assertEqual(res.task_type, "code")
        self.assertTrue(len(res.improvement_reasons) > 0)
        self.assertIn("score", res.evaluation)

    def test_v1_optimize_secret_blocked(self):
        req = PromptOptimizeRequest(
            prompt="Here is my secret key sk-abcdef123456789012345678 for analysis",
            provider="mock"
        )
        res = optimize_prompt(req, make_fake_request())
        self.assertEqual(res.status, "BLOCKED")
        self.assertIn("SECRET_PATTERN_BLOCKED", res.preflight_errors)

    def test_rate_limiting_triggers_429(self):
        req = PromptOptimizeRequest(
            prompt="Write a python script to process CSV files",
            provider="mock"
        )
        fake_req = make_fake_request(ip="192.168.1.100")
        # İlk 5 istek başarıyla geçmeli (optimize limiti: 5/dk)
        for _ in range(5):
            res = optimize_prompt(req, fake_req)
            self.assertEqual(res.status, "PLAN_READY")

        # 6. istek 429 Too Many Requests fırlatmalı
        with self.assertRaises(HTTPException) as ctx:
            optimize_prompt(req, fake_req)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Çok fazla optimizasyon isteği", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
