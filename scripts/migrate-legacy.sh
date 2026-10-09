#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/export-legacy.py | node --env-file=.env --import tsx scripts/import-legacy.ts
