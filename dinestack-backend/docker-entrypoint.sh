#!/bin/sh
set -e

# Run prisma migrations to bring the database up to date
echo "Starting TapTable DineStack Backend Startup Sequence..."
echo "Running database migration deploy..."
npx prisma migrate deploy

echo "Starting production web server..."
exec npm start
