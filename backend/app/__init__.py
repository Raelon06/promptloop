"""PromptLoop V3.4.2 - local-first evaluation, prompt studio & SaaS platform."""
import os
from pathlib import Path

# Automatically load backend/.env if present
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip().strip("'\""))
