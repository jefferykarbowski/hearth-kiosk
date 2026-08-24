import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_STATIONS } from '../config/stations';

const RadioContext = createContext(null);

export function RadioProvider({ children }) {
  const [stations] = useState(DEFAULT_STATIONS);
  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metadata, setMetadata] = useState({ artist: '', title: '', artwork: null });
  const [volume, setVolume] = useState(1.0);
  const [activeTab, setActiveTab] = useState('radio');
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const screensaverTimeoutRef = useRef(null);

  // Screensaver timeout (1 hour = 3600000ms)
  const SCREENSAVER_TIMEOUT = 60 * 60 * 1000;

  // Reset activity timer
  const resetActivity = useCallback(() => {
    setLastActivityTime(Date.now());
    setShowScreensaver(false);
  }, []);

  // Check for inactivity and show screensaver
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      // Show screensaver if not playing and inactive for timeout period
      if (!isPlaying && timeSinceActivity >= SCREENSAVER_TIMEOUT) {
        setShowScreensaver(true);
      }
    };

    // Check every minute
    const interval = setInterval(checkInactivity, 60000);

    // Also check immediately when isPlaying changes
    if (isPlaying) {
      setShowScreensaver(false);
      setLastActivityTime(Date.now());
    }

    return () => clearInterval(interval);
  }, [isPlaying, lastActivityTime]);

  // Dismiss screensaver handler
  const dismissScreensaver = useCallback(() => {
    setShowScreensaver(false);
    setLastActivityTime(Date.now());
  }, []);

  // Manually trigger screensaver
  const triggerScreensaver = useCallback(() => {
    setShowScreensaver(true);
  }, []);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    // Define handlers so we can remove them on cleanup
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      // Properly remove event listeners to prevent memory leaks
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // WebSocket connection for metadata with exponential backoff
  useEffect(() => {
    let reconnectAttempts = 0;
    let reconnectTimeout = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.DEV ? 'localhost:3001' : window.location.host;
      const wsUrl = `${protocol}//${host}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0; // Reset on successful connection
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metadata') {
            setMetadata({
              artist: data.artist || '',
              title: data.title || '',
              artwork: data.artwork || null
            });
          } else if (data.type === 'state' && data.metadata) {
            setMetadata(data.metadata);
          } else if (data.type === 'radio-command') {
            // Handle remote radio commands
            if (data.action === 'play' && data.stationId) {
              const station = DEFAULT_STATIONS.find(s => s.id === data.stationId);
              if (station && audioRef.current) {
                console.log('Remote command: playing station', station.name);
                audioRef.current.pause();
                audioRef.current.src = station.streamUrl;
                audioRef.current.play().catch(e => console.error('Play error:', e));
                setCurrentStation(station);
                setMetadata({ artist: '', title: '', artwork: null });
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'play', streamUrl: station.streamUrl }));
                }
              }
            } else if (data.action === 'stop') {
              console.log('Remote command: stopping playback');
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
              }
              setCurrentStation(null);
              setIsPlaying(false);
              setMetadata({ artist: '', title: '', artwork: null });
            }
          } else if (data.type === 'switch-tab') {
            // Handle remote tab switching
            console.log('Remote command: switching to tab', data.tab);
            if (data.tab && ['radio', 'spotify', 'mixcloud'].includes(data.tab)) {
              setActiveTab(data.tab);
            }
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };

      wsRef.current.onclose = () => {
        if (isUnmounted) return;
        // Exponential backoff: 3s, 6s, 12s, 24s, max 60s
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 60000);
        reconnectAttempts++;
        console.log(`WebSocket closed, reconnecting in ${delay / 1000}s...`);
        reconnectTimeout = setTimeout(connectWebSocket, delay);
      };

      wsRef.current.onerror = (e) => {
        console.error('WebSocket error:', e);
      };
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playStation = useCallback(async (station) => {
    if (!audioRef.current) return;

    // Pause Spotify before playing radio
    try {
      await fetch('/api/spotify/pause', { method: 'PUT' });
    } catch (e) {
      console.log('Could not pause Spotify:', e);
    }

    audioRef.current.pause();
    audioRef.current.src = station.streamUrl;
    audioRef.current.play().catch(e => console.error('Play error:', e));
    
    setCurrentStation(station);
    setMetadata({ artist: '', title: '', artwork: null });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'play', streamUrl: station.streamUrl }));
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentStation(null);
    setIsPlaying(false);
    setMetadata({ artist: '', title: '', artwork: null });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else if (currentStation) {
      audioRef.current.play().catch(e => console.error('Play error:', e));
    }
  }, [isPlaying, currentStation]);

  const nextStation = useCallback(() => {
    if (!currentStation) {
      playStation(stations[0]);
      return;
    }
    const idx = stations.findIndex(s => s.id === currentStation.id);
    const nextIdx = (idx + 1) % stations.length;
    playStation(stations[nextIdx]);
  }, [currentStation, stations, playStation]);

  const prevStation = useCallback(() => {
    if (!currentStation) {
      playStation(stations[stations.length - 1]);
      return;
    }
    const idx = stations.findIndex(s => s.id === currentStation.id);
    const prevIdx = (idx - 1 + stations.length) % stations.length;
    playStation(stations[prevIdx]);
  }, [currentStation, stations, playStation]);

  const value = {
    stations,
    currentStation,
    isPlaying,
    metadata,
    volume,
    activeTab,
    showScreensaver,
    setVolume,
    setActiveTab,
    playStation,
    stop,
    togglePlay,
    nextStation,
    prevStation,
    dismissScreensaver,
    resetActivity,
    triggerScreensaver
  };

  return (
    <RadioContext.Provider value={value}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('useRadio must be used within a RadioProvider');
  }
  return context;
}
