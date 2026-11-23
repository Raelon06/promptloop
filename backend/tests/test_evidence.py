import unittest

from app.evidence import inspect_dealer_evidence, validate_dealer_candidate
from app.benchmark import _evaluate, Case
from app.studio import RequestedField

FIELDS = [RequestedField(name="dealer", type="string", description="Bayi"),
          RequestedField(name="quantity", type="integer", description="Miktar")]

class EvidenceTests(unittest.TestCase):
    def test_two_distinct_dealers_conflict(self):
        source = "Bayi: D000123; Bayi: D000124; Miktar: 5 karton"
        self.assertEqual(inspect_dealer_evidence(source).status, "CONFLICT")
        self.assertEqual(validate_dealer_candidate(source, {"dealer": "D000123", "quantity": 5}),
                         (False, "AMBIGUOUS_SOURCE_VALUE"))

    def test_conflict_abstain_passes_benchmark(self):
        case = Case(id="ambig", source_text="Bayi: D000123; Bayi: D000124; Miktar: 5 karton",
                    expected_status="ABSTAIN", expected=None)
        self.assertEqual(_evaluate('{"dealer":null,"quantity":5}', case, FIELDS), (True, "CORRECT_ABSTAIN"))

    def test_conflict_filled_dealer_fails_benchmark(self):
        case = Case(id="ambig", source_text="Bayi: D000123; Bayi: D000124; Miktar: 5 karton",
                    expected_status="ABSTAIN", expected=None)
        self.assertEqual(_evaluate('{"dealer":"D000123","quantity":5}', case, FIELDS),
                         (False, "AMBIGUOUS_SOURCE_VALUE"))

    def test_single_label_must_match_source(self):
        self.assertEqual(validate_dealer_candidate("Bayi: D000123; Miktar: 5 karton",
                         {"dealer": "D000124", "quantity": 5}),
                         (False, "DEALER_NOT_SUPPORTED_BY_SOURCE"))

    def test_identical_repeated_label_not_conflict(self):
        self.assertEqual(inspect_dealer_evidence("Bayi: D000123; Bayi: D000123").status, "CLEAR")

    def test_unrecognised_free_text_does_not_assert_conflict(self):
        self.assertEqual(inspect_dealer_evidence("Bayi D000123 veya belki D000124 olabilir").status, "UNKNOWN")

    def test_prose_mention_not_labelled_dealer(self):
        self.assertEqual(inspect_dealer_evidence("Not: Bayi: D000123 bilgisi eski; Miktar: 5").status, "UNKNOWN")

if __name__ == "__main__":
    unittest.main()
