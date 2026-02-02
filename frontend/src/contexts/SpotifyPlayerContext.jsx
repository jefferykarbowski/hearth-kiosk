import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SpotifyPlayerContext = createContext(null);

export function useSpotifyPlayer() {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error('useSpotifyPlayer must be used within SpotifyPlayerProvider');
  }
  return context;
}

export function SpotifyPlayerProvider({ children }) {
  // SDK & Player state
  const [sdkReady, setSdkReady] = useState(false);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  
  // Playback state from SDK
  const [playerState, setPlayerState] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0 = off, 1 = context, 2 = track
  const [volume, setVolume] = useState(100);
  
  // Token management
  const [accessToken, setAccessToken] = useState(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null);
  const tokenRefreshTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const positionIntervalRef = useRef(null);
  
  // Load Spotify SDK script
  useEffect(() => {
    if (window.Spotify) {
      setSdkReady(true);
      return;
    }
    
    // Set up callback for when SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('[SpotifyPlayer] SDK Ready');
      setSdkReady(true);
    };
    
    // Check if script is already loading
    if (document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
      return;
    }
    
    // Load the SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Cleanup is handled elsewhere
    };
  }, []);
  
  // Fetch access token from backend
  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch('/api/spotify/token');
      if (!res.ok) {
        if (res.status === 401) {
          setError('Not authenticated');
          return null;
        }
        throw new Error('Failed to fetch token');
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      setTokenExpiresAt(data.expiresAt);
      setError(null);
      return data.accessToken;
    } catch (e) {
      console.error('[SpotifyPlayer] Token fetch error:', e);
      setError('Failed to get access token');
      return null;
    }
  }, []);
  
  // Schedule token refresh before expiry
  const scheduleTokenRefresh = useCallback(() => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    if (!tokenExpiresAt) return;
    
    // Refresh 5 minutes before expiry
    const refreshIn = tokenExpiresAt - Date.now() - (5 * 60 * 1000);
    if (refreshIn > 0) {
      console.log(`[SpotifyPlayer] Scheduling token refresh in ${Math.round(refreshIn / 1000 / 60)} minutes`);
      tokenRefreshTimeoutRef.current = setTimeout(async () => {
        console.log('[SpotifyPlayer] Refreshing token...');
        const newToken = await fetchToken();
        if (newToken && player) {
          // Note: The SDK doesn't have a method to update the token directly,
          // but it will use the getOAuthToken callback on next API call
          console.log('[SpotifyPlayer] Token refreshed');
        }
      }, refreshIn);
    }
  }, [tokenExpiresAt, fetchToken, player]);
  
  useEffect(() => {
    scheduleTokenRefresh();
    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, [scheduleTokenRefresh]);
  
  // Initialize player when SDK is ready
  const initializePlayer = useCallback(async () => {
    if (!sdkReady || !window.Spotify) {
      console.log('[SpotifyPlayer] SDK not ready yet');
      return;
    }
    
    // Fetch initial token
    const token = await fetchToken();
    if (!token) {
      console.log('[SpotifyPlayer] No token available');
      return;
    }
    
    console.log('[SpotifyPlayer] Initializing player...');
    
    const spotifyPlayer = new window.Spotify.Player({
      name: 'Kitchen Kiosk',
      getOAuthToken: async (cb) => {
        // Check if token needs refresh
        if (tokenExpiresAt && tokenExpiresAt < Date.now() + 60000) {
          const newToken = await fetchToken();
          cb(newToken || accessToken);
        } else {
          cb(accessToken);
        }
      },
      volume: 1.0
    });
    
    // Error handling
    spotifyPlayer.addListener('initialization_error', ({ message }) => {
      console.error('[SpotifyPlayer] Initialization error:', message);
      setError(`Initialization error: ${message}`);
    });
    
    spotifyPlayer.addListener('authentication_error', ({ message }) => {
      console.error('[SpotifyPlayer] Authentication error:', message);
      setError(`Authentication error: ${message}`);
      setIsReady(false);
    });
    
    spotifyPlayer.addListener('account_error', ({ message }) => {
      console.error('[SpotifyPlayer] Account error:', message);
      setError(`Account error: ${message}. Spotify Premium is required.`);
    });
    
    spotifyPlayer.addListener('playback_error', ({ message }) => {
      console.error('[SpotifyPlayer] Playback error:', message);
      // Don't set error state for playback errors, just log them
    });
    
    // Playback status updates
    spotifyPlayer.addListener('player_state_changed', (state) => {
      if (!state) {
        console.log('[SpotifyPlayer] No playback state');
        setPlayerState(null);
        setCurrentTrack(null);
        setIsPlaying(false);
        return;
      }
      
      console.log('[SpotifyPlayer] State changed:', state.paused ? 'paused' : 'playing');
      setPlayerState(state);
      
      const track = state.track_window?.current_track;
      if (track) {
        setCurrentTrack({
          id: track.id,
          name: track.name,
          artist: track.artists?.map(a => a.name).join(', '),
          artistId: track.artists?.[0]?.uri?.split(':')[2],
          album: track.album?.name,
          albumId: track.album?.uri?.split(':')[2],
          artwork: track.album?.images?.[0]?.url,
          duration: track.duration_ms,
          uri: track.uri
        });
        setDuration(track.duration_ms);
      }
      
      setIsPlaying(!state.paused);
      setPosition(state.position);
      setShuffle(state.shuffle);
      setRepeatMode(state.repeat_mode);
    });
    
    // Ready
    spotifyPlayer.addListener('ready', ({ device_id }) => {
      console.log('[SpotifyPlayer] Ready with Device ID:', device_id);
      setDeviceId(device_id);
      setIsReady(true);
      setError(null);
    });
    
    // Not Ready
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('[SpotifyPlayer] Device has gone offline:', device_id);
      setIsReady(false);
      
      // Attempt reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[SpotifyPlayer] Attempting reconnect...');
        spotifyPlayer.connect();
      }, 5000);
    });
    
    // Connect to the player
    const success = await spotifyPlayer.connect();
    if (success) {
      console.log('[SpotifyPlayer] Connected successfully');
    } else {
      console.error('[SpotifyPlayer] Failed to connect');
      setError('Failed to connect to Spotify');
    }
    
    setPlayer(spotifyPlayer);
    
    return spotifyPlayer;
  }, [sdkReady, fetchToken, accessToken, tokenExpiresAt]);
  
  // Local position tracking for smoother progress bar
  useEffect(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
    }
    
    if (isPlaying && duration > 0) {
      positionIntervalRef.current = setInterval(() => {
        setPosition(prev => {
          const next = prev + 200;
          return next > duration ? duration : next;
        });
      }, 200);
    }
    
    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [isPlaying, duration]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (player) {
        console.log('[SpotifyPlayer] Disconnecting player');
        player.disconnect();
      }
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [player]);
  
  // Player controls
  const play = useCallback(async (options = {}) => {
    if (!deviceId || !accessToken) {
      console.error('[SpotifyPlayer] Cannot play: no device or token');
      return false;
    }
    
    try {
      const body = {};
      if (options.uris) body.uris = options.uris;
      else if (options.uri) body.uris = [options.uri];
      if (options.context_uri) body.context_uri = options.context_uri;
      if (options.offset) body.offset = options.offset;
      if (options.position_ms) body.position_ms = options.position_ms;
      
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });
      
      return res.ok || res.status === 204;
    } catch (e) {
      console.error('[SpotifyPlayer] Play error:', e);
      return false;
    }
  }, [deviceId, accessToken]);
  
  const pause = useCallback(async () => {
    if (player) {
      await player.pause();
      return true;
    }
    // API fallback
    try {
      const res = await fetch('/api/spotify/pause', { method: 'PUT' });
      if (res.ok) setIsPlaying(false);
      return res.ok;
    } catch (e) {
      console.error('[SpotifyPlayer] Pause error:', e);
      return false;
    }
  }, [player]);
  
  const resume = useCallback(async () => {
    if (player) {
      await player.resume();
      return true;
    }
    // API fallback
    try {
      const res = await fetch('/api/spotify/play', { method: 'PUT' });
      if (res.ok) setIsPlaying(true);
      return res.ok;
    } catch (e) {
      console.error('[SpotifyPlayer] Resume error:', e);
      return false;
    }
  }, [player]);
  
  const togglePlay = useCallback(async () => {
    if (player) {
      await player.togglePlay();
      return true;
    }
    // API fallback
    try {
      if (isPlaying) {
        const res = await fetch('/api/spotify/pause', { method: 'PUT' });
        if (res.ok) setIsPlaying(false);
        return res.ok;
      } else {
        const res = await fetch('/api/spotify/play', { method: 'PUT' });
        if (res.ok) setIsPlaying(true);
        return res.ok;
      }
    } catch (e) {
      console.error('[SpotifyPlayer] Toggle play error:', e);
      return false;
    }
  }, [player, isPlaying]);
  
  const skipNext = useCallback(async () => {
    if (player) {
      await player.nextTrack();
      return true;
    }
    // API fallback
    try {
      const res = await fetch('/api/spotify/next', { method: 'POST' });
      return res.ok;
    } catch (e) {
      console.error('[SpotifyPlayer] Skip next error:', e);
      return false;
    }
  }, [player]);
  
  const skipPrev = useCallback(async () => {
    if (player) {
      await player.previousTrack();
      return true;
    }
    // API fallback
    try {
      const res = await fetch('/api/spotify/prev', { method: 'POST' });
      return res.ok;
    } catch (e) {
      console.error('[SpotifyPlayer] Skip prev error:', e);
      return false;
    }
  }, [player]);
  
  const seek = useCallback(async (positionMs) => {
    setPosition(positionMs); // Optimistic update
    if (player) {
      await player.seek(positionMs);
      return true;
    }
    // API fallback
    try {
      const res = await fetch(`/api/spotify/seek/${Math.round(positionMs)}`, { method: 'PUT' });
      return res.ok;
    } catch (e) {
      console.error('[SpotifyPlayer] Seek error:', e);
      return false;
    }
  }, [player]);
  
  const setPlayerVolume = useCallback(async (percent) => {
    if (!player) return false;
    const vol = percent / 100;
    await player.setVolume(vol);
    setVolume(percent);
    return true;
  }, [player]);
  
  const toggleShuffle = useCallback(async () => {
    if (!accessToken) return false;
    const newState = !shuffle;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newState}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setShuffle(newState);
      return true;
    } catch (e) {
      console.error('[SpotifyPlayer] Shuffle toggle error:', e);
      return false;
    }
  }, [accessToken, shuffle]);
  
  const cycleRepeat = useCallback(async () => {
    if (!accessToken) return false;
    const states = ['off', 'context', 'track'];
    const nextState = states[(repeatMode + 1) % 3];
    try {
      await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${nextState}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setRepeatMode((repeatMode + 1) % 3);
      return true;
    } catch (e) {
      console.error('[SpotifyPlayer] Repeat cycle error:', e);
      return false;
    }
  }, [accessToken, repeatMode]);
  
  // Transfer playback to this device
  const transferPlayback = useCallback(async (startPlaying = false) => {
    if (!deviceId || !accessToken) return false;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_ids: [deviceId], play: startPlaying })
      });
      return res.ok || res.status === 204;
    } catch (e) {
      console.error('[SpotifyPlayer] Transfer error:', e);
      return false;
    }
  }, [deviceId, accessToken]);
  
  // Disconnect player
  const disconnect = useCallback(() => {
    if (player) {
      player.disconnect();
      setIsReady(false);
      setDeviceId(null);
    }
  }, [player]);
  
  const value = {
    // State
    sdkReady,
    isReady,
    deviceId,
    error,
    
    // Playback state
    playerState,
    currentTrack,
    isPlaying,
    position,
    duration,
    shuffle,
    repeatMode,
    volume,
    
    // Methods
    initializePlayer,
    play,
    pause,
    resume,
    togglePlay,
    skipNext,
    skipPrev,
    seek,
    setVolume: setPlayerVolume,
    toggleShuffle,
    cycleRepeat,
    transferPlayback,
    disconnect
  };
  
  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
