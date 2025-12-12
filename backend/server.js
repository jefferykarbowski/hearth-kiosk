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

// Token persistence file
const tokensFilePath = path.join(__dirname, 'tokens.json');

// Load saved tokens from file
function loadTokens() {
  try {
    if (fs.existsSync(tokensFilePath)) {
      const data = JSON.parse(fs.readFileSync(tokensFilePath, 'utf8'));
      console.log('Loaded saved tokens');
      return data;
    }
  } catch (e) {
    console.error('Error loading tokens:', e.message);
  }
  return { spotify: {}, mixcloud: {} };
}

// Save tokens to file
function saveTokens() {
  try {
    fs.writeFileSync(tokensFilePath, JSON.stringify({
      spotify: spotifyTokens,
      mixcloud: mixcloudTokens
    }, null, 2));
    console.log('Tokens saved');
  } catch (e) {
    console.error('Error saving tokens:', e.message);
  }
}

// Load persisted tokens
const savedTokens = loadTokens();

// Spotify OAuth & API
let spotifyTokens = savedTokens.spotify || {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

// Check if Spotify is authenticated
app.get('/api/spotify/status', (req, res) => {
  const isAuthenticated = spotifyTokens.accessToken && spotifyTokens.expiresAt > Date.now();
  res.json({ authenticated: isAuthenticated });
});

// Logout / clear Spotify tokens (to re-authenticate with new scopes)
app.post('/api/spotify/logout', (req, res) => {
  spotifyTokens = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  };
  saveTokens();
  console.log('Spotify tokens cleared');
  res.json({ success: true });
});

