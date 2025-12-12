import { useState, useEffect } from 'react';
import { ExternalLink, Music2, LogIn, Clock, ListMusic, Play, Smartphone, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKiosk } from '../../contexts/KioskContext';

export default function SpotifyTab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recentTracks, setRecentTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeView, setActiveView] = useState('recent'); // 'recent' or 'playlists'
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  
  const { launchApp, isAppAvailable, getAppInfo, kioskMode } = useKiosk();
  const [launching, setLaunching] = useState(false);
  
  const appInfo = getAppInfo('spotify');
  const hasNativeApp = appInfo?.available;

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check for OAuth callback success/error in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_success')) {
      checkAuthStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/spotify/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        fetchRecentTracks();
        fetchPlaylists();
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTracks = async () => {
    try {
      const res = await fetch('/api/spotify/recently-played');
      const data = await res.json();
      if (data.tracks) {
        setRecentTracks(data.tracks);
      }
    } catch (e) {
      console.error('Fetch recent tracks error:', e);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/spotify/playlists');
      const data = await res.json();
      if (data.playlists) {
        setPlaylists(data.playlists);
      }
    } catch (e) {
      console.error('Fetch playlists error:', e);
    }
  };

  const handleLogin = () => {
    window.location.href = '/auth/spotify';
  };

  const handleLaunchApp = async () => {
    setLaunching(true);
    try {
      await launchApp('spotify');
    } finally {
      setLaunching(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  // Kiosk mode - show app launcher prominently
  if (kioskMode) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
        {/* App Icon */}
        <div 
          className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)',
            boxShadow: '0 8px 32px rgba(29, 185, 84, 0.4)',
          }}
        >
          <Music2 className="w-12 h-12 text-white" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold mb-2">Spotify</h2>
          <p className="text-white/60 text-lg">
            {hasNativeApp 
              ? 'Launch the Spotify app to listen to your music'
              : 'Open Spotify in your browser'
            }
          </p>
        </div>

        {/* Launch Button */}
        <motion.button
          onClick={handleLaunchApp}
          disabled={launching}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg"
          style={{
            background: '#1DB954',
            color: 'white',
            boxShadow: '0 4px 20px rgba(29, 185, 84, 0.4)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {launching ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : hasNativeApp ? (
            <Smartphone className="w-6 h-6" />
          ) : (
            <Globe className="w-6 h-6" />
          )}
          {launching 
            ? 'Launching...' 
            : hasNativeApp 
              ? 'Open Spotify App' 
              : 'Open in Browser'
          }
        </motion.button>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-white/50">
          {hasNativeApp ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Spotify app detected
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              Native app not found - will open in browser
            </>
          )}
        </div>

        {/* Tip */}
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Tip: Use the floating home button in the corner to return to Radio anytime
        </p>
      </div>
    );
  }

  // Not authenticated - show login (non-kiosk mode)
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div 
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(30, 215, 96, 0.2)',
            border: '1px solid rgba(30, 215, 96, 0.3)',
          }}
        >
          <Music2 className="w-10 h-10 text-green-400" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2">Connect Spotify</h2>
          <p className="text-white/60">
            Sign in to see your recently played tracks and playlists
          </p>
        </div>

        <motion.button
          onClick={handleLogin}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
          style={{
            background: '#1DB954',
            color: 'white',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogIn size={20} />
          Sign in with Spotify
        </motion.button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music2 className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-semibold">Spotify</h2>
        </div>
        <a
          href="https://open.spotify.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
        >
          Open Spotify
          <ExternalLink size={16} />
        </a>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveView('recent'); setSelectedPlaylist(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeView === 'recent' && !selectedPlaylist
              ? 'bg-green-500 text-white' 
              : 'bg-white/10 hover:bg-white/20 text-white/80'
            }`}
        >
          <Clock size={16} />
          Recently Played
        </button>
        <button
          onClick={() => { setActiveView('playlists'); setSelectedPlaylist(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeView === 'playlists' && !selectedPlaylist
              ? 'bg-green-500 text-white' 
              : 'bg-white/10 hover:bg-white/20 text-white/80'
            }`}
        >
          <ListMusic size={16} />
          Your Playlists
        </button>
      </div>

      {/* Selected Playlist Embed */}
      {selectedPlaylist && (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="text-sm text-white/60 hover:text-white"
          >
            ← Back to {activeView === 'playlists' ? 'playlists' : 'recent'}
          </button>
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <iframe
              src={`https://open.spotify.com/embed/playlist/${selectedPlaylist}?utm_source=generator&theme=0`}
              width="100%"
              height="452"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Recently Played */}
      {activeView === 'recent' && !selectedPlaylist && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {recentTracks.length === 0 ? (
            <div className="p-8 text-center text-white/50">
              No recently played tracks found
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {recentTracks.map((track, index) => (
                <motion.a
                  key={`${track.id}-${index}`}
                  href={track.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Artwork */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group">
                    {track.artwork ? (
                      <img 
                        src={track.artwork} 
                        alt={track.album}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <Music2 size={20} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={20} className="text-white" fill="white" />
                    </div>
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{track.name}</h4>
                    <p className="text-sm text-white/60 truncate">{track.artist}</p>
                  </div>

                  {/* Time ago */}
                  <div className="text-xs text-white/40 flex-shrink-0">
                    {formatTimeAgo(track.playedAt)}
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlists Grid */}
      {activeView === 'playlists' && !selectedPlaylist && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.length === 0 ? (
            <div className="col-span-full p-8 text-center text-white/50">
              No playlists found
            </div>
          ) : (
            playlists.map((playlist, index) => (
              <motion.button
                key={playlist.id}
                onClick={() => setSelectedPlaylist(playlist.id)}
                className="group text-left"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <div 
                  className="rounded-xl overflow-hidden p-3 transition-all group-hover:bg-white/10"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {/* Artwork */}
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                    {playlist.artwork ? (
                      <img 
                        src={playlist.artwork} 
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <ListMusic size={32} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: '#1DB954' }}
                      >
                        <Play size={24} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                  </div>

                  {/* Playlist info */}
                  <h4 className="font-medium truncate text-sm">{playlist.name}</h4>
                  <p className="text-xs text-white/50">{playlist.tracksCount} tracks</p>
                </div>
              </motion.button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
