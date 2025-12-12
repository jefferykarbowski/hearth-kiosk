import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Volume2 } from 'lucide-react';
import { useRadio } from '../../contexts/RadioContext';

// Generate a consistent color from station name for fallback
function getStationColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 60%, 40%)`;
}

export default function StationGrid() {
  const { stations, currentStation, isPlaying, metadata, playStation } = useRadio();
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (stationId) => {
    setImageErrors(prev => ({ ...prev, [stationId]: true }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/80">Stations</h2>
        <span className="text-sm text-white/40">{stations.length} stations</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stations.map((station, index) => {
          const isActive = currentStation?.id === station.id;
          const showMetadata = isActive && isPlaying && (metadata.title || metadata.artist);
          const showFallback = !station.logo || imageErrors[station.id];
          const fallbackColor = getStationColor(station.name);
          
          return (
            <motion.button
              key={station.id}
              onClick={() => playStation(station)}
              className="relative group text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div 
                className={`
                  relative overflow-hidden rounded-xl p-4 transition-all duration-300
                  ${isActive 
                    ? 'ring-2 ring-indigo-500 bg-indigo-500/20' 
                    : 'bg-white/5 hover:bg-white/10'
                  }
                `}
                style={{
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {/* Background glow when active */}
                {isActive && isPlaying && (
                  <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.4) 0%, transparent 70%)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                )}

                <div className="relative z-10 flex items-start gap-4">
                  {/* Station Logo */}
                  <div className="relative flex-shrink-0">
                    <div 
                      className={`
                        w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center
                        ${isActive ? 'ring-2 ring-indigo-400' : ''}
                      `}
                      style={{ 
                        backgroundColor: showFallback ? fallbackColor : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {!showFallback ? (
                        <img 
                          src={station.logo} 
                          alt={station.name}
                          className="w-full h-full object-contain p-1"
                          onError={() => handleImageError(station.id)}
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {station.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* Playing indicator */}
                    {isActive && isPlaying && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                        <Volume2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Station Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{station.name}</h3>
                    <p className="text-sm text-white/50 truncate">{station.genre}</p>
                    
                    {/* Now Playing metadata */}
                    {showMetadata && (
                      <motion.div 
                        className="mt-2 pt-2 border-t border-white/10"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-xs text-indigo-300 truncate">
                          {metadata.title}
                        </p>
                        {metadata.artist && (
                          <p className="text-xs text-white/40 truncate">
                            {metadata.artist}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Equalizer animation when playing */}
                  {isActive && isPlaying && (
                    <div className="flex items-end gap-0.5 h-6 flex-shrink-0">
                      {[1, 2, 3, 4].map((i) => (
                        <div 
                          key={i}
                          className={`w-1 bg-indigo-400 rounded-full eq-bar-${i}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
