#!/bin/bash
# Launch Radio Kiosk browser after backend is ready

# Wait for backend to be available
echo "Waiting for backend server..."
for i in {1..30}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "Backend is ready!"
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
    notify-send "Radio Kiosk" "No browser found!"
    exit 1
fi

# Launch in kiosk mode
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
    http://localhost:3001
