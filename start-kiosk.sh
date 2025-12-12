#!/bin/bash
# Radio Kiosk Launcher
# This script starts the backend server and launches Chromium in kiosk mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
BACKEND_PORT=3001

# Check if already running
if pgrep -f "node server.js" > /dev/null; then
    echo "Backend already running"
else
    echo "Starting backend server..."
    cd "$SCRIPT_DIR/backend"
    node server.js &
    cd "$SCRIPT_DIR"
    sleep 2
fi

# Wait for backend to be ready
for i in {1..10}; do
    if curl -s http://localhost:$BACKEND_PORT > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Find browser
BROWSER=""
if command -v chromium-browser &> /dev/null; then
    BROWSER="chromium-browser"
elif command -v chromium &> /dev/null; then
    BROWSER="chromium"
elif command -v google-chrome &> /dev/null; then
    BROWSER="google-chrome"
fi

if [ -z "$BROWSER" ]; then
    notify-send "Radio Kiosk" "No browser found!" 2>/dev/null
    echo "Error: No browser found"
    exit 1
fi

# Launch browser in kiosk mode
exec $BROWSER \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-translate \
    --no-first-run \
    --start-fullscreen \
    --disable-features=TranslateUI \
    --disable-session-crashed-bubble \
    --autoplay-policy=no-user-gesture-required \
    --enable-features=VirtualKeyboard \
    http://localhost:$BACKEND_PORT
