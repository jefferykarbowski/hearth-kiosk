import { motion } from "framer-motion";
import { Radio, Cloud, Music, ExternalLink, Smartphone } from "lucide-react";
import { useRadio } from "../../contexts/RadioContext";
import { useKiosk } from "../../contexts/KioskContext";
import { useState } from "react";

const tabs = [
  {
    id: "radio",
    label: "Radio",
    icon: <Radio className="w-4 h-4" />,
    isNativeApp: false,
  },
  {
    id: "mixcloud",
    label: "Mixcloud",
    icon: <Cloud className="w-4 h-4" />,
    isNativeApp: true,
    appId: "mixcloud",
  },
  {
    id: "spotify",
    label: "Spotify",
    icon: <Music className="w-4 h-4" />,
    isNativeApp: true,
    appId: "spotify",
  },
];

export default function Navigation() {
  const { activeTab, setActiveTab } = useRadio();
  const { launchApp, isAppAvailable, getAppInfo, kioskMode } = useKiosk();
  const [launching, setLaunching] = useState(null);

  const handleTabClick = async (tab) => {
    if (tab.isNativeApp && kioskMode) {
      // Launch native app instead of switching tabs
      setLaunching(tab.id);
      
      try {
        const result = await launchApp(tab.appId);
        
        if (result.success && result.method === 'native') {
          // App launched natively, stay on current tab
          // The user will switch to the app window
          console.log(`Launched ${tab.label} natively`);
        } else if (result.method === 'web') {
          // Opened in browser/web
          console.log(`Opened ${tab.label} in browser`);
        }
      } catch (e) {
        console.error('Launch failed:', e);
        // Fall back to showing the tab content
        setActiveTab(tab.id);
      } finally {
        setLaunching(null);
      }
    } else {
      // Regular tab switch (non-kiosk mode or radio tab)
      setActiveTab(tab.id);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-full"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {tabs.map((tab) => {
        const appInfo = tab.isNativeApp ? getAppInfo(tab.appId) : null;
        const hasNativeApp = appInfo?.available;
        const isLaunching = launching === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            disabled={isLaunching}
            className={`
              relative px-4 py-2 text-sm font-medium rounded-full transition-colors outline-none
              inline-flex items-center gap-2
              ${activeTab === tab.id && !tab.isNativeApp
                ? "text-white"
                : "text-white/50 hover:text-white/80"
              }
              ${isLaunching ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {activeTab === tab.id && !tab.isNativeApp && (
              <motion.div
                layoutId="pill-indicator"
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(99, 102, 241, 0.9)',
                  boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
                }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {isLaunching ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                tab.icon
              )}
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Show indicator for native app availability */}
              {tab.isNativeApp && kioskMode && hasNativeApp && (
                <Smartphone className="w-3 h-3 text-green-400" />
              )}
              {tab.isNativeApp && kioskMode && !hasNativeApp && (
                <ExternalLink className="w-3 h-3 text-white/30" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
