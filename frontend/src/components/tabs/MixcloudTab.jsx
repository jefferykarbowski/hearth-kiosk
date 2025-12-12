import { useState, useEffect } from 'react';
import { Headphones, LogIn, Clock, Heart, ListMusic, Play, Search, X, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MixcloudTab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [newUploads, setNewUploads] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [playlistShows, setPlaylistShows] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [activeView, setActiveView] = useState('search');
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

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
        fetchPlaylists();
        fetchNewUploads();
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

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/mixcloud/playlists');
      const data = await res.json();
      if (data.playlists) setPlaylists(data.playlists);
    } catch (e) {
      console.error('Fetch playlists error:', e);
    }
  };

  const fetchNewUploads = async () => {
    try {
      const res = await fetch('/api/mixcloud/feed');
      const data = await res.json();
      if (data.shows) setNewUploads(data.shows);
    } catch (e) {
      console.error('Fetch new uploads error:', e);
    }
  };

  const fetchPlaylistShows = async (playlist) => {
    // Extract user and slug from playlist key like "/username/playlists/playlist-name/"
    const parts = playlist.key.split('/').filter(Boolean);
    if (parts.length >= 3) {
      const user = parts[0];
      const slug = parts[2];
      try {
        const res = await fetch(`/api/mixcloud/playlist/${user}/${slug}`);
        const data = await res.json();
        if (data.shows) {
          setPlaylistShows(data.shows);
          setSelectedPlaylist(playlist);
          setActiveView('playlist');
        }
      } catch (e) {
        console.error('Fetch playlist shows error:', e);
      }
    }
  };

  const handleLogin = () => {
    window.location.href = '/auth/mixcloud';
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setActiveView('search');
    setSelectedShow(null);

    try {
      const res = await fetch(`/api/mixcloud/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (isAuthenticated) {
      setActiveView('history');
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
      case 'history': return history;
      case 'newUploads': return newUploads;
      case 'search': return searchResults;
      case 'playlist': return playlistShows;
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Headphones className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-semibold">Mixcloud</h2>
          </div>
          {!isAuthenticated && (
            <motion.button
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, #5000ff 0%, #52aeff 100%)',
                color: 'white',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogIn size={16} />
              Sign in for history
            </motion.button>
          )}
        </div>

        {/* Search Bar - Always available (Mixcloud search is public) */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search DJ mixes, radio shows, artists..."
              className="w-full pl-10 pr-10 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <motion.button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-6 py-3 rounded-full font-medium"
            style={{
              background: 'linear-gradient(135deg, #5000ff 0%, #52aeff 100%)',
              color: 'white',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {searching ? 'Searching...' : 'Search'}
          </motion.button>
        </form>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 flex-wrap">
        {searchResults.length > 0 && (
          <button
            onClick={() => { setActiveView('search'); setSelectedShow(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${activeView === 'search'
                ? 'bg-indigo-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
          >
            <Search size={16} />
            Search ({searchResults.length})
          </button>
        )}
        {isAuthenticated && (
          <>
            <button
              onClick={() => { setActiveView('history'); setSelectedShow(null); setSelectedPlaylist(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeView === 'history'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
            >
              <Clock size={16} />
              History
            </button>
            <button
              onClick={() => { setActiveView('favorites'); setSelectedShow(null); setSelectedPlaylist(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeView === 'favorites'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
            >
              <Heart size={16} />
              Favorites
            </button>
            <button
              onClick={() => { setActiveView('playlists'); setSelectedShow(null); setSelectedPlaylist(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeView === 'playlists'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
            >
              <ListMusic size={16} />
              Playlists
            </button>
            <button
              onClick={() => { setActiveView('newUploads'); setSelectedShow(null); setSelectedPlaylist(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeView === 'newUploads'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
            >
              <Upload size={16} />
              New Uploads
            </button>
          </>
        )}
        {selectedPlaylist && (
          <button
            onClick={() => { setActiveView('playlist'); setSelectedShow(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${activeView === 'playlist'
                ? 'bg-indigo-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
          >
            <ListMusic size={16} />
            {selectedPlaylist.name}
          </button>
        )}
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

      {/* Playlists Grid */}
      {activeView === 'playlists' && !selectedShow && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.length === 0 ? (
            <div className="col-span-full p-8 text-center text-white/50">
              No playlists found
            </div>
          ) : (
            playlists.map((playlist, index) => (
              <motion.button
                key={playlist.key}
                onClick={() => fetchPlaylistShows(playlist)}
                className="group text-left"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className="rounded-xl overflow-hidden p-4 transition-all group-hover:bg-white/10"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: 'linear-gradient(135deg, #5000ff 0%, #52aeff 100%)' }}
                  >
                    <ListMusic size={24} className="text-white" />
                  </div>
                  <h4 className="font-medium truncate text-sm">{playlist.name}</h4>
                  <p className="text-xs text-white/50">{playlist.showCount || 0} shows</p>
                </div>
              </motion.button>
            ))
          )}
        </div>
      )}

      {/* Shows List */}
      {!selectedShow && activeView !== 'playlists' && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {activeView === 'search' && searchResults.length === 0 && !searching ? (
            <div className="p-8 text-center text-white/50">
              {searchQuery ? 'No results found' : 'Search for DJ mixes and radio shows'}
            </div>
          ) : getActiveList().length === 0 ? (
            <div className="p-8 text-center text-white/50">
              {activeView === 'history' ? 'No listening history' :
               activeView === 'favorites' ? 'No favorites yet' :
               activeView === 'newUploads' ? 'No new uploads from DJs you follow' :
               activeView === 'playlist' ? 'No shows in this playlist' : 'No results'}
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
                  transition={{ delay: index * 0.03 }}
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
                      <div className="flex gap-1 mt-1 flex-wrap">
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
