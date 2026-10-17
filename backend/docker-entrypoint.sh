#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding demo data..."
  node dist/seed/seed.js
fi

exec node dist/main.js
