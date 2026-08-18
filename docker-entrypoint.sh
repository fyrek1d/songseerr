#!/bin/sh
set -e

# Ensure the .bin directory exists and create symlink for prisma CLI
mkdir -p node_modules/.bin
if [ ! -f "./node_modules/.bin/prisma" ]; then
  ln -s "../prisma/build/index.js" "./node_modules/.bin/prisma"
fi

# Add node_modules/.bin to PATH so prisma command can be found
export PATH="./node_modules/.bin:$PATH"

echo "SongSeerr starting on port $PORT..."

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

if [ -f /app/prisma/seed.js ]; then
  node /app/prisma/seed.js 2>/dev/null || echo "Seed skipped (may already exist)"
fi

echo "Launching SongSeerr..."
exec "$@"
