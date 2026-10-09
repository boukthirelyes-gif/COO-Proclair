#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local/backups
umask 077
backup_path=".local/backups/proclair-$(date -u +%Y%m%dT%H%M%S)-$$.dump"
docker exec proclair-postgres pg_dump -U proclair -d proclair -Fc > "$backup_path.tmp"
docker exec -i proclair-postgres pg_restore --list < "$backup_path.tmp" >/dev/null
mv "$backup_path.tmp" "$backup_path"
echo "Sauvegarde vérifiée : $backup_path"
