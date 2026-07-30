# Design

<!-- impeccable:design-schema 1 -->

## The world

**Twentieth-century graphic notation**, as practised by Xenakis (UPIC), Cardew (*Treatise*), and Rainer Wehinger's 1970 colour realization of Ligeti's *Artikulation*. Sound rendered as drawn marks on a dark field: clustered dots, combs, arcs, blocks, and threads, each with a fixed meaning and a fixed colour.

This is not decoration borrowed from the era. It is the operating grammar:

- A **stave** is a listening source. Radio, Mixcloud, Spotify, and any future service are horizontal staves that can be reordered and switched off — the score decides what plays and in what order.
- A **glyph** is a station or a show. Every entry carries a drawn mark, not a generic tile.
- The **realization** is the now-playing state: the active source's mark, drawn large and moving.
- **Annotations** are secondary reading surfaces (news, weather) — dense, printed, marginal.

UPIC earns the touchscreen: Xenakis's machine was a drawing surface that produced sound. This device is a drawing surface that selects it.

## Colour

Strategy: **full palette, four named roles.** Colour is identity, never ornament — each source owns one, and that ownership is how the score stays readable when staves are reordered.

| Token | Value | Role |
|---|---|---|
| `--ink` | `#07080a` | Ground. The score field. |
| `--ink-2` | `#0e1015` | Raised panel. |
| `--ink-3` | `#161922` | Hairline seam / inactive stroke. |
| `--chalk` | `#e8e6df` | Primary mark. Warm, printed — never pure white. |
| `--chalk-2` | `#9a9a94` | Secondary mark. |
| `--sig-green` | `#3ff5a8` | **Radio.** The carrier signal. |
| `--sig-magenta` | `#ff3d8b` | **Mixcloud.** |
| `--sig-amber` | `#ffb03a` | **Spotify.** |
| `--sig-cyan` | `#49d4ff` | **Weather / atmospheric data.** |
| `--sig-violet` | `#a77bff` | Reserved: next source (Apple Music). |

Dark ground is forced by the scene, not by taste: this screen is furniture in a room that is dark half the time and never fully off.

`--chalk` is deliberately off-white. A pure `#fff` mark on `#07080a` glares at arm's length in a dark kitchen.

## Type

- **Display / UI:** `Archivo` — a grotesque with real width range, set in caps with wide tracking for stave labels, echoing engraved panel legends.
- **Data:** `JetBrains Mono` — timecodes, frequencies, counts. Tabular figures required.
- Self-hosted in `frontend/public/fonts/`. **The device must render correctly with no network**, so a remote font link is a defect, not a convenience.
- Minimum body size 15 px; stave labels 13 px caps with `0.14em` tracking. Nothing below 12 px anywhere.

## Marks

Drawn in SVG in the score's own grammar. Never icon-font glyphs, never generic rounded-rect logo tiles.

- `comb` — vertical rule cluster: broadband, static, radio.
- `arc` — descending curve: the whistler. Reserved for the now-playing realization.
- `block` — solid bar: a sustained mix or set.
- `stipple` — dot field: noise, idle, the screensaver.

## Rules

1. **Every source is data.** Sources render from an array with `id`, `colour`, `enabled`, `order`. A hardcoded tab is a bug.
2. **Hairline seams, never shadows.** Panels divide with 1 px `--ink-3` rules. No drop shadows, no glow, no glassmorphism blur as a surface treatment.
3. **Colour identifies, state animates.** A source's colour never changes; its *motion* indicates playing versus idle.
4. **Touch targets ≥ 44 px**, transport controls ≥ 64 px. Assume wet hands.
5. **Two fixed layouts.** 1024×600 (A133) and 2736×1824 (Surface Pro). Design for the small one; let the large one breathe. Nothing may depend on hover.
6. **Motion is drawing.** Marks appear by being drawn (`stroke-dashoffset`), not by fading or sliding. One orchestrated behaviour, not scattered transitions. All motion respects `prefers-reduced-motion`.
7. **Idle is designed.** The screensaver is a score at rest, not a blank screen.

## Conversion status

The world is not yet applied to the whole surface. This section states exactly
where it is and is not, so the document never claims more than the build
delivers.

**Converted** — `App.jsx` shell, `Navigation` (stave rail), `NowPlaying`,
`StationGrid`, `Marks`, `NewsPanel`, `WeatherPanel`, `SourcesPanel`,
`SplashScreen`, `Screensaver`, `NewsTicker`, `FloatingHomeButton`.

**Still carrying the pre-redesign look** — `MixcloudTab`, `SpotifyTab`,
`KioskSettings`, `BluetoothManager`, `VolumeControl`, `WeatherBadge`,
`SpotifyOverlay`. These keep rounded cards, `bg-white/10`, indigo accents, and
lucide glyphs.

Two consequences worth naming:

1. Tapping Mixcloud or Spotify leaves the score. The stave rail promises a
   system the destination does not keep.
2. `MixcloudTab` and `SpotifyTab` hide controls behind `group-hover`. **On a
   touch-only device hover never fires**, so those play buttons are unreachable
   on the target hardware. This is a functional defect, not only a stylistic
   one, and it is the highest-priority remaining work.

## Prohibitions

- No indigo/purple gradient (the incumbent's signature — this world's anti-reference).
- No `backdrop-filter` glass panels.
- No emoji in the interface.
- No pure `#ffffff` or pure `#000000`.
