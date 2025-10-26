#!/bin/bash
# Start both server and client concurrently

# Check for 'concurrently', else print install advice
if ! command -v concurrently >/dev/null 2>&1; then
  echo "[start-all.sh] 'concurrently' not found. Installing it globally..."
  npm install -g concurrently
fi

concurrently "cd server && npm run dev" "cd client && npm run dev" "cd client && npm run storybook"
