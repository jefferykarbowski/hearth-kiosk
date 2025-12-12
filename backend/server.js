import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fetch from 'node-fetch';
import icy from 'icy';
import { parseString } from 'xml2js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Load config
let config = {};
try {
  const configPath = path.join(__dirname, 'config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('Error loading config:', e);
}

// Middleware
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback to index.html for SPA routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// State
let currentMetadata = { artist: '', title: '', artwork: null };
let currentStationUrl = null;
let icyConnection = null;
let metadataInterval = null;

// Broadcast to all WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// Clean up search terms for better iTunes matches
function cleanSearchTerm(str) {
  if (!str) return '';
  return str
    // Remove show/DJ info patterns
    .replace(/\s+on\s+.*/i, '')           // "on Show Name"
    .replace(/\s+with\s+.*/i, '')         // "with DJ Name"
    .replace(/\s+from\s+.*/i, '')         // "from Album"
    .replace(/\([^)]*edit[^)]*\)/gi, '')  // "(DJ Edit)" etc
    .replace(/\([^)]*remix[^)]*\)/gi, '') // "(Remix)" keep for search
    .replace(/\([^)]*mix[^)]*\)/gi, '')   // "(Mix)"
    .replace(/\([^)]*live[^)]*\)/gi, '')  // "(Live)"
    .replace(/\[[^\]]*\]/g, '')           // [anything in brackets]
    .replace(/["']/g, '')                 // quotes
    .replace(/\s+/g, ' ')                 // multiple spaces
    .trim();
}

// Fetch artwork from iTunes
async function fetchArtwork(artist, title) {
  if (!artist && !title) return null;
  
  // Clean up the search terms
  const cleanArtist = cleanSearchTerm(artist);
  const cleanTitle = cleanSearchTerm(title);
  
  // Try different search strategies
  const searches = [
    `${cleanArtist} ${cleanTitle}`,           // Full search
    cleanArtist ? `${cleanArtist}` : null,    // Just artist
    cleanTitle ? `${cleanTitle}` : null,      // Just title
  ].filter(Boolean);

  for (const searchTerm of searches) {
    try {
      const query = encodeURIComponent(searchTerm.substring(0, 100)); // iTunes has query limits
      const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=5`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Try to find best match
        const artwork = data.results[0].artworkUrl100?.replace('100x100', '600x600');
        if (artwork) {
          console.log('Artwork found for:', searchTerm);
          return artwork;
        }
      }
    } catch (e) {
      console.error('iTunes artwork fetch error:', e.message);
    }
  }
  
  console.log('No artwork found for:', cleanArtist, '-', cleanTitle);
  return null;
}

// Parse ICY metadata string
function parseMetadata(metaString) {
  if (!metaString) return null;
  
  let artist = '';
  let title = metaString;
  
  // Common formats:
  // "Artist - Title"
  // "Title by Artist on Show"
  // "Artist: Title"
  // "\"Title\" by Artist"
  
  // Handle quoted titles first: "Title" by Artist
  const quotedMatch = metaString.match(/^["'](.+?)["']\s+by\s+(.+)/i);
  if (quotedMatch) {
    title = quotedMatch[1].trim();
    artist = quotedMatch[2].trim();
  }
  // Handle "Title by Artist on Show" format
  else if (metaString.toLowerCase().includes(' by ')) {
    const parts = metaString.split(/\s+by\s+/i);
    title = parts[0].trim();
    artist = parts[1]?.trim() || '';
  }
  // Handle "Artist - Title" format
  else if (metaString.includes(' - ')) {
    const parts = metaString.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }
  // Handle "Artist: Title" format
  else if (metaString.includes(': ')) {
    const parts = metaString.split(': ');
    artist = parts[0].trim();
    title = parts.slice(1).join(': ').trim();
  }
  
  // Clean up artist - remove "on ShowName" suffix
  artist = artist.replace(/\s+on\s+.*/i, '').trim();
  
  console.log('Parsed metadata:', { artist, title, raw: metaString });
  
  return { artist, title };
}

// Connect to stream for ICY metadata
function connectToStream(streamUrl) {
  // Cleanup existing connection
  if (icyConnection) {
    try {
      icyConnection.destroy();
    } catch (e) {}
    icyConnection = null;
  }
  if (metadataInterval) {
    clearInterval(metadataInterval);
    metadataInterval = null;
  }

  if (!streamUrl) return;
  currentStationUrl = streamUrl;
  
  console.log('Connecting to stream for metadata:', streamUrl);

  // ICY only works with HTTP streams
  if (streamUrl.startsWith('https://')) {
    console.log('HTTPS stream - ICY metadata not available, trying alternative methods');
    // For HTTPS streams, we can't get ICY metadata directly
    // Could implement alternative methods here (like checking station's API)
    return;
  }

  icy.get(streamUrl, (res) => {
    icyConnection = res;
    console.log('ICY connection established');
    
    res.on('metadata', async (metadata) => {
      try {
        const icyData = icy.parse(metadata);
        const streamTitle = icyData.StreamTitle || '';
        console.log('ICY metadata received:', streamTitle);
        
        const parsed = parseMetadata(streamTitle);
        if (parsed && (parsed.artist !== currentMetadata.artist || parsed.title !== currentMetadata.title)) {
          currentMetadata = parsed;
          console.log('Fetching artwork for:', parsed.artist, '-', parsed.title);
          currentMetadata.artwork = await fetchArtwork(parsed.artist, parsed.title);
          console.log('Broadcasting metadata update');
          broadcast({ type: 'metadata', ...currentMetadata });
        }
      } catch (e) {
        console.error('Metadata parse error:', e.message);
      }
    });

    res.on('error', (err) => {
      console.error('ICY stream error:', err.message);
    });

    res.on('end', () => {
      console.log('ICY stream ended');
      // Attempt reconnect after 5 seconds
      setTimeout(() => {
        if (currentStationUrl === streamUrl) {
          connectToStream(streamUrl);
        }
      }, 5000);
    });

    // Consume stream data (required for metadata events)
    res.resume();
  }).on('error', (err) => {
    console.error('ICY connection error:', err.message);
  });
}

// WebSocket handlers
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send current state
  ws.send(JSON.stringify({ type: 'state', metadata: currentMetadata }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message received:', data.type);
      
      if (data.type === 'play' && data.streamUrl) {
        connectToStream(data.streamUrl);
      } else if (data.type === 'stop') {
        if (icyConnection) {
          try {
            icyConnection.destroy();
          } catch (e) {}
          icyConnection = null;
        }
        if (metadataInterval) {
          clearInterval(metadataInterval);
          metadataInterval = null;
        }
        currentStationUrl = null;
        currentMetadata = { artist: '', title: '', artwork: null };
        broadcast({ type: 'metadata', ...currentMetadata });
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Weather API
app.get('/api/weather', async (req, res) => {
  if (!config.weather?.apiKey) {
    return res.status(503).json({ error: 'Weather not configured' });
  }

  try {
    const { apiKey, zipCode, country, units } = config.weather;
    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zipCode},${country}&units=${units}&appid=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.cod && data.cod !== 200) {
      console.error('Weather API error:', data.message);
      return res.status(data.cod).json({ error: data.message });
    }
    
    if (!data.main || !data.weather) {
      console.error('Invalid weather API response');
      return res.status(500).json({ error: 'Invalid weather data' });
    }

    res.json({
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name
    });
  } catch (e) {
    console.error('Weather fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// News API (RSS)
app.get('/api/news', async (req, res) => {
  const rssUrl = config.news?.rssUrl || 'https://feeds.npr.org/1001/rss.xml';
  
  try {
    const response = await fetch(rssUrl);
    const xml = await response.text();
    
    parseString(xml, (err, result) => {
      if (err) {
        console.error('RSS parse error:', err);
        return res.status(500).json({ error: 'Failed to parse news' });
      }
      
      const items = result?.rss?.channel?.[0]?.item || [];
      const headlines = items.slice(0, 10).map(item => ({
        title: item.title?.[0] || '',
        link: item.link?.[0] || ''
      }));
      
      res.json({ headlines });
    });
  } catch (e) {
    console.error('News fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Spotify OAuth & API
let spotifyTokens = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

// Check if Spotify is authenticated
app.get('/api/spotify/status', (req, res) => {
  const isAuthenticated = spotifyTokens.accessToken && spotifyTokens.expiresAt > Date.now();
  res.json({ authenticated: isAuthenticated });
});

// Start Spotify OAuth flow
app.get('/auth/spotify', (req, res) => {
  if (!config.spotify?.clientId) {
    return res.status(503).json({ error: 'Spotify not configured' });
  }

  const scopes = [
    'user-read-recently-played',
    'user-read-playback-state',
    'user-top-read',
    'playlist-read-private'
  ].join(' ');

  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${config.spotify.clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(config.spotify.redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}`;

  res.redirect(authUrl);
});

// Spotify OAuth callback
app.get('/callback/spotify', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('http://localhost:3000/?spotify_error=' + error);
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          config.spotify.clientId + ':' + config.spotify.clientSecret
        ).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.spotify.redirectUri
      })
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('Spotify token error:', tokens);
      return res.redirect('http://localhost:3000/?spotify_error=' + tokens.error);
    }

    spotifyTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000)
    };

    console.log('Spotify authenticated successfully');
    res.redirect('http://localhost:3000/?spotify_success=true');
  } catch (e) {
    console.error('Spotify callback error:', e);
    res.redirect('http://localhost:3000/?spotify_error=callback_failed');
  }
});

