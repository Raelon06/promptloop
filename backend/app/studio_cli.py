"""Command-line entrypoint for the V3.3 experimental prompt studio."""
import argparse
import json
from pathlib import Path

from .studio import RequestedField, StudioRequest, run_studio


def main():
    parser = argparse.ArgumentParser(description="PromptLoop V3.3 dynamic prompt analysis (experimental)")
    parser.add_argument("--prompt", help="Prompt text; use --prompt-file for longer prompts")
    parser.add_argument("--prompt-file", help="UTF-8 file containing the prompt")
    parser.add_argument("--source", help="Optional data to extract from")
    parser.add_argument("--source-file", help="UTF-8 source data file")
    parser.add_argument("--provider", default="ollama", choices=["ollama", "openai", "anthropic", "gemini"])
    parser.add_argument("--model", default="qwen3:4b")
    parser.add_argument("--fields", help="Optional override: dealer_code:string,quantity:integer")
    args = parser.parse_args()
    if bool(args.prompt) == bool(args.prompt_file):
        parser.error("Provide exactly one of --prompt and --prompt-file")
    if args.source and args.source_file:
        parser.error("Provide either --source or --source-file")
    prompt = args.prompt if args.prompt else Path(args.prompt_file).read_text(encoding="utf-8")
    source = args.source if args.source is not None else (Path(args.source_file).read_text(encoding="utf-8") if args.source_file else None)
    fields = None
    if args.fields is not None:
        try:
            fields = [RequestedField(name=n.strip(), type=t.strip(), description=n.strip()) for n,t in (x.split(":", 1) for x in args.fields.split(","))]
        except (ValueError, TypeError) as exc:
            parser.error("Invalid --fields. Example: dealer_code:string,quantity:integer")
    request = StudioRequest(user_prompt=prompt, source_text=source, provider=args.provider,
                            model_id=args.model, requested_fields_override=fields)
    result = run_studio(request)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
