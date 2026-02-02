import { RadioProvider, useRadio } from './contexts/RadioContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { KioskProvider } from './contexts/KioskContext';
import { SpotifyPlayerProvider } from './contexts/SpotifyPlayerContext';
import { useKeyboard } from './contexts/KeyboardContext';

import Navigation from './components/navigation/Navigation';
import FloatingHomeButton from './components/navigation/FloatingHomeButton';
import KioskSettings from './components/navigation/KioskSettings';
import NowPlaying from './components/player/NowPlaying';
import StationGrid from './components/stations/StationGrid';
import WeatherBadge from './components/widgets/WeatherBadge';
import WeatherBackground from './components/widgets/WeatherBackground';
import VolumeControl from './components/widgets/VolumeControl';
import NewsTicker from './components/widgets/NewsTicker';
import MixcloudTab from './components/tabs/MixcloudTab';
import SpotifyTab from './components/tabs/SpotifyTab';
import KeyboardToggle from './components/KeyboardToggle';
import Screensaver from './components/Screensaver';

function AppContent() {
  const { activeTab, showScreensaver, dismissScreensaver, triggerScreensaver } = useRadio();
  const { isKeyboardOpen } = useKeyboard();

  return (
    <div className="min-h-screen relative">
      {/* Dynamic weather background */}
      <WeatherBackground />

      {/* Sticky Header - Always visible */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-white/10"
        style={{
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Left side - Screensaver button, Weather & Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={triggerScreensaver}
            className="p-2 rounded-full text-white/20 hover:text-white/40 hover:bg-white/5 transition-colors"
            title="Screensaver"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          </button>
          <WeatherBadge />
          <Navigation />
        </div>

        {/* Right side - Volume Control & Settings */}
        <div className="flex items-center gap-2">
          <VolumeControl />
          <KioskSettings />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 pb-20 relative z-10">
        {activeTab === 'radio' && (
          <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
            {/* Now Playing Card */}
            <div className="flex justify-center lg:justify-start">
              <NowPlaying />
            </div>
            
            {/* Station Grid */}
            <div className="flex-1">
              <StationGrid />
            </div>
          </div>
        )}

        {activeTab === 'mixcloud' && <MixcloudTab />}
        
        {activeTab === 'spotify' && <SpotifyTab />}
      </main>

      {/* News Ticker - hidden when keyboard is open */}
      {!isKeyboardOpen && (
        <footer className="fixed bottom-0 left-0 right-0 z-10">
          <NewsTicker />
        </footer>
      )}

      {/* Floating Home Button for Kiosk Mode */}
      <FloatingHomeButton />

      {/* Screensaver - shows after 1 hour of no music */}
      <Screensaver isActive={showScreensaver} onDismiss={dismissScreensaver} />
    </div>
  );
}

function App() {
  return (
    <WeatherProvider>
      <RadioProvider>
        <KioskProvider>
          <SpotifyPlayerProvider>
            <AppContent />
            <KeyboardToggle />
          </SpotifyPlayerProvider>
        </KioskProvider>
      </RadioProvider>
    </WeatherProvider>
  );
}

export default App;
