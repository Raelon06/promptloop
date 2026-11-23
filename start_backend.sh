#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
echo "Starting PromptLoop FastAPI Backend on http://127.0.0.1:8000 ..."
python3 -m uvicorn app.api:app --host 127.0.0.1 --port 8000 --reload

