#!/bin/bash

# Etherana SX Standalone Launcher
# This script starts the application on port 1414

echo "🌟 Starting Etherana SX..."

# Load NVM if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure we use the correct Node version
nvm use 22.22.0 >/dev/null 2>&1

# Check if .next directory exists
if [ ! -d ".next" ]; then
    echo "📦 Production build not found. Building now..."
    npm run build
fi

echo "🚀 App is running at http://localhost:1414"
npm run start -- --port 1414
