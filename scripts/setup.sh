#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/local-config.mjs
bash scripts/db-start.sh
table_count="$(docker exec proclair-postgres psql -U proclair -d proclair -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
if [[ "$table_count" == '0' ]]; then
  latest_backup="$(python3 - <<'PY'
from pathlib import Path
files=list(Path('.local/backups').glob('*.dump'))
print(max(files,key=lambda p:p.stat().st_mtime) if files else '')
PY
)"
  if [[ -n "$latest_backup" ]]; then bash scripts/db-restore-empty.sh "$latest_backup"; fi
fi
npm ci --ignore-scripts --cache /workspace/.npm-cache --no-audit --no-fund
npm run db:generate
npm run db:migrate
npm run db:seed
npm run legacy:migrate
npm run build
bash scripts/db-backup.sh
