#!/bin/bash
# Test script for window management - run this from your desktop session

echo "=== Testing Window Management ==="
echo ""

# Check display
if [ -z "$DISPLAY" ]; then
    echo "ERROR: No DISPLAY set. Are you running from a graphical session?"
    exit 1
fi

# Check session type
echo "Session type: ${XDG_SESSION_TYPE:-unknown}"
if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
    echo "WARNING: You're on Wayland. Window management may not work!"
    echo "Please log out and select 'Ubuntu on Xorg' at login screen."
    echo ""
fi

# Test wmctrl
echo ""
echo "Testing wmctrl..."
if wmctrl -l 2>/dev/null; then
    echo "✓ wmctrl is working"
else
    echo "✗ wmctrl failed"
fi

# Test xdotool
echo ""
echo "Testing xdotool..."
if xdotool getactivewindow 2>/dev/null; then
    echo "✓ xdotool is working"
else
    echo "✗ xdotool failed"
fi

# Get screen size
echo ""
echo "Screen dimensions:"
xdpyinfo 2>/dev/null | grep dimensions || echo "Could not get dimensions"

echo ""
echo "=== Done ==="
echo ""
echo "If tests passed, the Spotify window management should work!"
echo "If on Wayland, please switch to X11 (Ubuntu on Xorg) at login."
