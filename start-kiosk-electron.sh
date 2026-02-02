#!/bin/bash
# Kitchen Radio Kiosk Launcher (Electron Version)
# Starts the backend server and Electron kiosk app

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Set display if not set
export DISPLAY="${DISPLAY:-:0}"

# Configuration
BACKEND_PORT=3001

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    pkill -9 spotify 2>/dev/null
    pkill -9 -f "node server.js" 2>/dev/null
    pkill -9 electron 2>/dev/null
    exit 0
}

# Trap signals
trap cleanup EXIT INT TERM

# Kill existing instances
echo "Stopping existing instances..."
pkill -9 -f "node server.js" 2>/dev/null
pkill -9 electron 2>/dev/null
sleep 1

# Start devilspie2 for Spotify window management
if command -v devilspie2 &> /dev/null; then
    pkill devilspie2 2>/dev/null
    devilspie2 &
    echo "devilspie2 started for window management"
fi

# Start backend
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"
node server.js &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    sleep 1
done

# Start Electron kiosk
echo "Launching Electron kiosk..."
cd "$SCRIPT_DIR/electron"
npm start

# npm start exited, cleanup
cleanup
