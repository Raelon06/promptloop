import argparse
import json
from pathlib import Path
from .engine import run_pipeline
from .models import RunRequest


def main():
    parser = argparse.ArgumentParser(description="PromptLoop V3.1 local-first MVP")
    parser.add_argument("--file", default="examples/synthetic_sale.json")
    parser.add_argument("--provider", choices=["mock", "ollama", "openai", "anthropic", "gemini"])
    parser.add_argument("--model", default=None)
    args = parser.parse_args()
    request = json.loads(Path(args.file).read_text(encoding="utf-8"))
    if args.provider:
        request["provider"] = args.provider
    if args.model:
        request["model_id"] = args.model
    print(run_pipeline(RunRequest.model_validate(request)).model_dump_json(indent=2))

if __name__ == "__main__":
    main()
