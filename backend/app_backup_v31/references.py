"""Trusted, versioned synthetic benchmark fixtures; not supplied by API callers."""
from .models import SaleRecord

# In production load this from a separate, access-controlled reference dataset.
DATASET_VERSION = "synthetic-benchmark-v1"
_REFERENCE_CASES = {
    "synthetic_sale_v1": {
        "source": "Bayi: D000123; Ürün: Ürün A; Miktar: 24 karton",
        "expected": {"dealer_code": "D000123", "product": "Ürün A", "quantity": 24, "unit": "karton"},
    },
}

def get_trusted_reference(benchmark_id: str | None, source_text: str) -> SaleRecord | None:
    case = _REFERENCE_CASES.get(benchmark_id or "")
    if case is None or case["source"] != source_text:
        return None
    return SaleRecord.model_validate(case["expected"])
