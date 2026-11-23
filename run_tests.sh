#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "=== 1. RUNNING BACKEND UNITTESTS (59 TESTS) ==="
cd backend
python3 -m unittest discover -s tests -p 'test_*.py' -v

echo ""
echo "=== 2. RUNNING FRONTEND TYPECHECK & BUILD ==="
cd ../frontend
npm run build

echo ""
echo "ALL TESTS & VERIFICATIONS PASSED SUCCESSFULLY!"

