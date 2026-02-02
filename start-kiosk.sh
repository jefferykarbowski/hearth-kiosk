#!/bin/bash
# Radio Kiosk Launcher (Electron version)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Set display
export DISPLAY="${DISPLAY:-:0}"
xhost +local: > /dev/null 2>&1

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    pkill -f "electron ." 2>/dev/null
    pkill -9 -f "node server.js" 2>/dev/null
    exit 0
}
trap cleanup EXIT INT TERM

# Kill existing instances
echo "Stopping existing instances..."
pkill -f "electron ." 2>/dev/null
pkill -9 -f "node server.js" 2>/dev/null
sleep 0.5

# Start librespot for Spotify Connect
if [ -f /snap/librespot-dev/23/bin/librespot ]; then
    pkill -f librespot 2>/dev/null
    /snap/librespot-dev/23/bin/librespot --name "Kitchen Computer" --bitrate 320 &
    echo "Librespot started (Spotify Connect device)"
fi

# Start backend server
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"
node server.js &
cd "$SCRIPT_DIR"
sleep 2

# Wait for backend
for i in {1..10}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Launch Electron kiosk
echo "Launching Electron kiosk..."
cd "$SCRIPT_DIR/electron"
npx electron .

# Electron closed, cleanup
cleanup
