#!/usr/bin/env bash
set -e
ROOT_DIR="$(dirname "$0")"

echo "=== PROMPTLOOP PLATFORM STARTUP ==="
echo "Ensuring Ollama is running..."
if ! curl -s http://127.0.0.1:11434/api/tags > /dev/null; then
  echo "WARNING: Local Ollama on port 11434 is not responding."
  echo "Make sure Ollama is started with: ollama serve"
  echo "You can still run with Mock provider."
fi

# Run backend in background
bash "$ROOT_DIR/start_backend.sh" &
BACKEND_PID=$!

# Run frontend
bash "$ROOT_DIR/start_frontend.sh" &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

echo "PromptLoop Web Platform is running!"
echo "-> Frontend: http://localhost:3000"
echo "-> Backend API: http://127.0.0.1:8000/docs"
echo "Press Ctrl+C to stop all services."

wait