// Start Spotify OAuth flow
app.get('/auth/spotify', (req, res) => {
  if (!config.spotify?.clientId) {
    return res.status(503).json({ error: 'Spotify not configured' });
  }

  const scopes = [
    'user-read-recently-played',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-top-read',
    'user-library-read',
    'user-library-modify',
    'playlist-read-private',
    'streaming',
    'user-read-email',
    'user-read-private'
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
    return res.redirect('http://localhost:3001/?spotify_error=' + error);
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
      return res.redirect('http://localhost:3001/?spotify_error=' + tokens.error);
    }

    spotifyTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000)
    };
    saveTokens();

    console.log('Spotify authenticated successfully');
    res.redirect('http://localhost:3001/?spotify_success=true');
  } catch (e) {
    console.error('Spotify callback error:', e);
    res.redirect('http://localhost:3001/?spotify_error=callback_failed');
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
    saveTokens();

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

// Spotify suggestions (top tracks, artists, featured playlists)
app.get('/api/spotify/suggestions', async (req, res) => {
  // Check if token needs refresh
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    // Fetch top tracks, top artists, and featured playlists in parallel
    const [topTracksRes, topArtistsRes, featuredRes] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term', {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      }),
      fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term', {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      }),
      fetch('https://api.spotify.com/v1/browse/featured-playlists?limit=10', {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      })
    ]);

    const [topTracksData, topArtistsData, featuredData] = await Promise.all([
      topTracksRes.json(),
      topArtistsRes.json(),
      featuredRes.json()
    ]);

    const topTracks = topTracksData.items?.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      artwork: track.album.images[0]?.url,
      uri: track.uri
    })) || [];

    const topArtists = topArtistsData.items?.map(artist => ({
      id: artist.id,
      name: artist.name,
      artwork: artist.images[0]?.url,
      uri: artist.uri,
      genres: artist.genres?.slice(0, 3) || []
    })) || [];

    const featuredPlaylists = featuredData.playlists?.items?.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      artwork: playlist.images[0]?.url,
      uri: playlist.uri,
      tracksCount: playlist.tracks?.total
    })) || [];

    res.json({
      topTracks,
      topArtists,
      featuredPlaylists,
      message: featuredData.message || 'For You'
    });
  } catch (e) {
    console.error('Spotify suggestions error:', e);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Spotify search
app.get('/api/spotify/search', async (req, res) => {
  const { q, type = 'track' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query required' });
  }

  // Check if token needs refresh
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${spotifyTokens.accessToken}`
        }
      }
    );

    const data = await response.json();

    // Format results based on type (filter out null items that Spotify sometimes returns)
    let results = [];
    if (type === 'track' && data.tracks) {
      results = data.tracks.items.filter(t => t).map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        artistId: track.artists[0]?.id,
        album: track.album.name,
        albumId: track.album.id,
        artwork: track.album.images[0]?.url,
        uri: track.uri,
        duration: track.duration_ms,
        previewUrl: track.preview_url,
        externalUrl: track.external_urls.spotify
      }));
    } else if (type === 'album' && data.albums) {
      results = data.albums.items.filter(a => a).map(album => ({
        id: album.id,
        name: album.name,
        artist: album.artists.map(a => a.name).join(', '),
        artistId: album.artists[0]?.id,
        artwork: album.images[0]?.url,
        uri: album.uri,
        totalTracks: album.total_tracks,
        externalUrl: album.external_urls.spotify
      }));
    } else if (type === 'artist' && data.artists) {
      results = data.artists.items.filter(a => a).map(artist => ({
        id: artist.id,
        name: artist.name,
        artwork: artist.images[0]?.url,
        uri: artist.uri,
        followers: artist.followers?.total,
        externalUrl: artist.external_urls.spotify
      }));
    } else if (type === 'playlist' && data.playlists) {
      results = data.playlists.items.filter(p => p).map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        owner: playlist.owner?.display_name,
        artwork: playlist.images[0]?.url,
        uri: playlist.uri,
        tracksCount: playlist.tracks?.total,
        externalUrl: playlist.external_urls?.spotify
      }));
    }

    res.json({ results, type });
  } catch (e) {
    console.error('Spotify search error:', e);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get artist details with top tracks, albums, and related artists
app.get('/api/spotify/artist/:id', async (req, res) => {
  const { id } = req.params;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const [artistRes, topTracksRes, albumsRes, relatedRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`, {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&limit=20&market=US`, {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/artists/${id}/related-artists`, {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      })
    ]);

    const [artist, topTracksData, albumsData, relatedData] = await Promise.all([
      artistRes.json(),
      topTracksRes.json(),
      albumsRes.json(),
      relatedRes.json()
    ]);

    res.json({
      artist: {
        id: artist.id,
        name: artist.name,
        artwork: artist.images?.[0]?.url,
        followers: artist.followers?.total,
        genres: artist.genres || [],
        popularity: artist.popularity,
        uri: artist.uri
      },
      topTracks: topTracksData.tracks?.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumId: track.album.id,
        artwork: track.album.images?.[0]?.url,
        duration: track.duration_ms,
        uri: track.uri,
        previewUrl: track.preview_url
      })) || [],
      albums: albumsData.items?.map(album => ({
        id: album.id,
        name: album.name,
        artwork: album.images?.[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        albumType: album.album_type,
        uri: album.uri
      })) || [],
      relatedArtists: relatedData.artists?.slice(0, 10).map(a => ({
        id: a.id,
        name: a.name,
        artwork: a.images?.[0]?.url,
        followers: a.followers?.total,
        uri: a.uri
      })) || []
    });
  } catch (e) {
    console.error('Spotify artist error:', e);
    res.status(500).json({ error: 'Failed to fetch artist' });
  }
});

