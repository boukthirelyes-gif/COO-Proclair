#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
backup_file="${1:?Indiquez une sauvegarde .dump}"
if [[ ! -f "$backup_file" ]]; then echo 'Sauvegarde introuvable.' >&2; exit 1; fi
table_count="$(docker exec proclair-postgres psql -U proclair -d proclair -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
if [[ "$table_count" != '0' ]]; then echo 'Restauration refusée : base non vide. Aucune donnée remplacée.' >&2; exit 1; fi
docker exec -i proclair-postgres pg_restore -U proclair -d proclair --single-transaction --exit-on-error --no-owner < "$backup_file"
echo 'Sauvegarde restaurée dans la base vide.'
