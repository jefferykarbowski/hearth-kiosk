# LyraPod

**Freeform radio, on one screen, in one room.**

A touchscreen listening device for college and community radio, long-form DJ sets, and streaming. Built to sit on a counter and stay on: one glance, one tap, no phone.

135 curated stations, every stream verified.

## Features

- **Freeform Radio** — College and community stations: WCBN, KFJC, KALX, WFMU, KCRW, NTS
- **Mixcloud** — DJ sets and long-form mixes
- **Spotify Connect** — Full playback control
- **Weather** — Dynamic backgrounds driven by current conditions
- **News Ticker** — Headlines while you cook
- **Screensaver** — Ambient mode when idle

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Audio:** Native browser audio + Spotify Web Playback SDK
- **Display:** Electron for kiosk mode

## Quick Start

```bash
npm run install:all
npm run dev
```

Production kiosk mode:

```bash
./start-kiosk-electron.sh
```

## Configuration

Copy `backend/config.example.json` to `backend/config.json` and fill in your keys, or supply them as environment variables — `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `MIXCLOUD_CLIENT_ID`, `MIXCLOUD_CLIENT_SECRET`, `WEATHER_API_KEY`. Environment variables take precedence.

`backend/config.json` is not tracked in git. Never commit it.

## Hardware

- Microsoft Surface Pro (current reference device)
- Allwinner A133 tablet, 7" 1024x600 (target production hardware)
- Raspberry Pi 4+ with touchscreen

## Repository Layout

This repo holds the kiosk application. The cloud dashboard and the Android/AOSP build live alongside it as the monorepo consolidation lands.

## Station data

`data/` holds the reconstructed SoundTap directory — 622 non-commercial stations recovered from the Internet Archive and joined to Radio Browser for current streams. `scripts/` holds the harvest, match, verify and artwork pipeline; streams rot, so re-run `verify-all-streams.py` and `repair-streams.py` periodically.
