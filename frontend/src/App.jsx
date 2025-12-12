import { RadioProvider, useRadio } from './contexts/RadioContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { KioskProvider } from './contexts/KioskContext';

import Navigation from './components/navigation/Navigation';
import FloatingHomeButton from './components/navigation/FloatingHomeButton';
import KioskSettings from './components/navigation/KioskSettings';
import NowPlaying from './components/player/NowPlaying';
import StationGrid from './components/stations/StationGrid';
import WeatherBadge from './components/widgets/WeatherBadge';
import WeatherBackground from './components/widgets/WeatherBackground';
import NewsTicker from './components/widgets/NewsTicker';
import MixcloudTab from './components/tabs/MixcloudTab';
import SpotifyTab from './components/tabs/SpotifyTab';

function AppContent() {
  const { activeTab } = useRadio();

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
{/* Clean header - no branding */}
        <div className="flex items-center gap-2">
          <WeatherBadge />
          <Navigation />
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

      {/* News Ticker */}
      <footer className="fixed bottom-0 left-0 right-0 z-10">
        <NewsTicker />
      </footer>

      {/* Floating Home Button for Kiosk Mode */}
      <FloatingHomeButton />
    </div>
  );
}

function App() {
  return (
    <WeatherProvider>
      <RadioProvider>
        <KioskProvider>
          <AppContent />
        </KioskProvider>
      </RadioProvider>
    </WeatherProvider>
  );
}

export default App;