// Refresh Spotify token
async function refreshSpotifyToken() {
  if (!spotifyTokens.refreshToken) return false;

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          config.spotify.clientId + ':' + config.spotify.clientSecret
        ).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: spotifyTokens.refreshToken
      })
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('Spotify refresh error:', tokens);
      return false;
    }

    spotifyTokens.accessToken = tokens.access_token;
    spotifyTokens.expiresAt = Date.now() + (tokens.expires_in * 1000);
    if (tokens.refresh_token) {
      spotifyTokens.refreshToken = tokens.refresh_token;
    }

    return true;
  } catch (e) {
    console.error('Spotify refresh error:', e);
    return false;
  }
}

// Get recently played tracks
app.get('/api/spotify/recently-played', async (req, res) => {
  // Check if token needs refresh
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
      headers: {
        'Authorization': `Bearer ${spotifyTokens.accessToken}`
      }
    });

    if (response.status === 401) {
      const refreshed = await refreshSpotifyToken();
      if (!refreshed) {
        return res.status(401).json({ error: 'Session expired', needsAuth: true });
      }
      // Retry with new token
      const retryRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      });
      const data = await retryRes.json();
      return res.json(formatRecentlyPlayed(data));
    }

    const data = await response.json();
    res.json(formatRecentlyPlayed(data));
  } catch (e) {
    console.error('Spotify API error:', e);
    res.status(500).json({ error: 'Failed to fetch recently played' });
  }
});

