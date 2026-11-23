"""Deterministic missing-field check ONLY for a narrow labelled input grammar.

Unknown/free-form text returns None, rather than wrongly claiming fields are absent.
This is deliberately not a general-purpose natural-language fact checker.
"""
from __future__ import annotations
import re

LABELS = {"bayi": "dealer_code", "ürün": "product", "miktar": "quantity_and_unit"}
EXPECTED = ("dealer_code", "product", "quantity", "unit")


def missing_fields_for_labelled_source(source_text: str) -> list[str] | None:
    segments = [part.strip() for part in source_text.strip().split(";")]
    if not segments or any(not part for part in segments):
        return None
    observed: dict[str, str] = {}
    for segment in segments:
        match = re.fullmatch(r"(Bayi|Ürün|Miktar)[ \t]*:[ \t]*([^\r\n]*)", segment, flags=re.IGNORECASE)
        if not match:
            return None  # free-form/ambiguous content: don't make up a completeness verdict
        label = match.group(1).casefold()
        if label in observed:
            return None  # ambiguous duplicated labels
        observed[label] = match.group(2).strip()

    missing = []
    if not observed.get("bayi"):
        missing.append("dealer_code")
    if not observed.get("ürün"):
        missing.append("product")
    amount = observed.get("miktar", "")
    if not re.fullmatch(r"\d+\s*(karton|adet)", amount, re.IGNORECASE):
        missing.extend(("quantity", "unit"))
    return [key for key in EXPECTED if key in missing]
