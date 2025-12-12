#!/bin/bash
# Radio Kiosk Launcher
# This script starts the backend server and launches Firefox in kiosk mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Set display if not set (needed when running from terminal/SSH)
export DISPLAY="${DISPLAY:-:0}"

# Allow local X connections (fixes authorization issues)
xhost +local: > /dev/null 2>&1

# Configuration
BACKEND_PORT=3001

# Kill existing instances for a fresh start
echo "Stopping existing instances..."
pkill -9 -f "node server.js" 2>/dev/null
pkill -9 firefox 2>/dev/null
pkill -9 chromium-browser 2>/dev/null
pkill -9 chromium 2>/dev/null
pkill -9 wvkbd 2>/dev/null
pkill -9 onboard 2>/dev/null
sleep 0.5

# Disable GNOME's built-in keyboard (we use onboard)
gsettings set org.gnome.desktop.a11y.applications screen-keyboard-enabled false 2>/dev/null

# Start onboard virtual keyboard (works on X11)
if command -v onboard &> /dev/null; then
    gsettings set org.onboard.window force-to-top true 2>/dev/null
    gsettings set org.onboard.window docking-enabled true 2>/dev/null
    gsettings set org.onboard.window docking-edge bottom 2>/dev/null
    gsettings set org.onboard.auto-show enabled true 2>/dev/null
    onboard &
    echo "Virtual keyboard (onboard) started"
fi

# Start backend server
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"
node server.js &
cd "$SCRIPT_DIR"
sleep 2

# Wait for backend to be ready
for i in {1..10}; do
    if curl -s http://localhost:$BACKEND_PORT > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Use Firefox for better virtual keyboard support
if command -v firefox &> /dev/null; then
    echo "Launching Firefox in kiosk mode..."
    exec firefox \
        --kiosk \
        http://localhost:$BACKEND_PORT
else
    # Fallback to Chromium
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

    exec $BROWSER \
        --noerrdialogs \
        --disable-infobars \
        --disable-translate \
        --no-first-run \
        --start-fullscreen \
        --disable-features=TranslateUI \
        --disable-session-crashed-bubble \
        --autoplay-policy=no-user-gesture-required \
        --enable-features=VirtualKeyboard \
        --force-renderer-accessibility \
        http://localhost:$BACKEND_PORT
fi
