"""Conservative independent evidence checks for explicitly labelled dealer data.

This is NOT a general-purpose natural-language verifier. It recognises only
semicolon/newline-delimited `Bayi: Dxxxxxx` fields, with no guesses.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

# Require label to begin a delimited field, preventing matches in arbitrary prose.
_DEALER = re.compile(r"(?:\A|[;\n])\s*Bayi\s*:\s*(D\d{6,})\s*(?=;|\n|\Z)", re.I)


@dataclass(frozen=True)
class EvidenceCheck:
    status: Literal["CLEAR", "CONFLICT", "UNKNOWN"]
    values: tuple[str, ...] = ()


def inspect_dealer_evidence(source_text: str) -> EvidenceCheck:
    """Only emit CONFLICT for >=2 different explicit labelled dealer codes."""
    vals = tuple(dict.fromkeys(x.upper() for x in _DEALER.findall(source_text)))
    if len(vals) >= 2:
        return EvidenceCheck("CONFLICT", vals)
    if len(vals) == 1:
        return EvidenceCheck("CLEAR", vals)
    return EvidenceCheck("UNKNOWN")


def validate_dealer_candidate(source_text: str, candidate: object) -> tuple[bool, str | None]:
    """Independent safety gate. Does not repair model output or consult gold labels."""
    evidence = inspect_dealer_evidence(source_text)
    if not isinstance(candidate, dict) or "dealer" not in candidate:
        return True, None
    dealer = candidate["dealer"]
    if dealer is None:
        return True, None
    if evidence.status == "CONFLICT":
        return False, "AMBIGUOUS_SOURCE_VALUE"
    if evidence.status == "CLEAR" and dealer != evidence.values[0]:
        return False, "DEALER_NOT_SUPPORTED_BY_SOURCE"
    # UNKNOWN: we cannot determine from this narrow parser; do not pretend PASS.
    return True, None