// Get album details with tracks
app.get('/api/spotify/album/:id', async (req, res) => {
  const { id } = req.params;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    const album = await response.json();

    res.json({
      album: {
        id: album.id,
        name: album.name,
        artist: album.artists?.map(a => a.name).join(', '),
        artistId: album.artists?.[0]?.id,
        artwork: album.images?.[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        label: album.label,
        popularity: album.popularity,
        uri: album.uri,
        copyrights: album.copyrights?.map(c => c.text) || []
      },
      tracks: album.tracks?.items?.map((track, index) => ({
        id: track.id,
        name: track.name,
        trackNumber: track.track_number,
        artist: track.artists?.map(a => a.name).join(', '),
        duration: track.duration_ms,
        uri: track.uri,
        previewUrl: track.preview_url
      })) || []
    });
  } catch (e) {
    console.error('Spotify album error:', e);
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

// Get user's liked/saved tracks
app.get('/api/spotify/liked', async (req, res) => {
  const { offset = 0, limit = 50 } = req.query;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
      { headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` } }
    );

    const data = await response.json();

    res.json({
      tracks: data.items?.map(item => ({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        artistId: item.track.artists[0]?.id,
        album: item.track.album.name,
        albumId: item.track.album.id,
        artwork: item.track.album.images?.[0]?.url,
        duration: item.track.duration_ms,
        addedAt: item.added_at,
        uri: item.track.uri,
        previewUrl: item.track.preview_url
      })) || [],
      total: data.total,
      hasMore: data.next !== null
    });
  } catch (e) {
    console.error('Spotify liked tracks error:', e);
    res.status(500).json({ error: 'Failed to fetch liked tracks' });
  }
});

// Check if tracks are saved/liked
app.get('/api/spotify/liked/check', async (req, res) => {
  const { ids } = req.query;

  if (!ids) {
    return res.status(400).json({ error: 'Track IDs required' });
  }

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks/contains?ids=${ids}`,
      { headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` } }
    );

    const results = await response.json();
    res.json({ results });
  } catch (e) {
    console.error('Spotify check liked error:', e);
    res.status(500).json({ error: 'Failed to check liked status' });
  }
});

// Save/like a track
app.put('/api/spotify/liked/:id', async (req, res) => {
  const { id } = req.params;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    await fetch(`https://api.spotify.com/v1/me/tracks?ids=${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Spotify save track error:', e);
    res.status(500).json({ error: 'Failed to save track' });
  }
});

// Remove/unlike a track
app.delete('/api/spotify/liked/:id', async (req, res) => {
  const { id } = req.params;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    await fetch(`https://api.spotify.com/v1/me/tracks?ids=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Spotify remove track error:', e);
    res.status(500).json({ error: 'Failed to remove track' });
  }
});

// Get browse categories
app.get('/api/spotify/categories', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(
      'https://api.spotify.com/v1/browse/categories?limit=40&locale=en_US',
      { headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` } }
    );

    const data = await response.json();

    res.json({
      categories: data.categories?.items?.map(cat => ({
        id: cat.id,
        name: cat.name,
        artwork: cat.icons?.[0]?.url
      })) || []
    });
  } catch (e) {
    console.error('Spotify categories error:', e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get playlists for a category
app.get('/api/spotify/category/:id/playlists', async (req, res) => {
  const { id } = req.params;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/browse/categories/${id}/playlists?limit=30`,
      { headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` } }
    );

    const data = await response.json();

    res.json({
      playlists: data.playlists?.items?.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        artwork: p.images?.[0]?.url,
        owner: p.owner?.display_name,
        tracksCount: p.tracks?.total,
        uri: p.uri
      })) || []
    });
  } catch (e) {
    console.error('Spotify category playlists error:', e);
    res.status(500).json({ error: 'Failed to fetch category playlists' });
  }
});

