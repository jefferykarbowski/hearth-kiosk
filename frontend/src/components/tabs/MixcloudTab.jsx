import { useState, useEffect } from 'react';
import { ExternalLink, Headphones, LogIn, Clock, Heart, Radio, Play, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKiosk } from '../../contexts/KioskContext';

export default function MixcloudTab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [feed, setFeed] = useState([]);
  const [activeView, setActiveView] = useState('history'); // 'history', 'favorites', 'feed'
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState(null);

  const { launchApp, getAppInfo, kioskMode } = useKiosk();
  const [launching, setLaunching] = useState(false);
  
  const appInfo = getAppInfo('mixcloud');
  const hasNativeApp = appInfo?.available;

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check for OAuth callback success/error in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mixcloud_success')) {
      checkAuthStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/mixcloud/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        fetchHistory();
        fetchFavorites();
        fetchFeed();
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/mixcloud/history');
      const data = await res.json();
      if (data.shows) setHistory(data.shows);
    } catch (e) {
      console.error('Fetch history error:', e);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/mixcloud/favorites');
      const data = await res.json();
      if (data.shows) setFavorites(data.shows);
    } catch (e) {
      console.error('Fetch favorites error:', e);
    }
  };

  const fetchFeed = async () => {
    try {
      const res = await fetch('/api/mixcloud/feed');
      const data = await res.json();
      if (data.shows) setFeed(data.shows);
    } catch (e) {
      console.error('Fetch feed error:', e);
    }
  };

  const handleLogin = () => {
    window.location.href = '/auth/mixcloud';
  };

  const handleLaunchApp = async () => {
    setLaunching(true);
    try {
      await launchApp('mixcloud');
    } finally {
      setLaunching(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  const getActiveList = () => {
    switch (activeView) {
      case 'favorites': return favorites;
      case 'feed': return feed;
      default: return history;
    }
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
            background: 'linear-gradient(135deg, #5000ff 0%, #52aeff 100%)',
            boxShadow: '0 8px 32px rgba(80, 0, 255, 0.4)',
          }}
        >
          <Headphones className="w-12 h-12 text-white" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold mb-2">Mixcloud</h2>
          <p className="text-white/60 text-lg">
            {hasNativeApp 
              ? 'Launch Mixcloud to discover DJ mixes and radio shows'
              : 'Open Mixcloud in your browser to discover DJ mixes and radio shows'
            }
          </p>
        </div>

        {/* Launch Button */}
        <motion.button
          onClick={handleLaunchApp}
          disabled={launching}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg"
          style={{
            background: 'linear-gradient(135deg, #5000ff 0%, #52aeff 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(80, 0, 255, 0.4)',
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
          ) : (
            <Globe className="w-6 h-6" />
          )}
          {launching 
            ? 'Opening...' 
            : 'Open Mixcloud'
          }
        </motion.button>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-white/50">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          Opens in browser
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
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <Headphones className="w-10 h-10 text-indigo-400" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2">Connect Mixcloud</h2>
          <p className="text-white/60">
            Sign in to see your listening history, favorites, and feed
          </p>
        </div>

        <motion.button
          onClick={handleLogin}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
          style={{
            background: 'linear-gradient(135deg, #5000ff 0%, #52aeff 100%)',
            color: 'white',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogIn size={20} />
          Sign in with Mixcloud
        </motion.button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-semibold">Mixcloud</h2>
        </div>
        <a
          href="https://www.mixcloud.com/discover/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors"
        >
          Open Mixcloud
          <ExternalLink size={16} />
        </a>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveView('history'); setSelectedShow(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeView === 'history' && !selectedShow
              ? 'bg-indigo-500 text-white' 
              : 'bg-white/10 hover:bg-white/20 text-white/80'
            }`}
        >
          <Clock size={16} />
          History
        </button>
        <button
          onClick={() => { setActiveView('favorites'); setSelectedShow(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeView === 'favorites' && !selectedShow
              ? 'bg-indigo-500 text-white' 
              : 'bg-white/10 hover:bg-white/20 text-white/80'
            }`}
        >
          <Heart size={16} />
          Favorites
        </button>
        <button
          onClick={() => { setActiveView('feed'); setSelectedShow(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeView === 'feed' && !selectedShow
              ? 'bg-indigo-500 text-white' 
              : 'bg-white/10 hover:bg-white/20 text-white/80'
            }`}
        >
          <Radio size={16} />
          Feed
        </button>
      </div>

      {/* Selected Show Embed */}
      {selectedShow && (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedShow(null)}
            className="text-sm text-white/60 hover:text-white"
          >
            ← Back to {activeView}
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
              width="100%"
              height="400"
              src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(selectedShow)}`}
              frameBorder="0"
              allow="autoplay"
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Shows List */}
      {!selectedShow && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {getActiveList().length === 0 ? (
            <div className="p-8 text-center text-white/50">
              No {activeView === 'history' ? 'listening history' : activeView === 'favorites' ? 'favorites' : 'feed items'} found
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {getActiveList().map((show, index) => (
                <motion.button
                  key={show.key || index}
                  onClick={() => setSelectedShow(show.key)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Artwork */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group">
                    {show.artwork ? (
                      <img 
                        src={show.artwork} 
                        alt={show.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <Headphones size={24} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={24} className="text-white" fill="white" />
                    </div>
                  </div>

                  {/* Show info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{show.name}</h4>
                    <p className="text-sm text-white/60 truncate">{show.artist}</p>
                    {show.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {show.tags.map((tag, i) => (
                          <span 
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  {show.duration && (
                    <div className="text-xs text-white/40 flex-shrink-0">
                      {formatDuration(show.duration)}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