function formatRecentlyPlayed(data) {
  if (!data.items) return { tracks: [] };
  
  return {
    tracks: data.items.map(item => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      artwork: item.track.album.images[0]?.url,
      playedAt: item.played_at,
      uri: item.track.uri,
      previewUrl: item.track.preview_url,
      externalUrl: item.track.external_urls.spotify
    }))
  };
}

// Get user's playlists
app.get('/api/spotify/playlists', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
      headers: {
        'Authorization': `Bearer ${spotifyTokens.accessToken}`
      }
    });

    const data = await response.json();
    
    res.json({
      playlists: data.items?.map(p => ({
        id: p.id,
        name: p.name,
        artwork: p.images[0]?.url,
        tracksCount: p.tracks.total,
        uri: p.uri,
        externalUrl: p.external_urls.spotify
      })) || []
    });
  } catch (e) {
    console.error('Spotify playlists error:', e);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Mixcloud OAuth & API
let mixcloudTokens = {
  accessToken: null
};

// Check if Mixcloud is authenticated
app.get('/api/mixcloud/status', (req, res) => {
  const isAuthenticated = !!mixcloudTokens.accessToken;
  res.json({ authenticated: isAuthenticated });
});

// Start Mixcloud OAuth flow
app.get('/auth/mixcloud', (req, res) => {
  if (!config.mixcloud?.clientId) {
    return res.status(503).json({ error: 'Mixcloud not configured' });
  }

  const authUrl = `https://www.mixcloud.com/oauth/authorize?` +
    `client_id=${config.mixcloud.clientId}` +
    `&redirect_uri=${encodeURIComponent(config.mixcloud.redirectUri)}`;

  res.redirect(authUrl);
});

// Mixcloud OAuth callback
app.get('/callback/mixcloud', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('http://localhost:3000/?mixcloud_error=' + error);
  }

  try {
    const tokenUrl = `https://www.mixcloud.com/oauth/access_token?` +
      `client_id=${config.mixcloud.clientId}` +
      `&redirect_uri=${encodeURIComponent(config.mixcloud.redirectUri)}` +
      `&client_secret=${config.mixcloud.clientSecret}` +
      `&code=${code}`;

    const tokenRes = await fetch(tokenUrl, { method: 'POST' });
    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('Mixcloud token error:', tokens);
      return res.redirect('http://localhost:3000/?mixcloud_error=' + tokens.error);
    }

    mixcloudTokens = {
      accessToken: tokens.access_token
    };

    console.log('Mixcloud authenticated successfully');
    res.redirect('http://localhost:3000/?mixcloud_success=true');
  } catch (e) {
    console.error('Mixcloud callback error:', e);
    res.redirect('http://localhost:3000/?mixcloud_error=callback_failed');
  }
});

