#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running Render build..."

if [[ "${DATABASE_URL:-}" == postgresql:* ]] || [[ "${DATABASE_URL:-}" == postgres:* ]]; then
  echo "PostgreSQL detected — switching Prisma provider for production."
  sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  rm -f prisma/schema.prisma.bak
  npx prisma generate
  npx prisma db push --accept-data-loss
  npx tsx prisma/seed.ts
else
  echo "Non-Postgres DATABASE_URL — using repo schema as-is."
  npx prisma generate
  npx prisma migrate deploy
fi

npm run build

echo "Render build complete."
