"""Conservative local demo safeguards. Not a complete PII or injection defense."""
import re

_SECRET = re.compile(r"(?i)(?:sk-[a-z0-9_-]{18,}|AIza[a-zA-Z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)")
_TCKN_LIKE = re.compile(r"(?<!\d)\d{11}(?!\d)")
_CARD_LIKE = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")

def preflight(source: str, prompt: str, provider: str) -> list[str]:
    errors = []
    if _SECRET.search(source + "\n" + prompt):
        errors.append("SECRET_PATTERN_BLOCKED")
    # Remote providers cannot receive potential personal identifiers in demo mode.
    if provider in {"openai", "anthropic", "gemini", "openrouter"}:
        if _TCKN_LIKE.search(source + "\n" + prompt):
            errors.append("POTENTIAL_NATIONAL_ID_CLOUD_BLOCKED")
        if _CARD_LIKE.search(source + "\n" + prompt):
            errors.append("POTENTIAL_PAYMENT_DATA_CLOUD_BLOCKED")
    return errors