// Get new releases
app.get('/api/spotify/new-releases', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(
      'https://api.spotify.com/v1/browse/new-releases?limit=30',
      { headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` } }
    );

    const data = await response.json();

    res.json({
      albums: data.albums?.items?.map(album => ({
        id: album.id,
        name: album.name,
        artist: album.artists?.map(a => a.name).join(', '),
        artistId: album.artists?.[0]?.id,
        artwork: album.images?.[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        uri: album.uri
      })) || []
    });
  } catch (e) {
    console.error('Spotify new releases error:', e);
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

// Get playlist tracks
app.get('/api/spotify/playlist/:id/tracks', async (req, res) => {
  const { id } = req.params;
  const { offset = 0, limit = 50 } = req.query;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const [playlistRes, tracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/playlists/${id}?fields=id,name,description,images,owner,followers`, {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
      })
    ]);

    const [playlist, tracksData] = await Promise.all([
      playlistRes.json(),
      tracksRes.json()
    ]);

    res.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        artwork: playlist.images?.[0]?.url,
        owner: playlist.owner?.display_name,
        followers: playlist.followers?.total
      },
      tracks: tracksData.items?.filter(item => item.track).map(item => ({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists?.map(a => a.name).join(', '),
        artistId: item.track.artists?.[0]?.id,
        album: item.track.album?.name,
        albumId: item.track.album?.id,
        artwork: item.track.album?.images?.[0]?.url,
        duration: item.track.duration_ms,
        addedAt: item.added_at,
        uri: item.track.uri
      })) || [],
      total: tracksData.total,
      hasMore: tracksData.next !== null
    });
  } catch (e) {
    console.error('Spotify playlist tracks error:', e);
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

// Get access token for Web Playback SDK
app.get('/api/spotify/token', (req, res) => {
  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  res.json({
    accessToken: spotifyTokens.accessToken,
    expiresAt: spotifyTokens.expiresAt
  });
});

// Get current playback state
app.get('/api/spotify/playback', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    if (response.status === 204) {
      return res.json({ isPlaying: false, device: null, track: null });
    }

    const data = await response.json();

    res.json({
      isPlaying: data.is_playing,
      progress: data.progress_ms,
      device: data.device ? {
        id: data.device.id,
        name: data.device.name,
        type: data.device.type,
        volume: data.device.volume_percent
      } : null,
      track: data.item ? {
        id: data.item.id,
        name: data.item.name,
        artist: data.item.artists?.map(a => a.name).join(', '),
        album: data.item.album?.name,
        artwork: data.item.album?.images?.[0]?.url,
        duration: data.item.duration_ms,
        uri: data.item.uri
      } : null,
      shuffle: data.shuffle_state,
      repeat: data.repeat_state
    });
  } catch (e) {
    console.error('Spotify playback state error:', e);
    res.status(500).json({ error: 'Failed to get playback state' });
  }
});

// Get available devices
app.get('/api/spotify/devices', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    const data = await response.json();

    res.json({
      devices: data.devices?.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isActive: d.is_active,
        volume: d.volume_percent
      })) || []
    });
  } catch (e) {
    console.error('Spotify devices error:', e);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// Start/resume playback
app.put('/api/spotify/play', async (req, res) => {
  const { uri, uris, context_uri, device_id, position_ms } = req.body;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const queryParams = device_id ? `?device_id=${device_id}` : '';
    const body = {};

    if (uris) body.uris = uris;
    else if (uri) body.uris = [uri];
    if (context_uri) body.context_uri = context_uri;
    if (position_ms) body.position_ms = position_ms;

    const response = await fetch(`https://api.spotify.com/v1/me/player/play${queryParams}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${spotifyTokens.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
    });

    if (response.status === 204 || response.status === 200) {
      res.json({ success: true });
    } else {
      const error = await response.json();
      res.status(response.status).json({ error: error.error?.message || 'Playback failed' });
    }
  } catch (e) {
    console.error('Spotify play error:', e);
    res.status(500).json({ error: 'Failed to start playback' });
  }
});

// Pause playback
app.put('/api/spotify/pause', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: response.status === 204 || response.status === 200 });
  } catch (e) {
    console.error('Spotify pause error:', e);
    res.status(500).json({ error: 'Failed to pause' });
  }
});

// Skip to next track
app.post('/api/spotify/next', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: response.status === 204 || response.status === 200 });
  } catch (e) {
    console.error('Spotify next error:', e);
    res.status(500).json({ error: 'Failed to skip' });
  }
});

// Skip to previous track
app.post('/api/spotify/prev', async (req, res) => {
  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: response.status === 204 || response.status === 200 });
  } catch (e) {
    console.error('Spotify previous error:', e);
    res.status(500).json({ error: 'Failed to go back' });
  }
});

// Set volume
app.put('/api/spotify/volume/:percent', async (req, res) => {
  const { percent } = req.params;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${percent}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: response.status === 204 || response.status === 200 });
  } catch (e) {
    console.error('Spotify volume error:', e);
    res.status(500).json({ error: 'Failed to set volume' });
  }
});

// Transfer playback to a device
app.put('/api/spotify/transfer', async (req, res) => {
  const { device_id, play = false } = req.body;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${spotifyTokens.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ device_ids: [device_id], play })
    });

    res.json({ success: response.status === 204 || response.status === 200 });
  } catch (e) {
    console.error('Spotify transfer error:', e);
    res.status(500).json({ error: 'Failed to transfer playback' });
  }
});

// Toggle shuffle
app.put('/api/spotify/shuffle/:state', async (req, res) => {
  const { state } = req.params;

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: response.status === 204 || response.status === 200 });
  } catch (e) {
    console.error('Spotify shuffle error:', e);
    res.status(500).json({ error: 'Failed to toggle shuffle' });
  }
});

// Set repeat mode
app.put('/api/spotify/repeat/:state', async (req, res) => {
  const { state } = req.params; // track, context, or off

  if (spotifyTokens.expiresAt && spotifyTokens.expiresAt < Date.now() + 60000) {
    await refreshSpotifyToken();
  }

  if (!spotifyTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${state}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyTokens.accessToken}` }
    });

    res.json({ success: response.status === 204 || response.status === 200 });
  } catch (e) {
    console.error('Spotify repeat error:', e);
    res.status(500).json({ error: 'Failed to set repeat mode' });
  }
});

