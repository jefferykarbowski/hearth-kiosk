# 🔥 Hearth

**The warm center of your smart kitchen.**

A touchscreen kiosk for your kitchen that brings together freeform radio, music streaming, weather, and more — all in one beautiful interface.

## Features

- 📻 **Freeform Radio** — Curated college and community radio stations (WCBN, KFJC, WFMU, KCRW, NTS, and more)
- 🎵 **Spotify Connect** — Your music library with full playback control
- 🎛️ **Mixcloud** — DJ sets and long-form mixes
- 🌤️ **Weather** — Dynamic backgrounds based on current conditions
- 📰 **News Ticker** — Stay informed while you cook
- 🖥️ **Screensaver** — Beautiful ambient mode when idle

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Audio:** Native browser audio + Spotify Web Playback SDK
- **Display:** Electron for kiosk mode

## Quick Start

```bash
# Install dependencies
npm run install:all

# Development mode
npm run dev

# Production (kiosk mode)
./start-kiosk-electron.sh
```

## Configuration

Configure your Hearth at [hearth-at-home.com](https://hearth-at-home.com) (coming soon):
- Choose which tabs to display
- Connect your Spotify account
- Pick your favorite radio stations
- Set your location for weather

## Hardware

Runs great on:
- Microsoft Surface Pro (recommended)
- Raspberry Pi 4+ with touchscreen
- Any tablet/computer with a browser

## Part of the Hearth Ecosystem

- **This repo:** The kiosk application
- **hearth-website:** Dashboard and configuration ([GitHub](https://github.com/jefferykarbowski/hearth-website))

---

Made with 🔥 for kitchens everywhere.
