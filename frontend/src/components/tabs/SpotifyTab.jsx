import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Music2, LogIn, LogOut, Clock, ListMusic, Play, Pause, Search, X, Disc, User,
  Sparkles, RefreshCw, Heart, ChevronLeft, SkipBack, SkipForward,
  Volume2, Shuffle, Repeat, Grid, Laptop, Speaker, ChevronRight, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Debounce hook for live search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Format duration from ms
function formatDuration(ms) {
  if (!ms) return '--:--';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format number with commas
function formatNumber(num) {
  if (!num) return '0';
  return num.toLocaleString();
}

export default function SpotifyTab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Navigation stack for drill-down views
  const [viewStack, setViewStack] = useState([{ type: 'home' }]);
  const currentView = viewStack[viewStack.length - 1];

  // Data states
  const [suggestions, setSuggestions] = useState(null);
  const [recentTracks, setRecentTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newReleases, setNewReleases] = useState([]);

  // Detail view data
  const [artistData, setArtistData] = useState(null);
  const [albumData, setAlbumData] = useState(null);
  const [playlistData, setPlaylistData] = useState(null);
  const [categoryPlaylists, setCategoryPlaylists] = useState([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], albums: [], artists: [], playlists: [] });
  const [searching, setSearching] = useState(false);
  const [searchType, setSearchType] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Playback state
  const [playbackState, setPlaybackState] = useState(null);
  const [devices, setDevices] = useState([]);
  const [showDevices, setShowDevices] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const playerRef = useRef(null);

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('forYou');

  // Initialize
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_success')) {
      checkAuthStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Live search effect
  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) {
      performSearch(debouncedSearch);
    } else if (debouncedSearch.trim() === '') {
      setSearchResults({ tracks: [], albums: [], artists: [], playlists: [] });
    }
  }, [debouncedSearch]);

  // Initialize Web Playback SDK
  useEffect(() => {
    if (!isAuthenticated) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer();
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      document.body.removeChild(script);
    };
  }, [isAuthenticated]);

  // Poll playback state
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollPlayback = () => {
      fetchPlaybackState();
    };

    pollPlayback();
    const interval = setInterval(pollPlayback, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const initializePlayer = async () => {
    try {
      const tokenRes = await fetch('/api/spotify/token');
      const { accessToken } = await tokenRes.json();

      const player = new window.Spotify.Player({
        name: 'Kitchen Radio Kiosk',
        getOAuthToken: cb => cb(accessToken),
        volume: 0.5
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify SDK Ready with Device ID:', device_id);
        setDeviceId(device_id);
        setSdkReady(true);
      });

      player.addListener('player_state_changed', state => {
        if (state) {
          setPlaybackState({
            isPlaying: !state.paused,
            progress: state.position,
            track: state.track_window?.current_track ? {
              id: state.track_window.current_track.id,
              name: state.track_window.current_track.name,
              artist: state.track_window.current_track.artists.map(a => a.name).join(', '),
              album: state.track_window.current_track.album.name,
              artwork: state.track_window.current_track.album.images[0]?.url,
              duration: state.duration,
              uri: state.track_window.current_track.uri
            } : null,
            shuffle: state.shuffle,
            repeat: state.repeat_mode
          });
        }
      });

      player.connect();
      playerRef.current = player;
    } catch (e) {
      console.error('Failed to initialize Spotify SDK:', e);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/spotify/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        // Fetch initial data in parallel
        Promise.all([
          fetchSuggestions(),
          fetchRecentTracks(),
          fetchPlaylists(),
          fetchCategories(),
          fetchNewReleases()
        ]);
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/spotify/suggestions');
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      console.error('Fetch suggestions error:', e);
    }
  };

  const fetchRecentTracks = async () => {
    try {
      const res = await fetch('/api/spotify/recently-played');
      const data = await res.json();
      if (data.tracks) setRecentTracks(data.tracks);
    } catch (e) {
      console.error('Fetch recent tracks error:', e);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/spotify/playlists');
      const data = await res.json();
      if (data.playlists) setPlaylists(data.playlists);
    } catch (e) {
      console.error('Fetch playlists error:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/spotify/categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (e) {
      console.error('Fetch categories error:', e);
    }
  };

  const fetchNewReleases = async () => {
    try {
      const res = await fetch('/api/spotify/new-releases');
      const data = await res.json();
      if (data.albums) setNewReleases(data.albums);
    } catch (e) {
      console.error('Fetch new releases error:', e);
    }
  };

  const fetchLikedTracks = async () => {
    try {
      const res = await fetch('/api/spotify/liked');
      const data = await res.json();
      if (data.tracks) setLikedTracks(data.tracks);
    } catch (e) {
      console.error('Fetch liked tracks error:', e);
    }
  };

  const fetchPlaybackState = async () => {
    try {
      const res = await fetch('/api/spotify/playback');
      const data = await res.json();
      if (!data.error) {
        setPlaybackState(data);
      }
    } catch (e) {
      // Silent fail for playback polling
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/spotify/devices');
      const data = await res.json();
      if (data.devices) setDevices(data.devices);
    } catch (e) {
      console.error('Fetch devices error:', e);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) return;

    setSearching(true);
    try {
      // Search all types in parallel
      const types = ['track', 'album', 'artist', 'playlist'];
      const results = await Promise.all(
        types.map(type =>
          fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=${type}`)
            .then(r => r.json())
        )
      );

      setSearchResults({
        tracks: results[0].results || [],
        albums: results[1].results || [],
        artists: results[2].results || [],
        playlists: results[3].results || []
      });
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  };

  // Navigation
  const pushView = (view) => {
    setViewStack([...viewStack, view]);
  };

  const popView = () => {
    if (viewStack.length > 1) {
      setViewStack(viewStack.slice(0, -1));
    }
  };

  const goHome = () => {
    setViewStack([{ type: 'home' }]);
    setSearchQuery('');
    setSearchResults({ tracks: [], albums: [], artists: [], playlists: [] });
  };

  // Playback controls
  const playTrack = async (uri, contextUri = null) => {
    try {
      const body = contextUri
        ? { context_uri: contextUri, device_id: deviceId }
        : { uri, device_id: deviceId };

      await fetch('/api/spotify/play', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      setTimeout(fetchPlaybackState, 500);
    } catch (e) {
      console.error('Play error:', e);
    }
  };

  const playContext = async (contextUri, offset = 0) => {
    try {
      await fetch('/api/spotify/play', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context_uri: contextUri,
          offset: { position: offset },
          device_id: deviceId
        })
      });
      setTimeout(fetchPlaybackState, 500);
    } catch (e) {
      console.error('Play context error:', e);
    }
  };

  const togglePlayback = async () => {
    try {
      if (playbackState?.isPlaying) {
        await fetch('/api/spotify/pause', { method: 'PUT' });
      } else {
        await fetch('/api/spotify/play', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId })
        });
      }
      setTimeout(fetchPlaybackState, 300);
    } catch (e) {
      console.error('Toggle playback error:', e);
    }
  };

  const skipNext = async () => {
    try {
      await fetch('/api/spotify/next', { method: 'POST' });
      setTimeout(fetchPlaybackState, 500);
    } catch (e) {
      console.error('Skip next error:', e);
    }
  };

  const skipPrev = async () => {
    try {
      await fetch('/api/spotify/prev', { method: 'POST' });
      setTimeout(fetchPlaybackState, 500);
    } catch (e) {
      console.error('Skip prev error:', e);
    }
  };

  const toggleShuffle = async () => {
    try {
      const newState = !playbackState?.shuffle;
      await fetch(`/api/spotify/shuffle/${newState}`, { method: 'PUT' });
      setTimeout(fetchPlaybackState, 300);
    } catch (e) {
      console.error('Shuffle error:', e);
    }
  };

  const cycleRepeat = async () => {
    const modes = ['off', 'context', 'track'];
    const currentIndex = modes.indexOf(playbackState?.repeat || 'off');
    const nextMode = modes[(currentIndex + 1) % 3];
    try {
      await fetch(`/api/spotify/repeat/${nextMode}`, { method: 'PUT' });
      setTimeout(fetchPlaybackState, 300);
    } catch (e) {
      console.error('Repeat error:', e);
    }
  };

  const transferPlayback = async (targetDeviceId) => {
    try {
      await fetch('/api/spotify/transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: targetDeviceId, play: true })
      });
      setShowDevices(false);
      setTimeout(fetchPlaybackState, 500);
    } catch (e) {
      console.error('Transfer error:', e);
    }
  };

  const toggleLike = async (trackId, isLiked) => {
    try {
      if (isLiked) {
        await fetch(`/api/spotify/liked/${trackId}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/spotify/liked/${trackId}`, { method: 'PUT' });
      }
    } catch (e) {
      console.error('Toggle like error:', e);
    }
  };

  // Detail view loaders
  const loadArtist = async (artistId) => {
    pushView({ type: 'artist', id: artistId });
    try {
      const res = await fetch(`/api/spotify/artist/${artistId}`);
      const data = await res.json();
      setArtistData(data);
    } catch (e) {
      console.error('Load artist error:', e);
    }
  };

  const loadAlbum = async (albumId) => {
    pushView({ type: 'album', id: albumId });
    try {
      const res = await fetch(`/api/spotify/album/${albumId}`);
      const data = await res.json();
      setAlbumData(data);
    } catch (e) {
      console.error('Load album error:', e);
    }
  };

  const loadPlaylist = async (playlistId) => {
    pushView({ type: 'playlist', id: playlistId });
    try {
      const res = await fetch(`/api/spotify/playlist/${playlistId}/tracks`);
      const data = await res.json();
      setPlaylistData(data);
    } catch (e) {
      console.error('Load playlist error:', e);
    }
  };

  const loadCategory = async (categoryId, categoryName) => {
    pushView({ type: 'category', id: categoryId, name: categoryName });
    try {
      const res = await fetch(`/api/spotify/category/${categoryId}/playlists`);
      const data = await res.json();
      setCategoryPlaylists(data.playlists || []);
    } catch (e) {
      console.error('Load category error:', e);
    }
  };

  const handleLogin = () => {
    window.location.href = '/auth/spotify';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/spotify/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setSuggestions(null);
      setRecentTracks([]);
      setPlaylists([]);
      setLikedTracks([]);
      setPlaybackState(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
          style={{ background: 'rgba(30, 215, 96, 0.2)', border: '1px solid rgba(30, 215, 96, 0.3)' }}
        >
          <Music2 className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Connect Spotify</h2>
          <p className="text-white/60">Sign in to access your music, playlists, and more</p>
        </div>
        <motion.button
          onClick={handleLogin}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
          style={{ background: '#1DB954', color: 'white' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogIn size={20} />
          Sign in with Spotify
        </motion.button>
      </div>
    );
  }

  // Card components
  const TrackRow = ({ track, index, showArtwork = true, onPlay, isPlaying = false }) => (
    <div
      className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group ${isPlaying ? 'bg-white/10' : ''}`}
    >
      {showArtwork ? (
        <button onClick={onPlay} className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
          {track.artwork ? (
            <img src={track.artwork} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <Music2 size={16} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play size={14} fill="white" className="text-white" />
          </div>
        </button>
      ) : (
        <button onClick={onPlay} className="w-6 flex items-center justify-center">
          <span className="text-white/40 text-sm group-hover:hidden">{index + 1}</span>
          <Play size={14} fill="white" className="text-white hidden group-hover:block" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <button onClick={onPlay} className={`font-medium truncate text-sm block w-full text-left ${isPlaying ? 'text-green-400' : 'hover:underline'}`}>
          {track.name}
        </button>
        {track.artistId ? (
          <button
            onClick={(e) => { e.stopPropagation(); loadArtist(track.artistId); }}
            className="text-xs text-white/50 truncate block hover:text-white hover:underline"
          >
            {track.artist}
          </button>
        ) : (
          <p className="text-xs text-white/50 truncate">{track.artist}</p>
        )}
      </div>
      <span className="text-xs text-white/40">{formatDuration(track.duration)}</span>
    </div>
  );

  const GridCard = ({ item, type, onClick, size = 'normal' }) => {
    const sizeClasses = size === 'small' ? 'p-2' : 'p-3';
    const isArtist = type === 'artist';

    return (
      <motion.button
        onClick={onClick}
        className="group text-left w-full"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className={`rounded-xl overflow-hidden transition-all group-hover:bg-white/15 ${sizeClasses}`}
          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
        >
          <div className={`relative ${isArtist ? 'aspect-square rounded-full' : 'aspect-square rounded-lg'} overflow-hidden mb-2`}>
            {item.artwork ? (
              <img src={item.artwork} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                {type === 'artist' ? <User size={24} className="text-white/30" /> :
                 type === 'album' ? <Disc size={24} className="text-white/30" /> :
                 <ListMusic size={24} className="text-white/30" />}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Play size={18} fill="white" className="text-white ml-0.5" />
              </div>
            </div>
          </div>
          <h4 className="font-medium truncate text-sm">{item.name}</h4>
          {item.artist && <p className="text-xs text-white/50 truncate">{item.artist}</p>}
          {item.owner && <p className="text-xs text-white/50 truncate">by {item.owner}</p>}
          {item.tracksCount && <p className="text-xs text-white/40">{item.tracksCount} tracks</p>}
        </div>
      </motion.button>
    );
  };

  // Section header
  const SectionHeader = ({ title, onSeeAll }) => (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-bold">{title}</h3>
      {onSeeAll && (
        <button onClick={onSeeAll} className="text-sm text-white/60 hover:text-white flex items-center gap-1">
          See all <ChevronRight size={16} />
        </button>
      )}
    </div>
  );

  // Render detail views
  const renderDetailView = () => {
    switch (currentView.type) {
      case 'artist':
        if (!artistData) return <div className="text-center py-8 text-white/50">Loading artist...</div>;
        return (
          <div className="space-y-6">
            {/* Artist header */}
            <div className="flex items-end gap-6">
              <div className="w-40 h-40 rounded-full overflow-hidden shadow-2xl flex-shrink-0">
                {artistData.artist.artwork ? (
                  <img src={artistData.artist.artwork} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <User size={64} className="text-white/30" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-white/60 mb-1">Artist</p>
                <h1 className="text-3xl font-bold mb-2">{artistData.artist.name}</h1>
                <p className="text-white/60">{formatNumber(artistData.artist.followers)} followers</p>
                {artistData.artist.genres?.length > 0 && (
                  <p className="text-sm text-white/40 mt-1">{artistData.artist.genres.slice(0, 3).join(', ')}</p>
                )}
              </div>
            </div>

            {/* Play button */}
            <motion.button
              onClick={() => playContext(artistData.artist.uri)}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
              style={{ background: '#1DB954' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={20} fill="white" /> Play
            </motion.button>

            {/* Top tracks */}
            {artistData.topTracks?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3">Popular</h3>
                <div className="space-y-1">
                  {artistData.topTracks.slice(0, 5).map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      onPlay={() => playTrack(track.uri)}
                      isPlaying={playbackState?.track?.id === track.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Albums */}
            {artistData.albums?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3">Discography</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {artistData.albums.slice(0, 10).map(album => (
                    <GridCard
                      key={album.id}
                      item={album}
                      type="album"
                      onClick={() => loadAlbum(album.id)}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Related artists */}
            {artistData.relatedArtists?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3">Fans also like</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {artistData.relatedArtists.slice(0, 5).map(artist => (
                    <GridCard
                      key={artist.id}
                      item={artist}
                      type="artist"
                      onClick={() => loadArtist(artist.id)}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'album':
        if (!albumData) return <div className="text-center py-8 text-white/50">Loading album...</div>;
        return (
          <div className="space-y-6">
            {/* Album header */}
            <div className="flex items-end gap-6">
              <div className="w-40 h-40 rounded-lg overflow-hidden shadow-2xl flex-shrink-0">
                {albumData.album.artwork ? (
                  <img src={albumData.album.artwork} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <Disc size={64} className="text-white/30" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-white/60 mb-1">Album</p>
                <h1 className="text-2xl font-bold mb-1">{albumData.album.name}</h1>
                <button
                  onClick={() => loadArtist(albumData.album.artistId)}
                  className="text-white/80 hover:text-white hover:underline"
                >
                  {albumData.album.artist}
                </button>
                <p className="text-sm text-white/40 mt-1">
                  {new Date(albumData.album.releaseDate).getFullYear()} • {albumData.album.totalTracks} tracks
                </p>
              </div>
            </div>

            {/* Play button */}
            <motion.button
              onClick={() => playContext(albumData.album.uri)}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
              style={{ background: '#1DB954' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={20} fill="white" /> Play
            </motion.button>

            {/* Track list */}
            <div className="space-y-1">
              {albumData.tracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={{ ...track, artwork: albumData.album.artwork }}
                  index={i}
                  showArtwork={false}
                  onPlay={() => playContext(albumData.album.uri, i)}
                  isPlaying={playbackState?.track?.id === track.id}
                />
              ))}
            </div>
          </div>
        );

      case 'playlist':
        if (!playlistData) return <div className="text-center py-8 text-white/50">Loading playlist...</div>;
        return (
          <div className="space-y-6">
            {/* Playlist header */}
            <div className="flex items-end gap-6">
              <div className="w-40 h-40 rounded-lg overflow-hidden shadow-2xl flex-shrink-0">
                {playlistData.playlist.artwork ? (
                  <img src={playlistData.playlist.artwork} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <ListMusic size={64} className="text-white/30" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-white/60 mb-1">Playlist</p>
                <h1 className="text-2xl font-bold mb-1">{playlistData.playlist.name}</h1>
                {playlistData.playlist.description && (
                  <p className="text-sm text-white/60 mb-1" dangerouslySetInnerHTML={{ __html: playlistData.playlist.description }} />
                )}
                <p className="text-sm text-white/40">
                  {playlistData.playlist.owner} • {playlistData.total} tracks
                </p>
              </div>
            </div>

            {/* Play button */}
            <motion.button
              onClick={() => playContext(`spotify:playlist:${playlistData.playlist.id}`)}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
              style={{ background: '#1DB954' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={20} fill="white" /> Play
            </motion.button>

            {/* Track list */}
            <div className="space-y-1">
              {playlistData.tracks.map((track, i) => (
                <TrackRow
                  key={`${track.id}-${i}`}
                  track={track}
                  index={i}
                  onPlay={() => playContext(`spotify:playlist:${playlistData.playlist.id}`, i)}
                  isPlaying={playbackState?.track?.id === track.id}
                />
              ))}
            </div>
          </div>
        );

      case 'category':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">{currentView.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categoryPlaylists.map(playlist => (
                <GridCard
                  key={playlist.id}
                  item={playlist}
                  type="playlist"
                  onClick={() => loadPlaylist(playlist.id)}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Search results view
  const renderSearchResults = () => {
    const hasResults = searchResults.tracks.length > 0 ||
                      searchResults.albums.length > 0 ||
                      searchResults.artists.length > 0 ||
                      searchResults.playlists.length > 0;

    if (!hasResults && searchQuery.trim()) {
      return (
        <div className="text-center py-12 text-white/50">
          {searching ? 'Searching...' : 'No results found'}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Artists */}
        {searchResults.artists.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">Artists</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {searchResults.artists.slice(0, 6).map(artist => (
                <GridCard
                  key={artist.id}
                  item={artist}
                  type="artist"
                  onClick={() => loadArtist(artist.id)}
                  size="small"
                />
              ))}
            </div>
          </div>
        )}

        {/* Tracks */}
        {searchResults.tracks.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">Songs</h3>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {searchResults.tracks.slice(0, 8).map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  onPlay={() => playTrack(track.uri)}
                  isPlaying={playbackState?.track?.id === track.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Albums */}
        {searchResults.albums.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">Albums</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {searchResults.albums.slice(0, 6).map(album => (
                <GridCard
                  key={album.id}
                  item={album}
                  type="album"
                  onClick={() => loadAlbum(album.id)}
                  size="small"
                />
              ))}
            </div>
          </div>
        )}

        {/* Playlists */}
        {searchResults.playlists.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">Playlists</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {searchResults.playlists.slice(0, 6).map(playlist => (
                <GridCard
                  key={playlist.id}
                  item={playlist}
                  type="playlist"
                  onClick={() => loadPlaylist(playlist.id)}
                  size="small"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Home view content
  const renderHomeContent = () => {
    switch (activeTab) {
      case 'forYou':
        return (
          <div className="space-y-6">
            {/* Top Tracks */}
            {suggestions?.topTracks?.length > 0 && (
              <div>
                <SectionHeader title="Your Top Tracks" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {suggestions.topTracks.slice(0, 5).map(track => (
                    <GridCard
                      key={track.id}
                      item={track}
                      type="track"
                      onClick={() => playTrack(track.uri)}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Top Artists */}
            {suggestions?.topArtists?.length > 0 && (
              <div>
                <SectionHeader title="Your Top Artists" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {suggestions.topArtists.slice(0, 5).map(artist => (
                    <GridCard
                      key={artist.id}
                      item={artist}
                      type="artist"
                      onClick={() => loadArtist(artist.id)}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Featured Playlists */}
            {suggestions?.featuredPlaylists?.length > 0 && (
              <div>
                <SectionHeader title={suggestions.message || 'Featured Playlists'} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {suggestions.featuredPlaylists.slice(0, 5).map(playlist => (
                    <GridCard
                      key={playlist.id}
                      item={playlist}
                      type="playlist"
                      onClick={() => loadPlaylist(playlist.id)}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* New Releases */}
            {newReleases.length > 0 && (
              <div>
                <SectionHeader title="New Releases" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {newReleases.slice(0, 5).map(album => (
                    <GridCard
                      key={album.id}
                      item={album}
                      type="album"
                      onClick={() => loadAlbum(album.id)}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'recent':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Recently Played</h3>
              <button
                onClick={() => { setRefreshing(true); fetchRecentTracks().finally(() => setRefreshing(false)); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/10 hover:bg-white/20"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {recentTracks.map((track, i) => (
                <TrackRow
                  key={`${track.id}-${i}`}
                  track={track}
                  index={i}
                  onPlay={() => playTrack(track.uri)}
                  isPlaying={playbackState?.track?.id === track.id}
                />
              ))}
            </div>
          </div>
        );

      case 'playlists':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Your Playlists</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {playlists.map(playlist => (
                <GridCard
                  key={playlist.id}
                  item={playlist}
                  type="playlist"
                  onClick={() => loadPlaylist(playlist.id)}
                />
              ))}
            </div>
          </div>
        );

      case 'liked':
        if (likedTracks.length === 0) {
          fetchLikedTracks();
          return <div className="text-center py-8 text-white/50">Loading liked songs...</div>;
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #450af5, #c4efd9)' }}>
                <Heart size={32} className="text-white" fill="white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Liked Songs</h3>
                <p className="text-white/60 text-sm">{likedTracks.length} songs</p>
              </div>
            </div>
            <motion.button
              onClick={() => playContext('spotify:collection:tracks')}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold mb-4"
              style={{ background: '#1DB954' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={20} fill="white" /> Play
            </motion.button>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {likedTracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  onPlay={() => playContext('spotify:collection:tracks', i)}
                  isPlaying={playbackState?.track?.id === track.id}
                />
              ))}
            </div>
          </div>
        );

      case 'browse':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Browse All</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categories.map(category => (
                <motion.button
                  key={category.id}
                  onClick={() => loadCategory(category.id, category.name)}
                  className="relative aspect-square rounded-lg overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {category.artwork ? (
                    <img src={category.artwork} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                    <span className="font-bold text-sm">{category.name}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Main render
  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        {viewStack.length > 1 ? (
          <button
            onClick={popView}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <Music2 className="w-6 h-6 text-green-400" />
        )}
        <h2 className="text-xl font-semibold flex-1">
          {viewStack.length > 1 ? '' : 'Spotify'}
        </h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          title="Sign out to re-authenticate with new permissions"
        >
          <LogOut size={14} />
          Re-auth
        </button>
      </div>

      {/* Search Bar - always visible */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search songs, artists, albums..."
          className="w-full pl-12 pr-12 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-green-500/50 focus:bg-white/15 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults({ tracks: [], albums: [], artists: [], playlists: [] }); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
        {searching && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Navigation tabs - only on home view */}
      {currentView.type === 'home' && !searchQuery && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'forYou', label: 'For You', icon: Sparkles },
            { id: 'recent', label: 'Recent', icon: Clock },
            { id: 'liked', label: 'Liked', icon: Heart },
            { id: 'playlists', label: 'Playlists', icon: ListMusic },
            { id: 'browse', label: 'Browse', icon: Grid },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView.type + (currentView.id || '')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {searchQuery.trim() ? renderSearchResults() :
           currentView.type === 'home' ? renderHomeContent() :
           renderDetailView()}
        </motion.div>
      </AnimatePresence>

      {/* Now Playing Bar */}
      {playbackState?.track && (
        <div
          className="fixed bottom-9 left-0 right-0 z-40"
          style={{ background: 'rgba(20, 20, 25, 0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                {playbackState.track.artwork ? (
                  <img src={playbackState.track.artwork} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <Music2 size={20} className="text-white/30" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{playbackState.track.name}</p>
                <p className="text-xs text-white/50 truncate">{playbackState.track.artist}</p>
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full hover:bg-white/10 ${playbackState.shuffle ? 'text-green-400' : 'text-white/60'}`}
              >
                <Shuffle size={16} />
              </button>
              <button onClick={skipPrev} className="p-2 rounded-full hover:bg-white/10">
                <SkipBack size={20} fill="white" />
              </button>
              <button
                onClick={togglePlayback}
                className="p-3 rounded-full bg-white text-black hover:scale-105 transition-transform"
              >
                {playbackState.isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-0.5" />}
              </button>
              <button onClick={skipNext} className="p-2 rounded-full hover:bg-white/10">
                <SkipForward size={20} fill="white" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`p-2 rounded-full hover:bg-white/10 ${playbackState.repeat !== 'off' ? 'text-green-400' : 'text-white/60'}`}
              >
                <Repeat size={16} />
                {playbackState.repeat === 'track' && <span className="absolute text-[8px] font-bold">1</span>}
              </button>
            </div>

            {/* Device selector */}
            <div className="relative">
              <button
                onClick={() => { fetchDevices(); setShowDevices(!showDevices); }}
                className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
              >
                {playbackState.device?.type === 'Computer' ? <Laptop size={18} /> : <Speaker size={18} />}
              </button>

              {showDevices && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-64 rounded-lg shadow-xl overflow-hidden"
                  style={{ background: 'rgba(40, 40, 45, 0.98)' }}
                >
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-semibold">Connect to a device</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {devices.length === 0 ? (
                      <p className="p-3 text-sm text-white/50">No devices found</p>
                    ) : (
                      devices.map(device => (
                        <button
                          key={device.id}
                          onClick={() => transferPlayback(device.id)}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-white/10 text-left ${device.isActive ? 'text-green-400' : ''}`}
                        >
                          {device.type === 'Computer' ? <Laptop size={20} /> : <Speaker size={20} />}
                          <div>
                            <p className="text-sm font-medium">{device.name}</p>
                            <p className="text-xs text-white/50">{device.type}</p>
                          </div>
                          {device.isActive && <span className="ml-auto text-xs text-green-400">Playing</span>}
                        </button>
                      ))
                    )}
                  </div>
                  {deviceId && (
                    <button
                      onClick={() => transferPlayback(deviceId)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/10 text-left border-t border-white/10 text-green-400"
                    >
                      <Speaker size={20} />
                      <div>
                        <p className="text-sm font-medium">Kitchen Radio Kiosk</p>
                        <p className="text-xs text-white/50">This device</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
