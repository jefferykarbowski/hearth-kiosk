# Kitchen Radio Kiosk (React Edition)

A modern React-based kitchen radio player with streaming radio stations, Mixcloud, Spotify, weather, and news ticker.

## Project Structure

```
kitchen-radio-kiosk-react/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── navigation/  # Tab navigation
│   │   │   ├── player/      # Now playing card
│   │   │   ├── stations/    # Station grid
│   │   │   └── widgets/     # Weather, news ticker
│   │   ├── contexts/        # RadioContext (state management)
│   │   └── App.jsx          # Main application
│   └── ...
├── backend/           # Node.js + Express + WebSocket
│   ├── server.js      # API & WebSocket server
│   └── config.json    # Weather/news API config
└── package.json       # Root scripts
```

## Quick Start

### Development

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure APIs (optional):**
   Edit `backend/config.json` and add your OpenWeatherMap API key.

3. **Start development servers:**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

### Production Build

```bash
npm run build
npm start
```

## Adding 21st.dev Magic Components

The placeholder components in `frontend/src/components/` are designed to be replaced with 21st.dev Magic-generated components.

**Example prompts to use in Claude Code with Magic MCP:**

### Navigation
```
"A horizontal pill-style tab navigation with Radio, Mixcloud, and 
Spotify tabs. Modern, minimal, with smooth animated indicator."
```

### Now Playing Card
```
"A music player card with album artwork, artist name, song title, 
animated equalizer bars, and play/pause button. Glassmorphism style 
with blur backdrop."
```

### Station Grid
```
"A grid of radio station cards with logo, station name, genre tag, 
and 'now playing' indicator. Dark theme with subtle hover effects."
```

### Weather Badge
```
"A weather badge showing temperature, icon, and location. 
Compact, fits in a navbar."
```

## Integrating Magic Components

1. Generate component with Magic MCP
2. Copy the component code
3. Replace the corresponding file in `frontend/src/components/`
4. Update imports if needed
5. Connect to RadioContext using the `useRadio()` hook

**Available from useRadio():**
- `stations` - Array of radio stations
- `currentStation` - Currently selected station
- `isPlaying` - Boolean playback state
- `metadata` - `{ artist, title, artwork }`
- `volume` / `setVolume()` - Volume control (0-1)
- `activeTab` / `setActiveTab()` - Navigation state
- `playStation(station)` - Start playing a station
- `togglePlay()` - Play/pause
- `nextStation()` / `prevStation()` - Navigate stations
- `stop()` - Stop playback

## API Endpoints

- `GET /api/weather` - Current weather data
- `GET /api/news` - News headlines from RSS

## WebSocket Events

**From Server:**
- `{ type: 'metadata', artist, title, artwork }` - Track info update
- `{ type: 'state', metadata }` - Initial state

**To Server:**
- `{ type: 'play', streamUrl }` - Start ICY metadata tracking
- `{ type: 'stop' }` - Stop tracking

## Kiosk Mode (Surface Pro)

See INSTALL.md for full Surface Pro kiosk setup instructions.

```bash
# Build for production
npm run build

# Set up systemd service (see INSTALL.md)
sudo systemctl enable kitchen-radio
sudo reboot
```
