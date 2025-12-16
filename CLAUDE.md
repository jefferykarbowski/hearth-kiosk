# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based kitchen radio kiosk application with streaming radio stations, Mixcloud/Spotify integration, weather display, and news ticker. Designed for touchscreen kiosk deployment (Surface Pro).

## Commands

### Development
```bash
npm run install:all    # Install all dependencies (root, frontend, backend)
npm run dev            # Start both frontend (port 3000) and backend (port 3001)
npm run dev:frontend   # Frontend only
npm run dev:backend    # Backend only
```

### Production
```bash
npm run build          # Build frontend to frontend/dist/
npm start              # Start backend in production mode (serves built frontend)
```

### Linting
```bash
cd frontend && npm run lint
```

## Architecture

### Monorepo Structure
- **frontend/** - React 19 + Vite + Tailwind CSS
- **backend/** - Node.js/Express with WebSocket server

### Frontend State Management
Three React Context providers wrap the app (defined in `frontend/src/contexts/`):
- `WeatherProvider` - Weather data from OpenWeatherMap API
- `RadioProvider` - Core state: stations, playback, metadata, active tab
- `KioskProvider` - Kiosk mode settings (external app launching)

Access radio state via `useRadio()` hook which provides:
- `stations`, `currentStation`, `isPlaying`, `metadata`, `volume`, `activeTab`
- `playStation()`, `stop()`, `togglePlay()`, `nextStation()`, `prevStation()`

### Backend Services
- **WebSocket server** - Pushes ICY metadata (artist/title) and fetches artwork from iTunes API
- **REST endpoints**: `/api/weather`, `/api/news`, `/api/spotify/*`, `/api/mixcloud/*`, `/api/kiosk/*`
- **OAuth flows**: `/auth/spotify`, `/auth/mixcloud` with callbacks

### Data Flow for Radio Playback
1. Frontend calls `playStation(station)` which plays audio via HTML5 Audio API
2. Frontend sends `{ type: 'play', streamUrl }` to WebSocket
3. Backend connects to HTTP stream using `icy` library for ICY metadata
4. Backend parses metadata, fetches artwork from iTunes, broadcasts to all WS clients
5. Frontend receives `{ type: 'metadata', artist, title, artwork }` and updates UI

### Configuration
Backend config in `backend/config.json`:
- OpenWeatherMap API key and location for weather
- Spotify/Mixcloud OAuth credentials
- News RSS feed URL

### Kiosk Mode Features
Backend can launch native Linux apps (Spotify, Mixcloud, browsers) via `/api/kiosk/launch/:appId` and manage window focus using wmctrl/xdotool.

## Kiosk Deployment (Surface Pro)

### Starting the Kiosk
```bash
./start-kiosk.sh    # Starts backend, devilspie2, and Firefox in kiosk mode
```

### Key Dependencies
- **devilspie2** - Window management for Spotify (install: `sudo apt install devilspie2`)
- **wmctrl** - Window control commands
- **xdotool** - X11 automation

### Spotify Window Management
Config at `~/.config/devilspie2/spotify.lua`:
- Positions Spotify with top margin (160px for header) and bottom margin (70px for news ticker)
- Uses wmctrl for reliable positioning
- Removes window decorations (title bar)

### GNOME Extensions Configuration
The kiosk startup script configures:
- **Hide Top Bar** (`hidetopbar@mathieu.bidon.ca`) - Hides Ubuntu top panel
- **Ubuntu Dock** (`ubuntu-dock@ubuntu.com`) - Disabled for full-width Spotify window

### Volume Sync
Backend syncs volume bidirectionally between system (PipeWire/PulseAudio) and Spotify:
- Kiosk slider changes → Spotify app volume updates via `pactl set-sink-input-volume`
- Spotify volume changes → System volume syncs (polled every 1 second)

### Screensaver
- Activates after 1 hour of no music playback
- Small sun icon in header (top left) to manually trigger
- Displays clock, date, weather with animated background
- Tap anywhere to dismiss

### Cleanup on Exit
`start-kiosk.sh` traps EXIT/INT/TERM signals to:
- Kill Spotify when kiosk closes
- Kill backend server
- Works when Firefox closes, Ctrl+C, or SSH session ends

### Screen Dimensions (Surface Pro)
- Resolution: 2736x1824
- Spotify window: Full width, y=160 to y=1754 (leaving room for header and news ticker)
