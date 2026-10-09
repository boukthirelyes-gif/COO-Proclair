#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if docker container inspect proclair-postgres >/dev/null 2>&1; then
  docker start proclair-postgres >/dev/null
else
  docker run -d --name proclair-postgres --restart unless-stopped \
    -p 127.0.0.1:5433:5432 \
    -e POSTGRES_USER=proclair -e POSTGRES_PASSWORD=proclair_local_dev -e POSTGRES_DB=proclair \
    -v proclair-postgres-data:/var/lib/postgresql/data \
    postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24 >/dev/null
fi
for attempt in {1..30}; do
  if docker exec proclair-postgres pg_isready -U proclair -d proclair >/dev/null; then
    echo 'PostgreSQL prêt (port local 5433).'
    exit 0
  fi
  sleep 1
done
echo 'PostgreSQL indisponible après 30 secondes.' >&2
exit 1
