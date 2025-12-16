import { motion } from "framer-motion";
import { ExternalLink, Smartphone } from "lucide-react";
import { useRadio } from "../../contexts/RadioContext";
import { useKiosk } from "../../contexts/KioskContext";
import { useState, useRef, useCallback } from "react";

// Custom Radio icon - radio tower with waves
const RadioIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path d="M12 16c2.76 0 5-2.24 5-5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H7c0 2.76 2.24 5 5 5z"/>
    <path d="M12 18c-1.1 0-2 .9-2 2h4c0-1.1-.9-2-2-2z"/>
    <path d="M6 11c0-3.31 2.69-6 6-6s6 2.69 6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 11c0-4.97 4.03-9 9-9s9 4.03 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Mixcloud logo - accepts style prop for color override
const MixcloudIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 571 67" fill="currentColor">
    <path d="M570.239 33.365c0-27.931-17.506-32.443-34.196-32.443h-22.669V65.9h22.669c16.69 0 34.196-4.512 34.196-32.535zm-11.788 0c0 20.839-10.882 22.222-22.408 22.222h-5.349l-.347.011c-2.231-.024-3.404.331-4.504.978l-2.477 1.578-2.066-2.067 1.448-.826.002-.003c.916-.624 1.657-1.541 2.137-2.833.23-.771.361-1.683.362-2.77l.005.001V16.912a10.289 10.289 0 0 0-.19-1.787c-.461-1.574-1.281-2.639-2.314-3.343-.002-.001-.001-.002-.002-.003l-1.448-.826 2.066-2.067 2.477 1.578c.481.283 1.05.506 1.716.67.23.04.816.076 1.071.101h7.413c11.526 0 22.408 1.383 22.408 22.13zm-56.099 8.395V.922h-11.88v36.413c0 12.26-2.49 19.174-16.046 19.174-13.555 0-16.045-6.914-16.045-19.174V.922h-11.88V41.76c0 16.222 9.209 25.062 27.925 25.062 18.625 0 27.926-8.84 27.926-25.062zm-65.136-8.395C437.216 14.463 425.15 0 405.233 0c-20.01 0-32.075 14.463-32.075 33.365 0 18.995 12.065 33.457 32.075 33.457 19.917 0 31.983-14.462 31.983-33.457zm-11.88 0c0 13.739-6.64 23.144-20.103 23.144-13.463 0-20.194-9.405-20.194-23.144 0-13.646 6.731-23.052 20.194-23.052s20.103 9.406 20.103 23.052zM318.147 66.82l47.708-8.344V47.119l-46.245 7.999-1.307-1.427c1.385-.423 4.706-1.697 4.706-4.221.004-.071.019-48.551.019-48.551h-11.88v59.086c0 4.42 2.579 6.907 6.999 6.815zm-68.619-33.455c0-14.292 7.56-23.052 20.466-23.052 10.323 0 17.515 5.533 18.988 15.676h11.893C298.938 9.945 287.416 0 269.808 0c-20.004 0-32.161 14.463-32.161 33.365 0 18.995 12.157 33.457 32.161 33.457 17.608 0 29.13-9.945 31.067-26.08h-11.893c-1.473 10.143-8.665 15.767-18.988 15.767-12.906 0-20.466-8.76-20.466-23.144zm-51.354 9.996l30.876 22.217V51.937l-26.176-18.526 26.176-18.525V1.245l-30.876 22.308h-3.319L164.07 1.245v13.643l26.084 18.523-26.084 18.523v13.644l30.785-22.217h3.319zM88.798 39.326h65.15v-11.83h-65.15v11.83zM64.344 65.9h11.88V.922H52.726L39.634 62.87h-3.043L23.498.922H0V65.9h11.88V11.697L9.761 3.952h3.741L27.24 65.9h21.836L62.722 3.952h3.832l-2.21 7.745V65.9z" fillRule="evenodd"/>
  </svg>
);

// Spotify logo
const SpotifyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const tabs = [
  {
    id: "radio",
    label: "Radio",
    icon: RadioIcon,
    color: "#6366f1", // Indigo
    iconClass: "w-5 h-5",
  },
  {
    id: "mixcloud",
    label: "Mixcloud",
    icon: MixcloudIcon,
    color: "#5000ff", // Mixcloud purple
    iconClass: "w-16 h-4", // Wider for the logo
  },
  {
    id: "spotify",
    label: "Spotify",
    icon: SpotifyIcon,
    color: "#1DB954", // Spotify green
    iconClass: "w-5 h-5",
    launchesNativeApp: true,
  },
];

