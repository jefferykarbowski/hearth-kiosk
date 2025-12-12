#!/bin/bash
# Radio Kiosk Installer
# Run this script to set up desktop shortcut and autostart

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_HOME="$HOME"

echo -e "${GREEN}Radio Kiosk Installer${NC}"
echo "========================="
echo ""

# Make scripts executable
chmod +x "$SCRIPT_DIR/start-kiosk.sh"
chmod +x "$SCRIPT_DIR/launch-kiosk-browser.sh"
chmod +x "$SCRIPT_DIR/launch-browser-kiosk.sh"
echo -e "${GREEN}✓${NC} Made scripts executable"

# Update paths in desktop files
sed -i "s|/home/jeff-karbowski|$USER_HOME|g" "$SCRIPT_DIR/radio-kiosk.desktop"
sed -i "s|/home/jeff-karbowski|$USER_HOME|g" "$SCRIPT_DIR/radio-kiosk-autostart.desktop"
sed -i "s|/home/jeff-karbowski|$USER_HOME|g" "$SCRIPT_DIR/radio-kiosk-backend.service"
sed -i "s|/home/jeff-karbowski|$USER_HOME|g" "$SCRIPT_DIR/launch-kiosk-browser.sh"
echo -e "${GREEN}✓${NC} Updated paths for user: $USER"

# Create desktop shortcut
cp "$SCRIPT_DIR/radio-kiosk.desktop" "$USER_HOME/Desktop/" 2>/dev/null
chmod +x "$USER_HOME/Desktop/radio-kiosk.desktop" 2>/dev/null
# Mark as trusted (GNOME)
gio set "$USER_HOME/Desktop/radio-kiosk.desktop" metadata::trusted true 2>/dev/null
echo -e "${GREEN}✓${NC} Created desktop shortcut"

# Add to applications menu
mkdir -p "$USER_HOME/.local/share/applications"
cp "$SCRIPT_DIR/radio-kiosk.desktop" "$USER_HOME/.local/share/applications/"
echo -e "${GREEN}✓${NC} Added to applications menu"

# Ask about autostart
echo ""
read -p "Enable autostart on boot? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Install systemd service for backend
    echo -e "${YELLOW}Installing backend service (requires sudo)...${NC}"
    sudo cp "$SCRIPT_DIR/radio-kiosk-backend.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable radio-kiosk-backend.service
    sudo systemctl start radio-kiosk-backend.service
    echo -e "${GREEN}✓${NC} Backend service installed and started"
    
    # Install autostart for browser
    mkdir -p "$USER_HOME/.config/autostart"
    cp "$SCRIPT_DIR/radio-kiosk-autostart.desktop" "$USER_HOME/.config/autostart/"
    echo -e "${GREEN}✓${NC} Browser autostart enabled"
    
    echo ""
    echo -e "${GREEN}Autostart enabled!${NC}"
    echo "The kiosk will start automatically when you log in."
else
    echo -e "${YELLOW}Autostart not enabled.${NC}"
    echo "You can run ./install.sh again to enable it later."
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "To start the kiosk now:"
echo "  - Double-click 'Radio Kiosk' on your desktop"
echo "  - Or run: ./start-kiosk.sh"
echo ""
echo "To stop autostart later:"
echo "  sudo systemctl disable radio-kiosk-backend.service"
echo "  rm ~/.config/autostart/radio-kiosk-autostart.desktop"
