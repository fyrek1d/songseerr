#!/bin/sh
set -e

echo "MediaSeer starting on port $PORT..."

if [ -f /app/prisma/seed.js ]; then
  node /app/prisma/seed.js 2>/dev/null || echo "Seed skipped (may already exist)"
fi

echo "Launching MediaSeer..."
exec "$@"