// Mixcloud OAuth & API
let mixcloudTokens = savedTokens.mixcloud || {
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
    return res.redirect('http://localhost:3001/?mixcloud_error=' + error);
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
      return res.redirect('http://localhost:3001/?mixcloud_error=' + tokens.error);
    }

    mixcloudTokens = {
      accessToken: tokens.access_token
    };
    saveTokens();

    console.log('Mixcloud authenticated successfully');
    res.redirect('http://localhost:3001/?mixcloud_success=true');
  } catch (e) {
    console.error('Mixcloud callback error:', e);
    res.redirect('http://localhost:3001/?mixcloud_error=callback_failed');
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

// Mixcloud search (public API - no auth required)
app.get('/api/mixcloud/search', async (req, res) => {
  const { q, type = 'cloudcast' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    const response = await fetch(
      `https://api.mixcloud.com/search/?q=${encodeURIComponent(q)}&type=${type}&limit=20`
    );

    const data = await response.json();

    const results = data.data?.map(item => ({
      key: item.key,
      name: item.name,
      artist: item.user?.name,
      artwork: item.pictures?.extra_large || item.pictures?.large || item.pictures?.medium,
      url: item.url,
      duration: item.audio_length,
      tags: item.tags?.slice(0, 3).map(t => t.name) || [],
      playCount: item.play_count,
      favoriteCount: item.favorite_count
    })) || [];

    res.json({ results, type });
  } catch (e) {
    console.error('Mixcloud search error:', e);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user's playlists
app.get('/api/mixcloud/playlists', async (req, res) => {
  if (!mixcloudTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    const response = await fetch(`https://api.mixcloud.com/me/playlists/?access_token=${mixcloudTokens.accessToken}&limit=20`);
    const data = await response.json();

    res.json({
      playlists: data.data?.map(item => ({
        key: item.key,
        name: item.name,
        slug: item.slug,
        showCount: item.cloudcast_count,
        url: item.url
      })) || []
    });
  } catch (e) {
    console.error('Mixcloud playlists error:', e);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get shows from a specific playlist
app.get('/api/mixcloud/playlist/:user/:slug', async (req, res) => {
  const { user, slug } = req.params;

  try {
    const response = await fetch(`https://api.mixcloud.com/${user}/playlists/${slug}/cloudcasts/?limit=50`);
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
    console.error('Mixcloud playlist shows error:', e);
    res.status(500).json({ error: 'Failed to fetch playlist shows' });
  }
});

// Get new uploads from DJs you follow (tries multiple endpoints)
app.get('/api/mixcloud/feed', async (req, res) => {
  if (!mixcloudTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', needsAuth: true });
  }

  try {
    // Try /me/stream/ endpoint first (activity stream)
    const streamRes = await fetch(`https://api.mixcloud.com/me/stream/?access_token=${mixcloudTokens.accessToken}&limit=30`);
    const streamData = await streamRes.json();

    console.log('[Mixcloud] Stream response:', JSON.stringify(streamData, null, 2).substring(0, 1000));

    let shows = [];

    if (streamData.data && streamData.data.length > 0) {
      shows = streamData.data
        .filter(item => item.key && item.name) // Filter to cloudcasts only
        .map(item => ({
          key: item.key,
          name: item.name,
          artist: item.user?.name,
          artwork: item.pictures?.extra_large || item.pictures?.large || item.pictures?.medium,
          url: item.url,
          duration: item.audio_length,
          tags: item.tags?.slice(0, 3).map(t => t.name) || [],
          createdTime: item.created_time
        }));
    }

    // If stream is empty, fall back to getting uploads from followed users
    if (shows.length === 0) {
      console.log('[Mixcloud] Stream empty, fetching from followed users...');

      const followingRes = await fetch(`https://api.mixcloud.com/me/following/?access_token=${mixcloudTokens.accessToken}&limit=15`);
      const followingData = await followingRes.json();

      console.log(`[Mixcloud] Following ${followingData.data?.length || 0} users`);

      if (followingData.data && followingData.data.length > 0) {
        for (const user of followingData.data.slice(0, 10)) {
          try {
            const userKey = user.key || `/${user.username}/`;
            const uploadsRes = await fetch(`https://api.mixcloud.com${userKey}cloudcasts/?limit=5`);
            const uploadsData = await uploadsRes.json();

            if (uploadsData.data) {
              for (const cloudcast of uploadsData.data) {
                shows.push({
                  key: cloudcast.key,
                  name: cloudcast.name,
                  artist: cloudcast.user?.name || user.name,
                  artwork: cloudcast.pictures?.extra_large || cloudcast.pictures?.large || cloudcast.pictures?.medium,
                  url: cloudcast.url,
                  duration: cloudcast.audio_length,
                  tags: cloudcast.tags?.slice(0, 3).map(t => t.name) || [],
                  createdTime: cloudcast.created_time
                });
              }
            }
          } catch (e) {
            console.error(`[Mixcloud] Error fetching uploads:`, e.message);
          }
        }

        // Sort by created time (newest first)
        shows.sort((a, b) => {
          if (!a.createdTime || !b.createdTime) return 0;
          return new Date(b.createdTime) - new Date(a.createdTime);
        });
      }
    }

    console.log(`[Mixcloud] Found ${shows.length} shows`);
    res.json({ shows: shows.slice(0, 30) });
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

  // No native app found, launch web URL in a separate browser window
  if (appConfig.webUrl) {
    console.log(`[Kiosk] No native app found for ${appId}, opening web version in new window`);

    try {
      // Launch Firefox in a regular (non-kiosk) window so it can be closed
      const child = spawn('firefox', ['--new-window', appConfig.webUrl], {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      // Track it
      launchedApps[appId] = {
        pid: child.pid,
        launchedAt: new Date().toISOString(),
        command: `firefox --new-window ${appConfig.webUrl}`,
        method: 'web'
      };

      // Maximize the window after a delay
      setTimeout(async () => {
        await styleAppWindow('Mozilla Firefox');
      }, 2000);

      return res.json({
        success: true,
        app: appConfig.name,
        method: 'web',
        webUrl: appConfig.webUrl,
        pid: child.pid,
        message: 'Opened in new browser window - close window to return'
      });
    } catch (e) {
      console.error(`[Kiosk] Failed to open web URL:`, e.message);
    }
  }

  // Complete fallback - no native app and couldn't open web
  console.log(`[Kiosk] No native app or web URL for ${appId}`);
  res.json({
    success: false,
    app: appConfig.name,
    error: 'No launch method available'
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

// Close an external app window
app.post('/api/kiosk/close/:appId', async (req, res) => {
  const { appId } = req.params;
  const appInfo = launchedApps[appId];

  if (!appInfo) {
    return res.json({ success: false, error: 'App not tracked' });
  }

  console.log(`[Kiosk] Closing ${appId} (PID: ${appInfo.pid})`);

  try {
    // Try to kill the process
    if (appInfo.pid) {
      process.kill(appInfo.pid, 'SIGTERM');
    }

    // If it was a web window, also try wmctrl
    const appConfig = kioskApps[appId];
    if (appConfig) {
      const wmctrlExists = await commandExists('wmctrl');
      if (wmctrlExists) {
        // Try to close the window by name
        exec(`wmctrl -c "${appConfig.name}"`, () => {});
        exec(`wmctrl -c "${appConfig.webUrl}"`, () => {});
      }
    }

    // Remove from tracked apps
    delete launchedApps[appId];

    res.json({ success: true, message: `Closed ${appId}` });
  } catch (e) {
    console.error(`[Kiosk] Failed to close ${appId}:`, e.message);
    // Still remove from tracking
    delete launchedApps[appId];
    res.json({ success: true, message: 'Removed from tracking' });
  }
});

// Track external URL window
let externalUrlWindow = null;

// Open a URL in a new Firefox window
app.post('/api/kiosk/open-url', (req, res) => {
  const { url, title } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL required' });
  }

  console.log(`[Kiosk] Opening external URL: ${url}`);

  try {
    // Close any existing external window first
    if (externalUrlWindow) {
      try {
        process.kill(externalUrlWindow.pid, 'SIGTERM');
      } catch (e) {}
    }

    // Launch Firefox with the URL in a new window
    const child = spawn('firefox', ['--new-window', url], {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();

    externalUrlWindow = {
      pid: child.pid,
      url,
      title,
      openedAt: new Date().toISOString()
    };

    res.json({ success: true, pid: child.pid });
  } catch (e) {
    console.error('[Kiosk] Failed to open URL:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Close the external URL window
app.post('/api/kiosk/close-url', async (req, res) => {
  console.log('[Kiosk] Closing external URL window');

  if (externalUrlWindow) {
    try {
      process.kill(externalUrlWindow.pid, 'SIGTERM');
    } catch (e) {
      console.log('[Kiosk] Process already closed');
    }

    // Also try wmctrl to close Firefox windows that aren't the kiosk
    const wmctrlExists = await commandExists('wmctrl');
    if (wmctrlExists) {
      // Close any Firefox window that's not localhost:3001
      exec('wmctrl -l | grep -i firefox', (err, stdout) => {
        if (!err && stdout) {
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            // Don't close the main kiosk window
            if (!line.includes('localhost') && !line.includes('Radio')) {
              const windowId = line.split(/\s+/)[0];
              exec(`wmctrl -i -c ${windowId}`, () => {});
            }
          });
        }
      });
    }

    externalUrlWindow = null;
  }

  // Focus back on the kiosk window
  const wmctrlExists = await commandExists('wmctrl');
  if (wmctrlExists) {
    exec('wmctrl -a "localhost" || wmctrl -a "Radio" || wmctrl -a "Firefox"', () => {});
  }

  res.json({ success: true });
});

// Toggle virtual keyboard (wvkbd)
app.post('/api/kiosk/keyboard/toggle', (req, res) => {
  exec('pkill -SIGUSR2 wvkbd-mobintl', (error) => {
    if (error) {
      console.log('[Kiosk] Keyboard toggle - wvkbd may not be running');
    }
    res.json({ success: true, message: 'Keyboard toggled' });
  });
});

// ============================================
// SYSTEM VOLUME CONTROL
// ============================================

// Get current system volume
app.get('/api/volume', async (req, res) => {
  // Try PipeWire first (wpctl), then PulseAudio (pactl)
  const wpctlExists = await commandExists('wpctl');
  const pactlExists = await commandExists('pactl');

  if (wpctlExists) {
    exec('wpctl get-volume @DEFAULT_AUDIO_SINK@', (error, stdout) => {
      if (error) {
        console.error('[Volume] wpctl error:', error.message);
        return res.status(500).json({ error: 'Failed to get volume' });
      }
      // Output format: "Volume: 0.50" or "Volume: 0.50 [MUTED]"
      const match = stdout.match(/Volume:\s*([\d.]+)/);
      const muted = stdout.includes('[MUTED]');
      const volume = match ? parseFloat(match[1]) : 0;
      res.json({ volume: Math.round(volume * 100), muted, method: 'pipewire' });
    });
  } else if (pactlExists) {
    exec('pactl get-sink-volume @DEFAULT_SINK@', (error, stdout) => {
      if (error) {
        console.error('[Volume] pactl error:', error.message);
        return res.status(500).json({ error: 'Failed to get volume' });
      }
      // Output format: "Volume: front-left: 32768 /  50% / ..."
      const match = stdout.match(/(\d+)%/);
      const volume = match ? parseInt(match[1]) : 0;

      // Check mute status
      exec('pactl get-sink-mute @DEFAULT_SINK@', (err2, stdout2) => {
        const muted = stdout2?.includes('yes') || false;
        res.json({ volume, muted, method: 'pulseaudio' });
      });
    });
  } else {
    res.status(503).json({ error: 'No audio control available (wpctl/pactl not found)' });
  }
});

// Set system volume
app.put('/api/volume/:percent', async (req, res) => {
  const percent = Math.max(0, Math.min(100, parseInt(req.params.percent)));

  const wpctlExists = await commandExists('wpctl');
  const pactlExists = await commandExists('pactl');

  if (wpctlExists) {
    // wpctl uses 0.0-1.0 scale
    const volume = (percent / 100).toFixed(2);
    exec(`wpctl set-volume @DEFAULT_AUDIO_SINK@ ${volume}`, (error) => {
      if (error) {
        console.error('[Volume] wpctl set error:', error.message);
        return res.status(500).json({ error: 'Failed to set volume' });
      }
      console.log(`[Volume] Set to ${percent}% via PipeWire`);
      res.json({ success: true, volume: percent });
    });
  } else if (pactlExists) {
    exec(`pactl set-sink-volume @DEFAULT_SINK@ ${percent}%`, (error) => {
      if (error) {
        console.error('[Volume] pactl set error:', error.message);
        return res.status(500).json({ error: 'Failed to set volume' });
      }
      console.log(`[Volume] Set to ${percent}% via PulseAudio`);
      res.json({ success: true, volume: percent });
    });
  } else {
    res.status(503).json({ error: 'No audio control available' });
  }
});

// Toggle mute
app.post('/api/volume/mute/toggle', async (req, res) => {
  const wpctlExists = await commandExists('wpctl');
  const pactlExists = await commandExists('pactl');

  if (wpctlExists) {
    exec('wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle', (error) => {
      if (error) {
        console.error('[Volume] wpctl mute error:', error.message);
        return res.status(500).json({ error: 'Failed to toggle mute' });
      }
      console.log('[Volume] Toggled mute via PipeWire');
      res.json({ success: true });
    });
  } else if (pactlExists) {
    exec('pactl set-sink-mute @DEFAULT_SINK@ toggle', (error) => {
      if (error) {
        console.error('[Volume] pactl mute error:', error.message);
        return res.status(500).json({ error: 'Failed to toggle mute' });
      }
      console.log('[Volume] Toggled mute via PulseAudio');
      res.json({ success: true });
    });
  } else {
    res.status(503).json({ error: 'No audio control available' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
