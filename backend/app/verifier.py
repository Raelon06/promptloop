"""Independent schema/benchmark checks; never accept self-scored model accuracy."""
import json
from pydantic import ValidationError
from .models import SaleRecord

FIELDS = ("dealer_code", "product", "quantity", "unit")


def verify_output(raw: str, ground_truth: SaleRecord | None) -> dict:
    try:
        payload = json.loads(raw)
    except (ValueError, TypeError):
        return {"schema_pass": False, "ground_truth_pass": False,
                "quality_score": None, "status": "FAIL", "candidate": None,
                "failure_code": "SCHEMA_OR_JSON_INVALID"}

    # {} is an explicit abstention, not an invalid four-field record.
    # Without trusted ground truth, this does NOT certify that abstaining was correct.
    if payload == {}:
        if ground_truth is not None:
            return {"schema_pass": True, "ground_truth_pass": False,
                    "quality_score": None, "status": "FAIL", "candidate": None,
                    "failure_code": "UNEXPECTED_ABSTENTION_REFERENCE_HAS_DATA"}
        return {"schema_pass": True, "ground_truth_pass": False,
                "quality_score": None, "status": "ABSTAIN", "candidate": None,
                "failure_code": "MODEL_ABSTAINED_WITHOUT_REFERENCE"}

    try:
        candidate = SaleRecord.model_validate(payload)
    except (ValueError, TypeError, ValidationError):
        return {"schema_pass": False, "ground_truth_pass": False,
                "quality_score": None, "status": "FAIL", "candidate": None,
                "failure_code": "SCHEMA_OR_JSON_INVALID"}

    data = candidate.model_dump()
    if ground_truth is None:
        return {"schema_pass": True, "ground_truth_pass": False,
                "quality_score": None, "status": "UNVERIFIED", "candidate": data,
                "failure_code": "GROUND_TRUTH_NOT_AVAILABLE"}
    expected = ground_truth.model_dump()
    correct = sum(1 for k in FIELDS if data[k] == expected[k])
    score = round(100.0 * correct / len(FIELDS), 2)
    return {"schema_pass": True, "ground_truth_pass": correct == len(FIELDS),
            "quality_score": score, "status": "PASS" if score >= 85 and correct == len(FIELDS) else "FAIL",
            "candidate": data,
            "failure_code": None if correct == len(FIELDS) else "GROUND_TRUTH_MISMATCH"}
