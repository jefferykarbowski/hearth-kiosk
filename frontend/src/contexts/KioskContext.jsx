import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const KioskContext = createContext();

export function useKiosk() {
  return useContext(KioskContext);
}

export function KioskProvider({ children }) {
  const [availableApps, setAvailableApps] = useState([]);
  const [launchedApp, setLaunchedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kioskMode, setKioskMode] = useState(false); // Kiosk mode disabled

  // Fetch available apps on mount
  useEffect(() => {
    fetchAvailableApps();
  }, []);

  const fetchAvailableApps = async () => {
    try {
      const res = await fetch('/api/kiosk/apps');
      const data = await res.json();
      setAvailableApps(data.apps || []);
    } catch (e) {
      console.error('Failed to fetch kiosk apps:', e);
      // Set defaults if backend not available
      setAvailableApps([
        { id: 'spotify', name: 'Spotify', available: false, webUrl: 'https://open.spotify.com' },
        { id: 'mixcloud', name: 'Mixcloud', available: false, webUrl: 'https://www.mixcloud.com' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const launchApp = useCallback(async (appId) => {
    const app = availableApps.find(a => a.id === appId);
    if (!app) return { success: false, error: 'App not found' };

    try {
      const res = await fetch(`/api/kiosk/launch/${appId}`, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setLaunchedApp({ id: appId, ...data });
        return data;
      }

      return data;
    } catch (e) {
      console.error('Failed to launch app:', e);
      return { success: false, error: e.message };
    }
  }, [availableApps]);

  const closeApp = useCallback(async (appId) => {
    try {
      await fetch(`/api/kiosk/close/${appId}`, { method: 'POST' });
      if (launchedApp?.id === appId) {
        setLaunchedApp(null);
      }
    } catch (e) {
      console.error('Failed to close app:', e);
    }
  }, [launchedApp]);

  const returnHome = useCallback(async () => {
    try {
      await fetch('/api/kiosk/return-home', { method: 'POST' });
      setLaunchedApp(null);
    } catch (e) {
      console.error('Failed to return home:', e);
      // Just clear the state anyway
      setLaunchedApp(null);
    }
  }, []);

  const focusApp = useCallback(async (appId) => {
    try {
      await fetch(`/api/kiosk/focus/${appId}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to focus app:', e);
    }
  }, []);

  const isAppAvailable = useCallback((appId) => {
    const app = availableApps.find(a => a.id === appId);
    return app?.available || false;
  }, [availableApps]);

  const getAppInfo = useCallback((appId) => {
    return availableApps.find(a => a.id === appId);
  }, [availableApps]);

  const value = {
    availableApps,
    launchedApp,
    loading,
    kioskMode,
    setKioskMode,
    launchApp,
    closeApp,
    returnHome,
    focusApp,
    isAppAvailable,
    getAppInfo,
    refreshApps: fetchAvailableApps,
  };

  return (
    <KioskContext.Provider value={value}>
      {children}
    </KioskContext.Provider>
  );
}
