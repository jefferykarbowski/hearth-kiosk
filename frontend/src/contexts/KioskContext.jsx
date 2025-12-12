import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const KioskContext = createContext();

export function useKiosk() {
  return useContext(KioskContext);
}

export function KioskProvider({ children }) {
  const [availableApps, setAvailableApps] = useState([]);
  const [launchedApp, setLaunchedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kioskMode, setKioskMode] = useState(true); // Enable kiosk mode by default

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
      } else if (data.webUrl) {
        // Native app not available, open web version
        // In kiosk mode, we might want to handle this differently
        if (kioskMode) {
          // For kiosk, open in new window that can be managed
          window.open(data.webUrl, appId, 'width=1024,height=768');
        } else {
          window.open(data.webUrl, '_blank');
        }
        setLaunchedApp({ id: appId, method: 'web', webUrl: data.webUrl });
        return { success: true, method: 'web', webUrl: data.webUrl };
      }
      
      return data;
    } catch (e) {
      console.error('Failed to launch app:', e);
      // Fallback to web
      if (app.webUrl) {
        window.open(app.webUrl, '_blank');
        return { success: true, method: 'web', webUrl: app.webUrl };
      }
      return { success: false, error: e.message };
    }
  }, [availableApps, kioskMode]);

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
