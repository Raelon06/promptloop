"""V3.3.1 regression tests for plan quality gates and deterministic extraction prompts."""
import json
import unittest

from app.studio import StudioRequest, run_studio
from app.providers import ProviderResult


BASE = {
    "task_type": "data_extraction",
    "goal": "Metinden bayi ve miktarı çıkar",
    "audience": "audience or unspecified",
    "requested_fields": [
        {"name": "dealer", "type": "string", "description": "Bayi"},
        {"name": "quantity", "type": "integer", "description": "Miktar"},
    ],
    "constraints": ["Yalnızca bayi ve miktar"],
    "output_format": "json",
    "improved_prompt": "Şu satış metninden yalnızca bayi ve mik: 'dealer' ve 'quantity' bilgilerini çıkar ve JSON döndür.",
    "improvement_reasons": ["İstenen çıktı düzenlendi"],
}


class Provider:
    def __init__(self, *out):
        self.out = list(out)
        self.calls = 0
    def generate(self, system, user, attempt):
        self.calls += 1
        return ProviderResult(self.out.pop(0))


class StudioQualityTests(unittest.TestCase):
    def test_replaces_broken_improved_prompt_and_clears_audience_placeholder(self):
        p = Provider(json.dumps(BASE, ensure_ascii=False))
        r = run_studio(StudioRequest(user_prompt="Şu satış metninden yalnızca bayi ve miktar bilgilerini çıkar."), p)
        self.assertEqual(r["status"], "PLAN_READY")
        self.assertEqual(p.calls, 1)
        self.assertEqual(r["plan"]["audience"], "")
        self.assertNotIn("mik:", r["plan"]["improved_prompt"])
        self.assertIn("dealer: string", r["plan"]["improved_prompt"])
        self.assertIn("quantity: integer", r["plan"]["improved_prompt"])
        self.assertIn("yalnızca boş JSON nesnesi {}", r["plan"]["improved_prompt"])
        self.assertEqual(r["plan_validation"]["status"], "STRUCTURAL_ONLY")

    def test_blocks_unrequested_product_field_before_extraction(self):
        plan = dict(BASE, requested_fields=BASE["requested_fields"] + [
            {"name": "product", "type": "string", "description": "Ürün"}
        ])
        p = Provider(json.dumps(plan, ensure_ascii=False))
        r = run_studio(StudioRequest(user_prompt="Şu metinden yalnızca bayi ve miktar çıkar.", source_text="Bayi: A; Miktar: 3"), p)
        self.assertEqual(r["status"], "NEEDS_REVIEW")
        self.assertEqual(p.calls, 1)
        self.assertIsNone(r["execution"])
        self.assertIn("UNREQUESTED_KNOWN_FIELD:product", r["plan_validation"]["warnings"])

    def test_extraction_stays_unverified_without_ground_truth(self):
        p = Provider(json.dumps(BASE, ensure_ascii=False), '{"dealer":"D000123","quantity":24}')
        r = run_studio(StudioRequest(user_prompt="Metinden yalnızca bayi ve miktar çıkar", source_text="Bayi: D000123; Miktar: 24"), p)
        self.assertEqual(r["status"], "UNVERIFIED")
        self.assertFalse(r["execution"]["verified"])
        self.assertEqual(set(r["execution"]["candidate"]), {"dealer", "quantity"})

    def test_ambiguous_code_warns_without_blocking(self):
        plan = dict(BASE, requested_fields=[
            {"name": "dealer_code", "type": "string", "description": "Bayi kodu"},
            BASE["requested_fields"][1]
        ])
        p = Provider(json.dumps(plan, ensure_ascii=False))
        r = run_studio(StudioRequest(user_prompt="Şu metinden yalnızca bayi ve miktar çıkar"), p)
        self.assertEqual(r["status"], "PLAN_READY")
        self.assertTrue(any(w.startswith("AMBIGUOUS_DEALER_CODE:") for w in r["plan_validation"]["warnings"]))

    def test_unsupported_extraction_output_format_pauses(self):
        plan = dict(BASE, output_format="text")
        p = Provider(json.dumps(plan, ensure_ascii=False))
        r = run_studio(StudioRequest(user_prompt="Şu metinden yalnızca bayi ve miktar çıkar", source_text="Bayi: A; Miktar: 1"), p)
        self.assertEqual(r["status"], "NEEDS_REVIEW")
        self.assertEqual(p.calls, 1)


if __name__ == "__main__":
    unittest.main()
