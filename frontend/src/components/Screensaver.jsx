import { useState, useEffect, useMemo } from 'react';
import { Radio } from 'lucide-react';
import { useWeather } from '../contexts/WeatherContext';

// CSS-based particle component - much more efficient than Framer Motion
function Particle({ index }) {
  // Memoize random values so they don't recalculate on re-renders
  const style = useMemo(() => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${index * 2}s`,
    animationDuration: `${20 + Math.random() * 20}s`,
  }), [index]);

  return (
    <div
      className="absolute w-2 h-2 rounded-full bg-indigo-500/20 animate-float"
      style={style}
    />
  );
}

export default function Screensaver({ isActive, onDismiss }) {
  const { weather } = useWeather();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isVisible, setIsVisible] = useState(false);

  // Fade in/out handling
  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    }
  }, [isActive]);

  // Update clock every second (only when active)
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Delay actual dismiss to allow fade out
    setTimeout(onDismiss, 300);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isActive) return null;

  return (
    <div
      onClick={handleDismiss}
      onTouchStart={handleDismiss}
      className={`fixed inset-0 z-[100] cursor-pointer flex items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
      }}
    >
      {/* CSS-animated background particles - reduced to 8 for performance */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </div>

      {/* Main content */}
      <div className="relative text-center animate-fade-in">
        {/* Floating radio icon - CSS animation */}
        <div className="mb-8 animate-float-slow">
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))',
              boxShadow: '0 0 60px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Radio className="w-12 h-12 text-indigo-400" />
          </div>
        </div>

        {/* Time - CSS animation for pulse */}
        <div className="mb-4 animate-pulse-slow">
          <h1
            className="text-8xl font-light text-white tracking-tight"
            style={{ textShadow: '0 0 40px rgba(99, 102, 241, 0.5)' }}
          >
            {formatTime(currentTime)}
          </h1>
        </div>

        {/* Date */}
        <p className="text-2xl text-white/50 mb-8">
          {formatDate(currentTime)}
        </p>

        {/* Weather */}
        {weather && (
          <div className="flex items-center justify-center gap-3 text-white/40">
            <span className="text-xl">{Math.round(weather.temp)}°</span>
            <span className="text-lg capitalize">{weather.description}</span>
          </div>
        )}

        {/* Tap to dismiss hint */}
        <p className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-white/30 text-sm animate-pulse-slow">
          Tap anywhere to wake
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-float {
          animation: float 30s ease-in-out infinite;
          will-change: transform;
        }
        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
