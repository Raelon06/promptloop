#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/frontend"
if [ ! -d ".next" ]; then
  echo "Building Next.js frontend..."
  npm run build
fi
echo "Starting PromptLoop Next.js Frontend on http://localhost:3000 ..."
npx next start -p 3000
