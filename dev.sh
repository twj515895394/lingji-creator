#!/bin/bash

# ==============================================================================
# Electron Dev Restart Script for Mac
# Automatically detects and kills running Vite/Electron dev processes, then restarts.
# ==============================================================================

# Define ports and keywords
VITE_PORT=5173
MCP_PORT=19820
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 [lingji-cut] Preparing to restart dev server..."

# 1. Find and kill processes on dev ports (Vite 5173 & MCP 19820)
for PORT in "$VITE_PORT" "$MCP_PORT"; do
  if [ -n "$PORT" ]; then
    PORT_PID=$(lsof -t -i:"$PORT" 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
      echo "🚨 Found process on port $PORT (PID: $PORT_PID). Killing it..."
      kill -9 $PORT_PID 2>/dev/null
    fi
  fi
done

# 2. Find and kill other dev process runners by command name
# Filters out the current script PID ($$) to prevent self-killing
DEV_PIDS=$(pgrep -f "electron-vite|dev-windows-utf8.cjs" | grep -v "^$$$")
if [ -n "$DEV_PIDS" ]; then
  echo "🚨 Found running dev script/runner (PIDs: $(echo $DEV_PIDS | tr '\n' ' ')). Killing them..."
  echo "$DEV_PIDS" | xargs kill -9 2>/dev/null
fi

# 3. Find and kill running dev Electron applications
ELECTRON_PIDS=$(pgrep -f "Electron.*--type=" | grep -v "^$$$")
if [ -n "$ELECTRON_PIDS" ]; then
  echo "🚨 Found running helper Electron processes. Cleaning up..."
  echo "$ELECTRON_PIDS" | xargs kill -9 2>/dev/null
fi

# Double check using workspace path search for any lingering Node/Electron dev processes
LINGERING_PIDS=$(ps aux | grep -i "lingji-creator" | grep -E "node|Electron" | grep -v "grep" | awk '{print $2}' | grep -v "^$$$")
if [ -n "$LINGERING_PIDS" ]; then
  echo "🚨 Found lingering workspace processes. Killing PIDs: $(echo $LINGERING_PIDS | tr '\n' ' ')..."
  echo "$LINGERING_PIDS" | xargs kill -9 2>/dev/null
fi

echo "✨ All existing dev processes cleared."
echo "🚀 Starting development environment (npm run dev)..."
echo "------------------------------------------------------------"

# Execute npm run dev
cd "$PROJECT_DIR" || exit 1
npm run dev
