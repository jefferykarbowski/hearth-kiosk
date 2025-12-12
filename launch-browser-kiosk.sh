#!/bin/bash
# Simple Chromium kiosk launcher (assumes server is already running)
# Usage: ./launch-browser-kiosk.sh [URL]

URL="${1:-http://localhost:3001}"

# Find available browser
BROWSER=""
if command -v chromium-browser &> /dev/null; then
    BROWSER="chromium-browser"
elif command -v chromium &> /dev/null; then
    BROWSER="chromium"
elif command -v google-chrome &> /dev/null; then
    BROWSER="google-chrome"
elif command -v google-chrome-stable &> /dev/null; then
    BROWSER="google-chrome-stable"
fi

if [ -z "$BROWSER" ]; then
    echo "Error: Chromium or Chrome not found"
    echo "Install with: sudo apt install chromium-browser"
    exit 1
fi

echo "Launching $BROWSER in kiosk mode..."
echo "URL: $URL"
echo ""
echo "To exit: Press Alt+F4 or Ctrl+Alt+Delete"
echo ""

exec $BROWSER \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-translate \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-features=TranslateUI \
    --disable-session-crashed-bubble \
    --autoplay-policy=no-user-gesture-required \
    --check-for-update-interval=31536000 \
    --disable-background-networking \
    --disable-component-update \
    --disable-default-apps \
    --disable-extensions \
    --disable-hang-monitor \
    --disable-popup-blocking \
    --disable-prompt-on-repost \
    --disable-sync \
    --password-store=basic \
    "$URL"
