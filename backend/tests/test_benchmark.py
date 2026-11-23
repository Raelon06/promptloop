import json
import unittest
from pathlib import Path

from app.benchmark import BenchmarkSuite, Case, _evaluate, run_benchmark
from app.providers import ProviderResult
from app.studio import RequestedField, StudioPlan

FIELDS = [RequestedField(name="dealer", type="string", description="Bayi"),
          RequestedField(name="quantity", type="integer", description="Miktar")]


def fixture():
    return BenchmarkSuite(name="synthetic", task="Yalnızca bayi ve miktarı çıkar.", fields=FIELDS,
                          cases=[Case(id="valid_case", source_text="Bayi: D000123; Miktar: 24 karton",
                                      expected_status="PRESENT", expected={"dealer": "D000123", "quantity": 24}),
                                 Case(id="missing_case", source_text="Bayi: D000123",
                                      expected_status="ABSTAIN", expected=None)])


def fake_plan(fields=None):
    return StudioPlan(task_type="data_extraction", goal="Veri çıkar", audience="",
                      requested_fields=fields if fields is not None else FIELDS,
                      constraints=[], output_format="json",
                      improved_prompt="GÖREV: Yalnızca bayi ve miktarı çıkar; eksikse {} ver. "*2,
                      improvement_reasons=[])


class FixtureProvider:
    def generate(self, system, user, attempt):
        if "Miktar: 24" in user:
            return ProviderResult('{"dealer":"D000123","quantity":24}', 100, 25)
        return ProviderResult("{}", 80, 2)


class BenchmarkTests(unittest.TestCase):
    def test_abstain_and_present(self):
        suite = fixture()
        self.assertEqual(_evaluate('{}', suite.cases[1], FIELDS), (True, 'CORRECT_ABSTAIN'))
        self.assertEqual(_evaluate('{}', suite.cases[0], FIELDS), (False, 'INCORRECT_ABSTAIN'))

    def test_exact_gold_and_schema(self):
        case = fixture().cases[0]
        self.assertTrue(_evaluate('{"dealer":"D000123","quantity":24}', case, FIELDS)[0])
        self.assertFalse(_evaluate('{"dealer":"D000123","quantity":25}', case, FIELDS)[0])
        self.assertFalse(_evaluate('{"dealer":"D000123","quantity":true}', case, FIELDS)[0])

    def test_labels_must_match_schema(self):
        broken = fixture().model_dump()
        broken['cases'][0]['expected']['extra'] = 'X'
        with self.assertRaises(ValueError):
            BenchmarkSuite.model_validate(broken)

    def test_mock_paired_comparison(self):
        r = run_benchmark(fixture(), provider=FixtureProvider(), plan=fake_plan(), repetitions=2)
        self.assertEqual(r['status'], 'BENCHMARK_COMPLETE_REVIEW_REQUIRED')
        self.assertEqual(r['comparison']['original']['accuracy'], 1.0)
        self.assertEqual(r['comparison']['optimized']['accuracy'], 1.0)
        self.assertEqual(len(r['outcomes']), 8)
        self.assertEqual(r['release_decision'], 'NO_AUTOMATIC_PROMOTION')

    def test_plan_mismatch_blocks_benchmark(self):
        mismatched = [RequestedField(name="dealer_code", type="string", description="Bayi kodu"), FIELDS[1]]
        r = run_benchmark(fixture(), provider=FixtureProvider(), plan=fake_plan(mismatched))
        self.assertEqual(r['status'], 'PLAN_FIELD_MISMATCH')
        self.assertNotIn('outcomes', r)

    def test_invalid_retry_count(self):
        with self.assertRaises(ValueError):
            run_benchmark(fixture(), provider=FixtureProvider(), plan=fake_plan(), repetitions=0)


if __name__ == "__main__":
    unittest.main()
