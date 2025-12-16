import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const RadioContext = createContext(null);

// Full station list using local logos from /logos/ folder
const DEFAULT_STATIONS = [
  {
    id: 'wcbn',
    name: 'WCBN',
    streamUrl: 'http://floyd.wcbn.org:8000/wcbn-hd.mp3',
    logo: '/logos/wcbn.png',
    genre: 'FM Ann Arbor'
  },
  {
    id: 'kfjc',
    name: 'KFJC',
    streamUrl: 'http://netcast.kfjc.org/kfjc-320k-aac',
    logo: '/logos/kfjc.gif',
    genre: 'The Wave of the West'
  },
  {
    id: 'kalx',
    name: 'KALX',
    streamUrl: 'https://stream.kalx.berkeley.edu:8443/kalx.flac',
    logo: '/logos/kalx.png',
    genre: 'UC Berkeley'
  },
  {
    id: 'wfmu',
    name: 'WFMU',
    streamUrl: 'http://stream0.wfmu.org/freeform-128k',
    logo: '/logos/wfmu.svg',
    genre: 'Freeform • Jersey City'
  },
  {
    id: 'kcrw',
    name: 'KCRW',
    streamUrl: 'http://kcrw.streamguys1.com/kcrw_192k_mp3_on_air',
    logo: '/logos/kcrw.png',
    genre: 'Always on LA'
  },
  {
    id: 'nts1',
    name: 'NTS 1',
    streamUrl: 'https://stream-relay-geo.ntslive.net/stream',
    logo: '/logos/nts.png',
    genre: 'NTS Radio • London'
  },
  {
    id: 'nts2',
    name: 'NTS 2',
    streamUrl: 'https://stream-relay-geo.ntslive.net/stream2',
    logo: '/logos/nts.png',
    genre: 'NTS Radio • Channel 2'
  },
  {
    id: 'wtul',
    name: 'WTUL',
    streamUrl: 'http://129.81.255.83:8000/stream',
    logo: '/logos/wtul.png',
    genre: 'New Orleans'
  },
  {
    id: 'wmbr',
    name: 'WMBR',
    streamUrl: 'http://wmbr.org:8000/hi',
    logo: '/logos/wmbr.png',
    genre: 'MIT Campus Radio'
  },
  {
    id: 'krbx',
    name: 'KRBX',
    streamUrl: 'http://radioboise-ice.streamguys1.com/live',
    logo: '/logos/krbx.png',
    genre: 'Radio Boise'
  },
  {
    id: 'kzsc',
    name: 'KZSC',
    streamUrl: 'https://kzscfms1-geckohost.radioca.st/kzschigh',
    logo: '/logos/kzsc.png',
    genre: 'Santa Cruz • 88.1 FM'
  },
  {
    id: 'kusf',
    name: 'KUSF',
    streamUrl: 'http://104.236.145.45:8000/stream',
    logo: '/logos/kusf.png',
    genre: 'San Francisco Since 1977'
  },
  {
    id: 'freeform-portland',
    name: 'Freeform Portland',
    streamUrl: 'http://listen.freeformportland.org:8000/stream',
    logo: '/logos/freeform-portland.png',
    genre: 'Community Driven Radio'
  },
  {
    id: 'kxci',
    name: 'KXCI',
    streamUrl: 'https://ais-sa1.streamon.fm/7005_48k.aac',
    logo: '/logos/kxci.png',
    genre: "Tucson's Community Radio"
  },
  {
    id: 'kmud',
    name: 'KMUD',
    streamUrl: 'https://kmud.streamguys1.com/live',
    logo: '/logos/kmud.png',
    genre: 'Redwood Community Radio'
  },
  {
    id: 'radio-free-brooklyn',
    name: 'Radio Free Brooklyn',
    streamUrl: 'http://192.111.140.6:9300/stream',
    logo: '/logos/radio-free-brooklyn.png',
    genre: 'What Brooklyn Sounds Like'
  },
  {
    id: 'chirp',
    name: 'CHIRP Radio',
    streamUrl: 'http://chirpradio.org/stream',
    logo: '/logos/chirp.png',
    genre: 'Chicago Independent Radio'
  },
  {
    id: 'kuoi',
    name: 'KUOI-FM',
    streamUrl: 'https://s2.radio.co/sedf30688d/listen',
    logo: '/logos/kuoi.png',
    genre: 'University of Idaho'
  },
  {
    id: 'kbga',
    name: 'KBGA',
    streamUrl: 'http://edge.mixlr.com/channel/veouw',
    logo: '/logos/kbga.png',
    genre: 'Missoula • Real DJs, Live Music'
  },
  {
    id: 'wluw',
    name: 'WLUW-FM',
    streamUrl: 'https://wluw.streamguys1.com/stream.mp3',
    logo: '/logos/wluw.png',
    genre: 'Loyola University Chicago'
  },
  {
    id: 'koto',
    name: 'KOTO',
    streamUrl: 'http://playerservices.streamtheworld.com/api/livestream-redirect/KOTOFM.mp3',
    logo: '/logos/koto.png',
    genre: 'A Rare Medium, Well-Done'
  },
  {
    id: 'ckut',
    name: 'CKUT',
    streamUrl: 'https://delray.ckut.ca:8001/ckut-live-128',
    logo: '/logos/ckut.png',
    genre: 'Montreal Community Radio'
  },
  {
    id: 'wzbt',
    name: 'WZBT 91.1',
    streamUrl: 'https://wzbt.streamguys1.com/live',
    logo: '/logos/wzbt.png',
    genre: "Gettysburg's Best New Music"
  },
  {
    id: 'wmrw',
    name: 'WMRW-LP',
    streamUrl: 'http://69.54.28.12:8951/listen',
    logo: '/logos/wmrw.png',
    genre: 'LP Warren'
  },
  {
    id: 'wruv',
    name: 'WRUV',
    streamUrl: 'http://icecast.uvm.edu:8005/wruv_fm_256',
    logo: '/logos/wruv.png',
    genre: 'WRUV 90.1 FM'
  },
  {
    id: 'kdvs',
    name: 'KDVS',
    streamUrl: 'https://archives.kdvs.org/stream',
    logo: '/logos/kdvs.png',
    genre: 'Freeform • Davis, CA'
  },
  {
    id: 'kspc',
    name: 'KSPC',
    streamUrl: 'http://nebula.shoutca.st:8160/stream128',
    logo: '/logos/kspc.png',
    genre: 'College Radio • Los Angeles'
  },
  {
    id: 'khdx',
    name: 'KHDX Radio',
    streamUrl: 'http://streaming.radio.co/s662abb673/listen',
    logo: '/logos/khdx.png',
    genre: 'Hendrix College • Conway, AR'
  },
  {
    id: 'wdcv',
    name: 'WDCV-FM',
    streamUrl: 'https://us2.internet-radio.com/proxy/wdcvfm?mp=/live',
    logo: '/logos/wdcv.png',
    genre: 'Voice of Dickinson College'
  },
  {
    id: 'kfai',
    name: 'KFAI-FM',
    streamUrl: 'http://stream.kfai.org:8080/kfai-1',
    logo: '/logos/kfai.png',
    genre: 'Minneapolis + St. Paul'
  },
  {
    id: 'kcpr',
    name: 'KCPR',
    streamUrl: 'https://ice23.securenetsystems.net:80/KCPR2',
    logo: '/logos/kcpr.png',
    genre: 'Cal Poly San Luis Obispo'
  },
  {
    id: 'kzum',
    name: 'KZUM',
    streamUrl: 'http://us4.internet-radio.com:8030/stream',
    logo: '/logos/kzum.png',
    genre: 'Local Radio • Lincoln, NE'
  },
  {
    id: 'wknc',
    name: 'WKNC',
    streamUrl: 'http://173.193.205.96:7430/stream',
    logo: '/logos/wknc.png',
    genre: 'NC State College Radio'
  },
  {
    id: 'ksjs',
    name: 'KSJS',
    streamUrl: 'http://streaming.ksjs.sjsu.edu:8000/live',
    logo: '/logos/ksjs.png',
    genre: 'Student Run 24/7 Ground Zero'
  },
  {
    id: 'kpfa',
    name: 'KPFA',
    streamUrl: 'http://streams.kpfa.org:8000/kpfa_128',
    logo: '/logos/kpfa.png',
    genre: 'Vigilant as Always'
  },
  {
    id: 'wrir',
    name: 'WRIR',
    streamUrl: 'http://files.wrir.org:8000/WRIR96kbps',
    logo: '/logos/wrir.png',
    genre: 'Richmond Independent Radio'
  },
  {
    id: 'wayo',
    name: 'WAYO',
    streamUrl: 'http://streaming.wayofm.org:8000/wayo-192',
    logo: '/logos/wayo.png',
    genre: 'Way Out, Right Here'
  },
  {
    id: 'khol',
    name: 'KHOL',
    streamUrl: 'http://peridot.streamguys.com:6010/live',
    logo: '/logos/khol.png',
    genre: 'Jackson Hole Community Radio'
  },
  {
    id: 'khum',
    name: 'KHUM',
    streamUrl: 'http://lostcoast.streamguys.us/khum-hi',
    logo: '/logos/khum.png',
    genre: 'Freeform • Humboldt County'
  },
  {
    id: 'wojb',
    name: 'WOJB',
    streamUrl: 'https://wojb.streamguys1.com/live',
    logo: '/logos/wojb.png',
    genre: 'Woodland Community Radio'
  },
  {
    id: 'kups',
    name: 'KUPS',
    streamUrl: 'https://streamingv2.shoutcast.com/kupsfm',
    logo: '/logos/kups.png',
    genre: 'The Sound'
  },
  {
    id: 'wras',
    name: 'WRAS',
    streamUrl: 'http://22113.live.streamtheworld.com/WRASFM_SC',
    logo: '/logos/wras.png',
    genre: 'Album 88 • Georgia State'
  },
  {
    id: 'kuci',
    name: 'KUCI',
    streamUrl: 'https://streamer.kuci.org:8088/web',
    logo: '/logos/kuci.png',
    genre: 'KUCI 88.9 FM • UC Irvine'
  },
  {
    id: 'ktru',
    name: 'KTRU',
    streamUrl: 'http://stream.ktru.org:8000/ktru-hd',
    logo: '/logos/ktru.png',
    genre: 'Rice Radio • Houston'
  },
  {
    id: 'citr',
    name: 'CiTR',
    streamUrl: 'http://live.citr.ca:8000/stream.mp3',
    logo: '/logos/citr.png',
    genre: 'U of British Columbia'
  },
  {
    id: 'wzbc',
    name: 'WZBC',
    streamUrl: 'https://stream.wzbc.org/wzbc',
    logo: '/logos/wzbc.png',
    genre: 'Boston College'
  },
  {
    id: 'kmrd',
    name: 'KMRD-LP',
    streamUrl: 'https://kmrd.broadcasttool.stream/listen.m3u',
    logo: '/logos/kmrd.png',
    genre: 'Madrid Community Radio'
  },
];

export function RadioProvider({ children }) {
  const [stations] = useState(DEFAULT_STATIONS);
  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metadata, setMetadata] = useState({ artist: '', title: '', artwork: null });
  const [volume, setVolume] = useState(0.8);
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

  const playStation = useCallback((station) => {
    if (!audioRef.current) return;

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
