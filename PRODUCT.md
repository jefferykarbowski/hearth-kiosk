# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the household member cooking, cleaning, or passing through the kitchen. They interact standing, at arm's length, often with wet or occupied hands, in glances rather than sessions. Input is touch only — the reference device currently has **no working keyboard**, and the shipping hardware will have none at all.

The buying audience is deliberately narrower than the using audience: **avant-garde audiophiles** — people who follow freeform and community radio (WFMU, KFJC, NTS, KCRW), collect long-form DJ sets, and care what is playing. *(Inferred from the owner's stated positioning on 2026-07-30; the product was explicitly redirected away from a domestic "smart kitchen" framing.)*

## Product Purpose

A dedicated, always-on listening device for one room. It surfaces freeform radio, long-form mixes, and streaming on a single touchscreen so that choosing something to listen to takes one glance and one tap, without reaching for a phone.

Success is that the screen is the fastest path to sound in that room, and that it stays on and playing.

## Positioning

Sferics is a *listening instrument*, not a kitchen dashboard. Its center of gravity is freeform and community radio — the unpredictable, human-curated end of the spectrum — with commercial streaming as a supporting source rather than the main event. A smart display from a large platform cannot credibly carry that catalog or that point of view.

The name is literal: a **sferic** is the broadband radio pulse emitted by a lightning discharge (100 Hz–10 kHz), propagating through the Earth–ionosphere waveguide. Related phenomena, used as product vocabulary: **whistlers** (tones descending over seconds) and the **dawn chorus**.

## Operating Context

- Mounted or propped in a kitchen; viewed from roughly 0.5–1.5 m while standing.
- Runs unattended for days. Reference device uptime at audit was 46 hours, then 2 days.
- Audio leaves via Bluetooth speakers (an HK Onyx Studio 8 and a WONDERBOOM are paired) or the local output.
- Reference hardware: Microsoft Surface Pro, Ubuntu 24.04, 2736×1824, Electron kiosk + `spotifyd`.
- Target production hardware: Allwinner A133 tablet, 2 GB RAM, 7" **1024×600**, sourced ~$20–30/unit. The design must survive both that resolution and the Surface Pro's.
- A companion cloud dashboard is planned so the device can be configured remotely; accounts will be required.

## Capabilities and Constraints

Confirmed working:
- ~47 curated radio stations; ICY metadata parsed server-side and pushed over WebSocket, with artwork resolved from iTunes.
- Mixcloud: history, favorites, playlists, feed, follows.
- Spotify via OAuth + `spotifyd`; weather (OpenWeatherMap); an RSS news ticker; Bluetooth device management; system volume.

Constraints future work must respect:
- **Spotify's Web Playback SDK does not work in an Android WebView**, so the A133 build needs Spotify Connect or the native Android SDK.
- `pactl` volume and `wmctrl`/`devilspie2` window management are x86-Linux only and have no A133 equivalent.
- 2 GB RAM on target hardware; the current JS bundle is already 535 kB (167 kB gzipped).
- Touch-only. Any text entry needs the in-app virtual keyboard.

Undecided:
- Whether Apple Music and Amazon Music arrive via official SDKs or link-outs. The owner has asked that **sources be toggleable on/off and reorderable**, so the architecture must treat sources as data, not hardcoded tabs.

## Brand Commitments

- Product name is **Sferics**, chosen 2026-07-30, replacing "Hearth" — which was rejected as too domestic. Do not reintroduce hearth/kitchen/warmth framing.
- Domains identified as available at decision time: `sferics.fm`, `sferics.audio`, `playsferics.com`. **Not yet registered.**
- Owner's stated direction for the interface: *psychedelic, avant-garde, instrumentation-derived*. Explicitly "not housewives."
- Generated splash artwork on hand at `frontend/public/brand/` (`splash-01.png`, `splash-02.png`).

## Evidence on Hand

- A live reference device on the LAN with real listening history — genuine Mixcloud favorites, playlists, and follows are queryable from it.
- Real station list with call signs and logos in the repository.
- **Absences that must not be fabricated:** no customers, no sales, no pricing, no benchmarks, no press. The hardware product does not exist yet; the A133 build is a scaffold. Do not present the cloud dashboard as shipping.

## Product Principles

1. **One glance, one tap.** Anything that takes more than a tap from idle to sound is a design failure.
2. **Radio leads.** Freeform and community stations are the front door; commercial streaming is a peer, never the default.
3. **Sources are data.** Every listening source is a configurable, reorderable entry — never a hardcoded tab.
4. **Legible while moving.** Type and targets are sized for a standing glance across a room, not a seated reader.
5. **It never goes blank.** The device is always-on furniture; idle is a designed state, not an absence.

## Accessibility & Inclusion

- Touch-only operation with **no keyboard**; every action must be reachable by touch.
- Touch targets sized for wet or occupied hands — minimum 44 px, larger on primary transport controls.
- Read at distance in variable kitchen lighting, so contrast must hold in bright daylight and in a dark room.