// Get current user info
app.get('/api/mixcloud/me', async (req, res) => {
  if (!mixcloudTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.mixcloud.com/me/?access_token=${mixcloudTokens.accessToken}`);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error('Mixcloud me error:', e);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Get user's listening history
app.get('/api/mixcloud/history', async (req, res) => {
  if (!mixcloudTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.mixcloud.com/me/listens/?access_token=${mixcloudTokens.accessToken}&limit=20`);
    const data = await response.json();
    
    res.json({
      shows: data.data?.map(item => ({
        key: item.key,
        name: item.name,
        artist: item.user?.name,
        artwork: item.pictures?.extra_large || item.pictures?.large,
        url: item.url,
        duration: item.audio_length,
        tags: item.tags?.slice(0, 3).map(t => t.name) || []
      })) || []
    });
  } catch (e) {
    console.error('Mixcloud history error:', e);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get user's favorites
app.get('/api/mixcloud/favorites', async (req, res) => {
  if (!mixcloudTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.mixcloud.com/me/favorites/?access_token=${mixcloudTokens.accessToken}&limit=20`);
    const data = await response.json();
    
    res.json({
      shows: data.data?.map(item => ({
        key: item.key,
        name: item.name,
        artist: item.user?.name,
        artwork: item.pictures?.extra_large || item.pictures?.large,
        url: item.url,
        duration: item.audio_length,
        tags: item.tags?.slice(0, 3).map(t => t.name) || []
      })) || []
    });
  } catch (e) {
    console.error('Mixcloud favorites error:', e);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Get user's feed (shows from followed users)
app.get('/api/mixcloud/feed', async (req, res) => {
  if (!mixcloudTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.mixcloud.com/me/feed/?access_token=${mixcloudTokens.accessToken}&limit=20`);
    const data = await response.json();
    
    res.json({
      shows: data.data?.map(item => ({
        key: item.key,
        name: item.name,
        artist: item.user?.name,
        artwork: item.pictures?.extra_large || item.pictures?.large,
        url: item.url,
        duration: item.audio_length,
        tags: item.tags?.slice(0, 3).map(t => t.name) || []
      })) || []
    });
  } catch (e) {
    console.error('Mixcloud feed error:', e);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// ============================================
// KIOSK MODE - App Launcher Endpoints
// ============================================

// Configuration for external apps
const kioskApps = {
  spotify: {
    name: 'Spotify',
    // Try multiple commands in order of preference
    commands: [
      'spotify',                          // Native Linux app
      'flatpak run com.spotify.Client',   // Flatpak install
      'snap run spotify',                 // Snap install
    ],
    // URL scheme for mobile/alternative launch
    urlScheme: 'spotify://',
    webUrl: 'https://open.spotify.com',
  },
  mixcloud: {
    name: 'Mixcloud',
    // Mixcloud doesn't have a native Linux app, so we open in browser
    commands: [
      'xdg-open https://www.mixcloud.com',
    ],
    urlScheme: 'mixcloud://',
    webUrl: 'https://www.mixcloud.com',
  },
  // Add more apps as needed
  firefox: {
    name: 'Firefox',
    commands: ['firefox'],
  },
  chromium: {
    name: 'Chromium',
    commands: ['chromium-browser', 'chromium'],
  }
};

// Track launched app processes
let launchedApps = {};

// Helper to check if a command exists
function commandExists(cmd) {
  return new Promise((resolve) => {
    exec(`which ${cmd.split(' ')[0]}`, (error) => {
      resolve(!error);
    });
  });
}

// Launch an external app
app.post('/api/kiosk/launch/:appId', async (req, res) => {
  const { appId } = req.params;
  const appConfig = kioskApps[appId];
  
  if (!appConfig) {
    return res.status(404).json({ 
      success: false, 
      error: `Unknown app: ${appId}`,
      availableApps: Object.keys(kioskApps)
    });
  }

  console.log(`[Kiosk] Attempting to launch ${appConfig.name}...`);

  // Try each command until one works
  for (const cmd of appConfig.commands) {
    const baseCmd = cmd.split(' ')[0];
    const exists = await commandExists(baseCmd);
    
    if (exists) {
      try {
        console.log(`[Kiosk] Launching: ${cmd}`);
        
        // Spawn the process detached so it survives if the server restarts
        const child = spawn(cmd, [], {
          shell: true,
          detached: true,
          stdio: 'ignore'
        });
        
        child.unref();
        
        // Track it
        launchedApps[appId] = {
          pid: child.pid,
          launchedAt: new Date().toISOString(),
          command: cmd
        };
        
        // Style the window after a delay (remove title bar, resize)
        setTimeout(async () => {
          await styleAppWindow(appConfig.name);
        }, 2000);
        
        return res.json({ 
          success: true, 
          app: appConfig.name,
          method: 'native',
          command: cmd,
          pid: child.pid
        });
      } catch (e) {
        console.error(`[Kiosk] Failed to launch ${cmd}:`, e.message);
      }
    }
  }

  // No native app found, return web URL as fallback
  console.log(`[Kiosk] No native app found for ${appId}, returning web fallback`);
  res.json({ 
    success: false, 
    app: appConfig.name,
    method: 'web',
    webUrl: appConfig.webUrl,
    message: 'Native app not found, use web version'
  });
});

// Style app window - remove decorations and resize for kiosk look
async function styleAppWindow(appName) {
  const wmctrlExists = await commandExists('wmctrl');
  const xdotoolExists = await commandExists('xdotool');
  
  if (wmctrlExists) {
    // Remove window decorations (title bar) and maximize
    exec(`wmctrl -r "${appName}" -b add,maximized_vert,maximized_horz`, (err) => {
      if (err) console.log(`[Kiosk] Could not maximize ${appName}`);
    });
    
    // Remove decorations (frameless)
    exec(`wmctrl -r "${appName}" -b add,fullscreen`, (err) => {
      if (!err) {
        console.log(`[Kiosk] Made ${appName} fullscreen`);
      } else {
        // Try undecorate as fallback
        exec(`wmctrl -r "${appName}" -b remove,decorated`, (err2) => {
          if (err2) console.log(`[Kiosk] Could not undecorate ${appName}`);
        });
      }
    });
  } else if (xdotoolExists) {
    // Use xdotool to find and resize window
    exec(`xdotool search --name "${appName}" | head -1`, (err, stdout) => {
      if (!err && stdout.trim()) {
        const windowId = stdout.trim();
        // Make fullscreen
        exec(`xdotool key --window ${windowId} F11`, (err) => {
          if (!err) console.log(`[Kiosk] Toggled fullscreen for ${appName}`);
        });
      }
    });
  }
}

// Get list of available apps
app.get('/api/kiosk/apps', async (req, res) => {
  const availableApps = [];
  
  for (const [id, config] of Object.entries(kioskApps)) {
    let available = false;
    let availableCommand = null;
    
    for (const cmd of config.commands) {
      const baseCmd = cmd.split(' ')[0];
      if (await commandExists(baseCmd)) {
        available = true;
        availableCommand = cmd;
        break;
      }
    }
    
    availableApps.push({
      id,
      name: config.name,
      available,
      command: availableCommand,
      webUrl: config.webUrl
    });
  }
  
  res.json({ apps: availableApps });
});

// Focus/bring to front a window (using wmctrl if available)
app.post('/api/kiosk/focus/:appId', async (req, res) => {
  const { appId } = req.params;
  const appConfig = kioskApps[appId];
  
  if (!appConfig) {
    return res.status(404).json({ success: false, error: `Unknown app: ${appId}` });
  }

  // Try to focus using wmctrl
  const wmctrlExists = await commandExists('wmctrl');
  if (wmctrlExists) {
    exec(`wmctrl -a "${appConfig.name}"`, (error) => {
      if (error) {
        res.json({ success: false, error: 'Window not found' });
      } else {
        res.json({ success: true });
      }
    });
  } else {
    res.json({ success: false, error: 'wmctrl not installed' });
  }
});

// Return to kiosk browser (focus chromium/firefox)
app.post('/api/kiosk/return-home', async (req, res) => {
  const wmctrlExists = await commandExists('wmctrl');
  
  if (wmctrlExists) {
    // Try to focus common browser windows
    const browsers = ['Radio', 'Chromium', 'Chrome', 'Firefox', 'localhost'];
    
    for (const browser of browsers) {
      try {
        await new Promise((resolve, reject) => {
          exec(`wmctrl -a "${browser}"`, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        return res.json({ success: true, focused: browser });
      } catch (e) {
        // Try next browser
      }
    }
    
    res.json({ success: false, error: 'Browser window not found' });
  } else {
    // Alternative: use xdotool if available
    const xdotoolExists = await commandExists('xdotool');
    if (xdotoolExists) {
      exec('xdotool search --name "Radio" windowactivate', (error) => {
        res.json({ success: !error });
      });
    } else {
      res.json({ success: false, error: 'No window manager tools available' });
    }
  }
});

// Get kiosk status
app.get('/api/kiosk/status', (req, res) => {
  res.json({
    launchedApps,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