export default function Navigation() {
  const { activeTab, setActiveTab, stop, isPlaying } = useRadio();
  const { launchApp, closeApp, returnHome, launchedApp, isAppAvailable, getAppInfo } = useKiosk();
  const [launching, setLaunching] = useState(null);
  const pendingTabRef = useRef(null); // Track what tab we're trying to switch to

  // Debounced tab click handler to prevent rapid clicks
  const handleTabClick = useCallback(async (tab) => {
    // If clicking on already active tab, do nothing
    if (activeTab === tab.id && !launching) {
      return;
    }

    // Stop radio when switching away from radio tab
    if (tab.id !== 'radio' && isPlaying) {
      stop();
    }

    // Track the intended tab
    pendingTabRef.current = tab.id;

    // If we're currently launching Spotify but user clicked away, close it
    if (launching === 'spotify' && tab.id !== 'spotify') {
      console.log('User clicked away during Spotify launch, will close when ready');
      setActiveTab(tab.id);
      // The Spotify launch handler will check pendingTabRef and close if needed
      return;
    }

    // If Spotify is running and we're switching away, close it first
    if ((launchedApp?.id === 'spotify' || launching === 'spotify') && tab.id !== 'spotify') {
      console.log('Closing Spotify before switching tabs...');
      setActiveTab(tab.id); // Switch tab immediately for UI feedback
      try {
        await closeApp('spotify');
        await returnHome();
      } catch (e) {
        console.error('Failed to close Spotify:', e);
      }
      return;
    }

    // Handle Spotify - launches native app
    if (tab.id === 'spotify') {
      setLaunching(tab.id);
      setActiveTab(tab.id);
      try {
        const result = await launchApp('spotify');

        // Check if user clicked away while we were launching
        if (pendingTabRef.current !== 'spotify') {
          console.log('User navigated away during Spotify launch, closing...');
          await closeApp('spotify');
          await returnHome();
          return;
        }

        if (result.success) {
          console.log(`Launched Spotify: ${result.method}`);
        }
      } catch (e) {
        console.error('Spotify launch failed:', e);
        setActiveTab('radio');
      } finally {
        setLaunching(null);
      }
      return;
    }

    // Handle Radio and Mixcloud - just switch tabs
    setActiveTab(tab.id);
  }, [activeTab, launching, launchedApp, closeApp, returnHome, launchApp, setActiveTab, stop, isPlaying]);

  return (
    <div className="inline-flex items-center gap-2">
      {tabs.map((tab) => {
        const appInfo = tab.launchesNativeApp ? getAppInfo('spotify') : null;
        const hasNativeApp = appInfo?.available;
        const isLaunching = launching === tab.id;
        const IconComponent = tab.icon;

        // Use activeTab as single source of truth for active state
        const isActive = activeTab === tab.id;

        const iconColor = isActive ? '#ffffff' : tab.color;

        return (
          <motion.button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            disabled={isLaunching}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0 20px',
              height: '44px',
              fontWeight: 600,
              borderRadius: '12px',
              outline: 'none',
              transition: 'all 0.2s',
              background: isActive ? tab.color : `${tab.color}20`,
              border: `2px solid ${isActive ? tab.color : tab.color + '60'}`,
              boxShadow: isActive
                ? `0 4px 20px ${tab.color}50, 0 0 40px ${tab.color}30`
                : `0 2px 8px ${tab.color}20`,
              opacity: isLaunching ? 0.5 : 1,
              cursor: isLaunching ? 'wait' : 'pointer',
            }}
          >
            {isLaunching ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                }}
              />
            ) : (
              <IconComponent
                className={tab.iconClass}
                style={{ color: iconColor, fill: iconColor }}
              />
            )}
            {tab.id !== 'mixcloud' && (
              <span style={{ color: iconColor }}>
                {tab.label}
              </span>
            )}
            {/* Show indicator for native app availability (Spotify only) */}
            {tab.id === 'spotify' && hasNativeApp && (
              <Smartphone style={{ width: '16px', height: '16px', color: '#4ade80' }} />
            )}
            {tab.id === 'spotify' && !hasNativeApp && (
              <ExternalLink style={{ width: '16px', height: '16px', opacity: 0.5, color: 'white' }} />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
