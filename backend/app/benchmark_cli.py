"""CLI for independent V3.4 paired prompt benchmark."""
import argparse
import json
from pathlib import Path

from .benchmark import load_suite, run_benchmark


def main():
    parser = argparse.ArgumentParser(description="Run a labelled, paired A/B prompt benchmark")
    parser.add_argument("--suite", required=True, help="Synthetic ground-truth benchmark JSON")
    parser.add_argument("--provider", choices=["ollama", "openai", "anthropic", "gemini"], default="ollama")
    parser.add_argument("--model", default="qwen3:4b")
    parser.add_argument("--repetitions", type=int, default=1, choices=[1, 2, 3, 4, 5])
    parser.add_argument("--out", help="Optional local JSON output path; only metrics, no raw source")
    args = parser.parse_args()
    suite = load_suite(args.suite)
    results = run_benchmark(suite, provider_name=args.provider, model_id=args.model,
                            repetitions=args.repetitions)
    rendered = json.dumps(results, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(rendered, encoding="utf-8")
        print("Results written to:", args.out)
    print(rendered)


if __name__ == "__main__":
    main()
