# Sferics

**Earth's oldest radio station.**

A *sferic* is the broadband radio pulse thrown off by a lightning discharge — 100 Hz to 10 kHz, propagating for thousands of kilometres through the gap between the ground and the ionosphere. Point a receiver at it and you hear crackle, static, and the occasional *whistler*: a tone sliding down through the spectrum over several seconds. The planet has been broadcasting since long before anyone was listening.

Sferics is a touchscreen listening device built on the same premise — pulling signal out of the air. Freeform radio, long-form DJ sets, and streaming, on one screen, in one room.

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

---

*"Sound like bacon frying on a griddle."* — the standard description of a sferic heard through a loudspeaker.
