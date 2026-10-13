#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
backup_file="${1:?Indiquez une sauvegarde .dump}"
if [[ ! -f "$backup_file" ]]; then echo 'Sauvegarde introuvable.' >&2; exit 1; fi
restore_database="${PROCLAIR_RESTORE_DATABASE:-proclair}"
if [[ ! "$restore_database" =~ ^[A-Za-z0-9_]{1,63}$ ]]; then echo 'Nom de base invalide.' >&2; exit 1; fi
table_count="$(docker exec proclair-postgres psql -U proclair -d "$restore_database" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")"
if [[ "$table_count" != '0' ]]; then echo 'Restauration refusée : base non vide. Aucune donnée remplacée.' >&2; exit 1; fi
docker exec -i proclair-postgres pg_restore -U proclair -d "$restore_database" --single-transaction --exit-on-error --no-owner < "$backup_file"
echo 'Sauvegarde restaurée dans la base vide.'
