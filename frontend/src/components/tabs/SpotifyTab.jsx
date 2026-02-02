import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Heart, Search, X, 
  Shuffle, Repeat, Repeat1, Volume2, ChevronLeft, Music,
  Disc3, User, ListMusic, Clock, Home, Library, Wifi, WifiOff, Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpotifyPlayer } from '../../contexts/SpotifyPlayerContext';
import { useKeyboard } from '../../contexts/KeyboardContext';
import VirtualKeyboard from '../VirtualKeyboard';

// Spotify logo
const SpotifyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

export default function SpotifyTab() {
  // Spotify Web Playback SDK
  const {
    sdkReady,
    isReady: playerReady,
    deviceId,
    error: playerError,
    currentTrack,
    isPlaying,
    position,
    duration,
    shuffle,
    repeatMode,
    initializePlayer,
    play,
    togglePlay,
    skipNext,
    skipPrev,
    seek,
    toggleShuffle,
    cycleRepeat,
    transferPlayback
  } = useSpotifyPlayer();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Navigation state
  const [activeView, setActiveView] = useState('home'); // home, search, library, artist, album, playlist
  const [navigationStack, setNavigationStack] = useState([]);
  
  // Data state (removed playback - now using SDK state)
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [suggestions, setSuggestions] = useState({ topTracks: [], topArtists: [], featuredPlaylists: [] });
  const [likedTracks, setLikedTracks] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], artists: [], albums: [], playlists: [] });
  const [searchType, setSearchType] = useState('track');
  const [searching, setSearching] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  
  // Keyboard context for hiding news ticker
  const { setIsKeyboardOpen } = useKeyboard();
  
  // Sync keyboard state with context
  useEffect(() => {
    setIsKeyboardOpen(showKeyboard);
  }, [showKeyboard, setIsKeyboardOpen]);
  
  // Detail view state
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  
  // Player initialization flag
  const playerInitializedRef = useRef(false);
  
  // API-based playback state (fallback when SDK fails)
  const [apiPlayback, setApiPlayback] = useState(null);
  const [usingApiFallback, setUsingApiFallback] = useState(false);

  // Check auth on mount
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

  // Initialize Web Playback SDK when authenticated and SDK is ready
  useEffect(() => {
    if (isAuthenticated && sdkReady && !playerInitializedRef.current) {
      console.log('[SpotifyTab] Initializing Web Playback SDK...');
      playerInitializedRef.current = true;
      initializePlayer();
    }
  }, [isAuthenticated, sdkReady, initializePlayer]);

  // Fall back to API polling when SDK fails or isn't ready
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Use API fallback if SDK has error or hasn't connected after 10 seconds
    const checkFallback = setTimeout(() => {
      if (playerError || !playerReady) {
        console.log('[SpotifyTab] Using API fallback for playback state');
        setUsingApiFallback(true);
      }
    }, 10000);

    return () => clearTimeout(checkFallback);
  }, [isAuthenticated, playerError, playerReady]);

  // Poll API for playback state when using fallback
  useEffect(() => {
    if (!isAuthenticated || !usingApiFallback) return;

    const pollPlayback = async () => {
      try {
        const res = await fetch('/api/spotify/playback-state');
        if (res.ok) {
          const data = await res.json();
          setApiPlayback(data);
        }
      } catch (e) {
        console.error('Playback poll error:', e);
      }
    };

    pollPlayback();
    const interval = setInterval(pollPlayback, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated, usingApiFallback]);

  // Create playback object from SDK state or API fallback for NowPlayingBar compatibility
  const playback = usingApiFallback && apiPlayback?.item ? {
    isPlaying: apiPlayback.is_playing,
    progress: apiPlayback.progress_ms || 0,
    track: {
      name: apiPlayback.item.name,
      artist: apiPlayback.item.artists?.[0]?.name || 'Unknown artist',
      artistId: apiPlayback.item.artists?.[0]?.id,
      album: apiPlayback.item.album?.name,
      albumId: apiPlayback.item.album?.id,
      artwork: apiPlayback.item.album?.images?.[0]?.url,
      duration: apiPlayback.item.duration_ms || 0
    },
    shuffle: apiPlayback.shuffle_state,
    repeat: apiPlayback.repeat_state,
    device: apiPlayback.device
  } : currentTrack ? {
    isPlaying,
    progress: position,
    track: currentTrack,
    shuffle,
    repeat: repeatMode === 0 ? 'off' : repeatMode === 1 ? 'context' : 'track'
  } : null;

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/spotify/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        loadInitialData();
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    await Promise.all([
      fetchRecentlyPlayed(),
      fetchSuggestions(),
      fetchUserPlaylists(),
      fetchNewReleases()
    ]);
  };

  const fetchRecentlyPlayed = async () => {
    try {
      const res = await fetch('/api/spotify/recently-played');
      const data = await res.json();
      if (data.tracks) setRecentlyPlayed(data.tracks);
    } catch (e) {
      console.error('Recently played error:', e);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/spotify/suggestions');
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      console.error('Suggestions error:', e);
    }
  };

  const fetchUserPlaylists = async () => {
    try {
      const res = await fetch('/api/spotify/playlists');
      const data = await res.json();
      if (data.playlists) setUserPlaylists(data.playlists);
    } catch (e) {
      console.error('Playlists error:', e);
    }
  };

  const fetchNewReleases = async () => {
    try {
      const res = await fetch('/api/spotify/new-releases');
      const data = await res.json();
      if (data.albums) setNewReleases(data.albums);
    } catch (e) {
      console.error('New releases error:', e);
    }
  };

  const fetchLikedTracks = async () => {
    try {
      const res = await fetch('/api/spotify/liked?limit=50');
      const data = await res.json();
      if (data.tracks) setLikedTracks(data.tracks);
    } catch (e) {
      console.error('Liked tracks error:', e);
    }
  };

  // Playback controls - uses Web Playback SDK if ready, otherwise backend API
  const playTrack = async (uri, contextUri = null) => {
    console.log('[playTrack] Called with:', { uri, contextUri, playerReady, deviceId });
    
    // Try SDK first
    if (playerReady && deviceId) {
      try {
        console.log('[playTrack] Using SDK...');
        if (contextUri) {
          await play({ context_uri: contextUri, offset: { uri } });
        } else {
          await play({ uris: [uri] });
        }
        console.log('[playTrack] SDK play successful');
        return;
      } catch (e) {
        console.error('[playTrack] SDK play error, trying API fallback:', e);
      }
    }
    
    // Fallback to backend API (plays on active device like Kitchen Computer)
    console.log('[playTrack] Using API fallback...');
    try {
      const body = contextUri 
        ? { context_uri: contextUri, offset: { uri } }
        : { uris: [uri] };
      
      console.log('[playTrack] API request body:', body);
      const res = await fetch('/api/spotify/play', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error('[playTrack] API play error:', err);
      } else {
        console.log('[playTrack] API play successful');
      }
    } catch (e) {
      console.error('[playTrack] Play error:', e);
    }
  };

  const playContext = async (contextUri) => {
    // Try SDK first
    if (playerReady && deviceId) {
      try {
        await play({ context_uri: contextUri });
        return;
      } catch (e) {
        console.error('SDK play context error, trying API fallback:', e);
      }
    }
    
    // Fallback to backend API
    try {
      const res = await fetch('/api/spotify/play', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_uri: contextUri })
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error('API play context error:', err);
      }
    } catch (e) {
      console.error('Play context error:', e);
    }
  };

  // Seek handler for NowPlayingBar
  const seekTo = async (positionMs) => {
    await seek(positionMs);
  };

  // Search with debounce timer ref
  const searchTimerRef = useRef(null);

  // Live search function
  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [], albums: [], playlists: [] });
      return;
    }

    setSearching(true);
    try {
      const [tracksRes, artistsRes, albumsRes, playlistsRes] = await Promise.all([
        fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=track`),
        fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=artist`),
        fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=album`),
        fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=playlist`)
      ]);

      const [tracks, artists, albums, playlists] = await Promise.all([
        tracksRes.json(),
        artistsRes.json(),
        albumsRes.json(),
        playlistsRes.json()
      ]);

      setSearchResults({
        tracks: tracks.results || [],
        artists: artists.results || [],
        albums: albums.results || [],
        playlists: playlists.results || []
      });
      setActiveView('search');
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search - triggers 300ms after user stops typing
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    
    // Clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    // Set new timer for live search
    searchTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, []);

  // Form submit handler (for enter key)
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    performSearch(searchQuery);
  };

  // Navigation
  const navigateTo = (view, data = null) => {
    setNavigationStack(prev => [...prev, { view: activeView, data: getViewData() }]);
    setActiveView(view);
    if (data) {
      if (view === 'artist') setSelectedArtist(data);
      else if (view === 'album') setSelectedAlbum(data);
      else if (view === 'playlist') setSelectedPlaylist(data);
    }
  };

  const goBack = () => {
    if (navigationStack.length > 0) {
      const prev = navigationStack[navigationStack.length - 1];
      setNavigationStack(stack => stack.slice(0, -1));
      setActiveView(prev.view);
    } else {
      setActiveView('home');
    }
  };

  const getViewData = () => {
    if (activeView === 'artist') return selectedArtist;
    if (activeView === 'album') return selectedAlbum;
    if (activeView === 'playlist') return selectedPlaylist;
    return null;
  };

  // Fetch artist details
  const fetchArtist = async (artistId) => {
    try {
      const res = await fetch(`/api/spotify/artist/${artistId}`);
      const data = await res.json();
      navigateTo('artist', data);
    } catch (e) {
      console.error('Artist fetch error:', e);
    }
  };

  // Fetch album details
  const fetchAlbum = async (albumId) => {
    try {
      const res = await fetch(`/api/spotify/album/${albumId}`);
      const data = await res.json();
      navigateTo('album', data);
    } catch (e) {
      console.error('Album fetch error:', e);
    }
  };

  // Fetch playlist details
  const fetchPlaylist = async (playlistId) => {
    try {
      const res = await fetch(`/api/spotify/playlist/${playlistId}/tracks`);
      const data = await res.json();
      navigateTo('playlist', data);
    } catch (e) {
      console.error('Playlist fetch error:', e);
    }
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Login handler
  const handleLogin = () => {
    window.location.href = '/auth/spotify';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <SpotifyIcon className="w-20 h-20 mx-auto mb-6 text-[#1DB954]" />
        <h2 className="text-2xl font-bold mb-4">Connect to Spotify</h2>
        <p className="text-white/60 mb-8">
          Sign in to access your music, playlists, and personalized recommendations.
        </p>
        <motion.button
          onClick={handleLogin}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg"
          style={{ background: '#1DB954', color: 'white' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SpotifyIcon className="w-6 h-6" />
          Sign in with Spotify
        </motion.button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Player Status Indicator */}
      {isAuthenticated && (
        <div className="flex items-center gap-2 text-sm">
          {playerReady ? (
            <span className="flex items-center gap-2 text-[#1DB954]">
              <Wifi size={14} />
              Kitchen Kiosk Player Ready
            </span>
          ) : usingApiFallback && apiPlayback?.device ? (
            <span className="flex items-center gap-2 text-[#1DB954]">
              <Wifi size={14} />
              Playing on {apiPlayback.device.name}
            </span>
          ) : playerError && !usingApiFallback ? (
            <span className="flex items-center gap-2 text-yellow-400">
              <Wifi size={14} className="animate-pulse" />
              Connecting via Spotify Connect...
            </span>
          ) : (
            <span className="flex items-center gap-2 text-white/50">
              <Wifi size={14} className="animate-pulse" />
              Connecting to Spotify...
            </span>
          )}
        </div>
      )}

      {/* Now Playing Bar */}
      {playback?.track && (
        <NowPlayingBar
          playback={playback}
          localProgress={position}
          onPlayPause={togglePlay}
          onNext={skipNext}
          onPrev={skipPrev}
          onSeek={seekTo}
          onShuffle={toggleShuffle}
          onRepeat={cycleRepeat}
          onArtistClick={(id) => fetchArtist(id)}
          onAlbumClick={(id) => fetchAlbum(id)}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4">
        {navigationStack.length > 0 && (
          <motion.button
            onClick={goBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft size={20} />
          </motion.button>
        )}
        
        <div className="flex gap-2">
          {['home', 'search', 'library'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setNavigationStack([]);
                setActiveView(tab);
                if (tab === 'library' && likedTracks.length === 0) {
                  fetchLikedTracks();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeView === tab || (activeView !== 'home' && activeView !== 'search' && activeView !== 'library' && tab === 'home')
                  ? 'bg-[#1DB954] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
            >
              {tab === 'home' && <Home size={16} />}
              {tab === 'search' && <Search size={16} />}
              {tab === 'library' && <Library size={16} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onClick={() => setShowKeyboard(true)}
              readOnly
              placeholder="Search songs, artists, albums..."
              className="w-full pl-10 pr-16 py-2.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#1DB954]/50 cursor-pointer"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setActiveView('home'); }}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowKeyboard(true)}
                className="text-white/40 hover:text-white"
              >
                <Keyboard className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeView === 'home' && (
          <HomeView
            key="home"
            recentlyPlayed={recentlyPlayed}
            suggestions={suggestions}
            newReleases={newReleases}
            userPlaylists={userPlaylists}
            onPlayTrack={playTrack}
            onPlayContext={playContext}
            onArtistClick={fetchArtist}
            onAlbumClick={fetchAlbum}
            onPlaylistClick={fetchPlaylist}
          />
        )}

        {activeView === 'search' && (
          <SearchView
            key="search"
            results={searchResults}
            searchType={searchType}
            onTypeChange={setSearchType}
            onPlayTrack={playTrack}
            onArtistClick={fetchArtist}
            onAlbumClick={fetchAlbum}
            onPlaylistClick={fetchPlaylist}
            searching={searching}
          />
        )}

        {activeView === 'library' && (
          <LibraryView
            key="library"
            likedTracks={likedTracks}
            playlists={userPlaylists}
            onPlayTrack={playTrack}
            onPlaylistClick={fetchPlaylist}
            onArtistClick={fetchArtist}
          />
        )}

        {activeView === 'artist' && selectedArtist && (
          <ArtistView
            key="artist"
            data={selectedArtist}
            onPlayTrack={playTrack}
            onPlayContext={playContext}
            onArtistClick={fetchArtist}
            onAlbumClick={fetchAlbum}
          />
        )}

        {activeView === 'album' && selectedAlbum && (
          <AlbumView
            key="album"
            data={selectedAlbum}
            onPlayTrack={playTrack}
            onPlayContext={playContext}
            onArtistClick={fetchArtist}
          />
        )}

        {activeView === 'playlist' && selectedPlaylist && (
          <PlaylistView
            key="playlist"
            data={selectedPlaylist}
            onPlayTrack={playTrack}
            onPlayContext={playContext}
            onArtistClick={fetchArtist}
          />
        )}
      </AnimatePresence>

      {/* Virtual Keyboard */}
      {showKeyboard && (
        <VirtualKeyboard
          initialValue={searchQuery}
          onChange={(value) => handleSearchChange(value)}
          onClose={() => {
            setShowKeyboard(false);
          }}
        />
      )}
    </div>
  );
}

// Now Playing Bar Component
function NowPlayingBar({ playback, localProgress, onPlayPause, onNext, onPrev, onSeek, onShuffle, onRepeat, onArtistClick, onAlbumClick }) {
  const progressRef = useRef(null);
  const track = playback?.track;
  
  const handleSeek = (e) => {
    if (!progressRef.current || !track?.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(percent * track.duration);
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = track?.duration ? (localProgress / track.duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Album Art */}
        <button onClick={() => track?.album && onAlbumClick(track.albumId)} className="flex-shrink-0">
          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg">
            {track?.artwork ? (
              <img src={track.artwork} alt={track.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Music size={32} className="text-white/30" />
              </div>
            )}
          </div>
        </button>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{track?.name || 'Not playing'}</h4>
          <button 
            onClick={() => track?.artistId && onArtistClick(track.artistId)}
            className="text-sm text-white/60 truncate hover:text-white hover:underline"
          >
            {track?.artist || 'Unknown artist'}
          </button>
        </div>

        {/* Controls - using direct API calls for reliability */}
        <div className="flex items-center gap-3">
          <button
            onClick={async () => { console.log('SHUFFLE clicked'); await fetch('/api/spotify/shuffle/' + (!playback?.shuffle), { method: 'PUT' }); }}
            className={`p-4 rounded-full transition-colors active:scale-95 ${playback?.shuffle ? 'text-[#1DB954] bg-[#1DB954]/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Shuffle size={22} />
          </button>
          
          <button 
            onClick={async (e) => { e.stopPropagation(); console.log('PREV clicked'); await fetch('/api/spotify/prev', { method: 'POST' }); }}
            onTouchEnd={async (e) => { e.preventDefault(); e.stopPropagation(); console.log('PREV touch'); await fetch('/api/spotify/prev', { method: 'POST' }); }}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 active:bg-white/30"
          >
            <SkipBack size={28} />
          </button>
          
          <button
            onClick={async (e) => { 
              e.stopPropagation();
              console.log('PLAY/PAUSE clicked, isPlaying:', playback?.isPlaying); 
              if (playback?.isPlaying) {
                await fetch('/api/spotify/pause', { method: 'PUT' });
              } else {
                await fetch('/api/spotify/play', { method: 'PUT' });
              }
            }}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white text-black hover:scale-105 active:scale-95 transition-transform"
          >
            {playback?.isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </button>
          
          <button 
            onClick={async (e) => { e.stopPropagation(); console.log('NEXT clicked'); await fetch('/api/spotify/next', { method: 'POST' }); }}
            onTouchEnd={async (e) => { e.preventDefault(); e.stopPropagation(); console.log('NEXT touch'); await fetch('/api/spotify/next', { method: 'POST' }); }}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 active:bg-white/30"
          >
            <SkipForward size={28} />
          </button>
          
          <button
            onClick={async () => { console.log('REPEAT clicked'); await fetch('/api/spotify/repeat/' + (playback?.repeat === 'off' ? 'context' : playback?.repeat === 'context' ? 'track' : 'off'), { method: 'PUT' }); }}
            className={`p-4 rounded-full transition-colors active:scale-95 ${playback?.repeat !== 'off' ? 'text-[#1DB954] bg-[#1DB954]/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            {playback?.repeat === 'track' ? <Repeat1 size={22} /> : <Repeat size={22} />}
          </button>
        </div>

        {/* Time Display */}
        <div className="text-sm text-white/60 w-24 text-right">
          {formatDuration(localProgress)} / {formatDuration(track?.duration)}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        ref={progressRef}
        className="h-1.5 bg-white/10 cursor-pointer group"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-[#1DB954] transition-all group-hover:bg-[#1ed760]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

// Home View
function HomeView({ recentlyPlayed, suggestions, newReleases, userPlaylists, onPlayTrack, onPlayContext, onArtistClick, onAlbumClick, onPlaylistClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Featured / Made For You */}
      {suggestions.featuredPlaylists?.length > 0 && (
        <Section title={suggestions.message || 'Made For You'}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestions.featuredPlaylists.slice(0, 5).map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onClick={() => onPlaylistClick(playlist.id)}
                onPlay={() => onPlayContext(playlist.uri)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Your Top Artists */}
      {suggestions.topArtists?.length > 0 && (
        <Section title="Your Top Artists">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {suggestions.topArtists.slice(0, 6).map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                onClick={() => onArtistClick(artist.id)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <Section title="Recently Played">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recentlyPlayed.slice(0, 10).map((track, i) => (
              <TrackCard
                key={`${track.id}-${i}`}
                track={track}
                onClick={() => onPlayTrack(track.uri, track.albumUri)}
                onArtistClick={() => track.artistId && onArtistClick(track.artistId)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* New Releases */}
      {newReleases.length > 0 && (
        <Section title="New Releases">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {newReleases.slice(0, 10).map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => onAlbumClick(album.id)}
                onPlay={() => onPlayContext(album.uri)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Your Playlists */}
      {userPlaylists.length > 0 && (
        <Section title="Your Playlists">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {userPlaylists.slice(0, 10).map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onClick={() => onPlaylistClick(playlist.id)}
                onPlay={() => onPlayContext(playlist.uri)}
              />
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  );
}

// Search View
function SearchView({ results, searchType, onTypeChange, onPlayTrack, onArtistClick, onAlbumClick, onPlaylistClick, searching }) {
  const types = [
    { id: 'track', label: 'Songs', count: results.tracks?.length },
    { id: 'artist', label: 'Artists', count: results.artists?.length },
    { id: 'album', label: 'Albums', count: results.albums?.length },
    { id: 'playlist', label: 'Playlists', count: results.playlists?.length },
  ];

  const hasResults = results.tracks?.length || results.artists?.length || results.albums?.length || results.playlists?.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Type Filters */}
      <div className="flex gap-2 flex-wrap">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => onTypeChange(type.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
              ${searchType === type.id
                ? 'bg-[#1DB954] text-white'
                : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
          >
            {type.label} {type.count > 0 && `(${type.count})`}
          </button>
        ))}
      </div>

      {searching ? (
        <div className="text-center py-12 text-white/50">Searching...</div>
      ) : !hasResults ? (
        <div className="text-center py-12 text-white/50">
          Search for your favorite music
        </div>
      ) : (
        <>
          {/* Tracks */}
          {searchType === 'track' && results.tracks?.length > 0 && (
            <TrackList
              tracks={results.tracks}
              onPlay={onPlayTrack}
              onArtistClick={onArtistClick}
            />
          )}

          {/* Artists */}
          {searchType === 'artist' && results.artists?.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {results.artists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  onClick={() => onArtistClick(artist.id)}
                />
              ))}
            </div>
          )}

          {/* Albums */}
          {searchType === 'album' && results.albums?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onClick={() => onAlbumClick(album.id)}
                />
              ))}
            </div>
          )}

          {/* Playlists */}
          {searchType === 'playlist' && results.playlists?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onClick={() => onPlaylistClick(playlist.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// Library View
function LibraryView({ likedTracks, playlists, onPlayTrack, onPlaylistClick, onArtistClick }) {
  const [activeTab, setActiveTab] = useState('liked');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeTab === 'liked' ? 'bg-[#1DB954] text-white' : 'bg-white/10 hover:bg-white/20 text-white/80'}`}
        >
          <Heart size={16} />
          Liked Songs ({likedTracks.length})
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeTab === 'playlists' ? 'bg-[#1DB954] text-white' : 'bg-white/10 hover:bg-white/20 text-white/80'}`}
        >
          <ListMusic size={16} />
          Playlists ({playlists.length})
        </button>
      </div>

      {activeTab === 'liked' && (
        <TrackList tracks={likedTracks} onPlay={onPlayTrack} onArtistClick={onArtistClick} />
      )}

      {activeTab === 'playlists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onClick={() => onPlaylistClick(playlist.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Artist View
function ArtistView({ data, onPlayTrack, onPlayContext, onArtistClick, onAlbumClick }) {
  const { artist, topTracks, albums, relatedArtists } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Artist Header */}
      <div className="flex items-end gap-6">
        <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl">
          {artist?.artwork ? (
            <img src={artist.artwork} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <User size={64} className="text-white/30" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-white/60 mb-2">Artist</p>
          <h1 className="text-4xl font-bold mb-2">{artist?.name}</h1>
          <p className="text-white/60">{artist?.followers?.toLocaleString()} followers</p>
          {artist?.genres?.length > 0 && (
            <p className="text-sm text-white/40 mt-1">{artist.genres.slice(0, 3).join(' • ')}</p>
          )}
        </div>
        <motion.button
          onClick={() => onPlayContext(artist?.uri)}
          className="ml-auto w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play size={28} className="ml-1 text-black" />
        </motion.button>
      </div>

      {/* Popular Tracks */}
      {topTracks?.length > 0 && (
        <Section title="Popular">
          <TrackList tracks={topTracks.slice(0, 5)} onPlay={(uri) => onPlayTrack(uri)} numbered />
        </Section>
      )}

      {/* Discography */}
      {albums?.length > 0 && (
        <Section title="Discography">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.slice(0, 10).map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => onAlbumClick(album.id)}
                onPlay={() => onPlayContext(album.uri)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Fans Also Like */}
      {relatedArtists?.length > 0 && (
        <Section title="Fans Also Like">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {relatedArtists.map((a) => (
              <ArtistCard
                key={a.id}
                artist={a}
                onClick={() => onArtistClick(a.id)}
              />
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  );
}

// Album View
function AlbumView({ data, onPlayTrack, onPlayContext, onArtistClick }) {
  const { album, tracks } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Album Header */}
      <div className="flex items-end gap-6">
        <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl">
          {album?.artwork ? (
            <img src={album.artwork} alt={album.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <Disc3 size={64} className="text-white/30" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-white/60 mb-2">Album</p>
          <h1 className="text-3xl font-bold mb-2">{album?.name}</h1>
          <button
            onClick={() => album?.artistId && onArtistClick(album.artistId)}
            className="text-white/80 hover:text-white hover:underline"
          >
            {album?.artist}
          </button>
          <p className="text-sm text-white/40 mt-1">
            {album?.releaseDate?.slice(0, 4)} • {album?.totalTracks} songs
          </p>
        </div>
        <motion.button
          onClick={() => onPlayContext(album?.uri)}
          className="ml-auto w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play size={28} className="ml-1 text-black" />
        </motion.button>
      </div>

      {/* Tracks */}
      <TrackList 
        tracks={tracks} 
        onPlay={(uri) => onPlayTrack(uri, album?.uri)} 
        numbered 
        onArtistClick={onArtistClick}
        showAlbum={false}
      />
    </motion.div>
  );
}

// Playlist View
function PlaylistView({ data, onPlayTrack, onPlayContext, onArtistClick }) {
  const { playlist, tracks } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Playlist Header */}
      <div className="flex items-end gap-6">
        <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl">
          {playlist?.artwork ? (
            <img src={playlist.artwork} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <ListMusic size={64} className="text-white/30" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-white/60 mb-2">Playlist</p>
          <h1 className="text-3xl font-bold mb-2">{playlist?.name}</h1>
          <p className="text-white/60">{playlist?.owner}</p>
          {playlist?.description && (
            <p className="text-sm text-white/40 mt-2 max-w-xl" dangerouslySetInnerHTML={{ __html: playlist.description }} />
          )}
        </div>
        <motion.button
          onClick={() => onPlayContext(`spotify:playlist:${playlist?.id}`)}
          className="ml-auto w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play size={28} className="ml-1 text-black" />
        </motion.button>
      </div>

      {/* Tracks */}
      <TrackList 
        tracks={tracks} 
        onPlay={(uri) => onPlayTrack(uri, `spotify:playlist:${playlist?.id}`)} 
        numbered 
        onArtistClick={onArtistClick}
      />
    </motion.div>
  );
}

// Reusable Components

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function TrackCard({ track, onClick, onArtistClick }) {
  const handleClick = (e) => {
    console.log('[TrackCard] Clicked!', track?.name, track?.uri);
    if (onClick) onClick();
  };
  
  return (
    <motion.button
      onClick={handleClick}
      onTouchEnd={handleClick}
      className="group text-left"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="relative aspect-square">
          {track.artwork ? (
            <img src={track.artwork} alt={track.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <Music size={32} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play size={40} className="text-white" fill="white" />
          </div>
        </div>
        <div className="p-3">
          <h4 className="font-medium truncate text-sm">{track.name}</h4>
          <p className="text-xs text-white/60 truncate">{track.artist}</p>
        </div>
      </div>
    </motion.button>
  );
}

function AlbumCard({ album, onClick, onPlay }) {
  return (
    <motion.button
      onClick={onClick}
      className="group text-left"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="relative aspect-square">
          {album.artwork ? (
            <img src={album.artwork} alt={album.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <Disc3 size={32} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play size={40} className="text-white" fill="white" />
          </div>
        </div>
        <div className="p-3">
          <h4 className="font-medium truncate text-sm">{album.name}</h4>
          <p className="text-xs text-white/60 truncate">{album.artist}</p>
          <p className="text-xs text-white/40">{album.releaseDate?.slice(0, 4)}</p>
        </div>
      </div>
    </motion.button>
  );
}

function ArtistCard({ artist, onClick }) {
  const handleClick = (e) => {
    console.log('[ArtistCard] Clicked!', artist?.name, artist?.id);
    if (onClick) onClick();
  };
  
  return (
    <motion.button
      onClick={handleClick}
      onTouchEnd={handleClick}
      className="group text-center"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative w-full aspect-square rounded-full overflow-hidden mb-3">
        {artist.artwork ? (
          <img src={artist.artwork} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/10 flex items-center justify-center">
            <User size={32} className="text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={32} className="text-white" fill="white" />
        </div>
      </div>
      <h4 className="font-medium truncate text-sm">{artist.name}</h4>
      <p className="text-xs text-white/50">Artist</p>
    </motion.button>
  );
}

function PlaylistCard({ playlist, onClick, onPlay }) {
  return (
    <motion.button
      onClick={onClick}
      className="group text-left"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="relative aspect-square">
          {playlist.artwork ? (
            <img src={playlist.artwork} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <ListMusic size={32} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play size={40} className="text-white" fill="white" />
          </div>
        </div>
        <div className="p-3">
          <h4 className="font-medium truncate text-sm">{playlist.name}</h4>
          <p className="text-xs text-white/60 truncate">{playlist.owner || `${playlist.tracksCount} tracks`}</p>
        </div>
      </div>
    </motion.button>
  );
}

function TrackList({ tracks, onPlay, onArtistClick, numbered = false, showAlbum = true }) {
  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="divide-y divide-white/10">
        {tracks.map((track, index) => {
          const handleTrackClick = (e) => {
            e.preventDefault();
            console.log('[TrackList] Track clicked:', track?.name, track?.uri, track?.albumUri);
            if (onPlay && track?.uri) onPlay(track.uri, track.albumUri);
          };
          
          return (
          <motion.button
            key={track.id || index}
            onClick={handleTrackClick}
            onTouchEnd={handleTrackClick}
            className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            {/* Number / Play Icon */}
            <div className="w-8 text-center flex-shrink-0">
              <span className="group-hover:hidden text-white/50 text-sm">
                {numbered ? index + 1 : ''}
              </span>
              <Play size={16} className="hidden group-hover:block mx-auto text-white" fill="white" />
            </div>

            {/* Artwork (if showing album) */}
            {showAlbum && track.artwork && (
              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                <img src={track.artwork} alt={track.name} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{track.name}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (track.artistId && onArtistClick) onArtistClick(track.artistId);
                }}
                className="text-sm text-white/60 truncate hover:text-white hover:underline"
              >
                {track.artist}
              </button>
            </div>

            {/* Album (if showing) */}
            {showAlbum && track.album && (
              <div className="hidden md:block flex-1 min-w-0">
                <p className="text-sm text-white/50 truncate">{track.album}</p>
              </div>
            )}

            {/* Duration */}
            <div className="text-sm text-white/50 w-12 text-right flex-shrink-0">
              {formatDuration(track.duration)}
            </div>
          </motion.button>
        )})}
      </div>
    </div>
  );
}
