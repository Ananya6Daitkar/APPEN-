#!/bin/bash
set -e
echo "Setting up APPEN..."
cp -n .env.example .env || true
docker-compose up -d
echo "⏳ Waiting for PostgreSQL..."
sleep 5
npm install
cd contracts && npm install && cd ..
npx prisma generate
npx prisma migrate dev --name init
echo "APPEN setup complete! Run: npm run dev"
