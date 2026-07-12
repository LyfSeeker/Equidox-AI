#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Waiting for database..."
  i=0
  until node -e "import('pg').then(({default:pg})=>new pg.Client(process.env.DATABASE_URL).connect().then(c=>c.end())).catch(()=>process.exit(1))" 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
      echo "Database not ready after 30 attempts"
      break
    fi
    sleep 1
  done

  echo "Running database migrations..."
  node src/db/migrate.js
fi

exec "$@"
