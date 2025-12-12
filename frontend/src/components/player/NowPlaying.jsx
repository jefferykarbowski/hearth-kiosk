import { useState, useRef } from 'react';
import { Play, Pause, Heart, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useRadio } from '../../contexts/RadioContext';

export default function NowPlaying() {
  const { 
    currentStation, 
    isPlaying, 
    metadata, 
    volume,
    setVolume,
    togglePlay, 
    nextStation, 
    prevStation 
  } = useRadio();

  const [isLiked, setIsLiked] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  // Determine what image to show
  const albumArt = metadata.artwork || currentStation?.logo || null;
  const title = metadata.title || currentStation?.name || 'Select a station';
  const artist = metadata.artist || currentStation?.genre || 'Live Radio';

  return (
    <div 
      ref={cardRef}
      className="w-full max-w-sm rounded-2xl overflow-hidden relative group"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0px 1px 0px 0px rgba(255, 255, 255, 0.1) inset, 
                    0px 0px 30px 5px rgba(255, 255, 255, 0.05), 
                    0 10px 40px -5px rgba(0, 0, 0, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.08) inset`
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Mouse tracking glow */}
      <div 
        className="absolute w-full h-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ 
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)`,
          filter: 'blur(25px)',
        }}
      />

      <div className="p-6 relative z-10">
        {/* Album Art */}
        <div 
          className="relative w-full aspect-square rounded-xl overflow-hidden mb-6" 
          style={{ 
            boxShadow: '0 15px 35px -10px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.1)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {albumArt ? (
            <img 
              src={albumArt} 
              alt="Album Cover" 
              className="w-full h-full object-cover transition-all duration-700"
              style={{ 
                transform: isPlaying ? 'scale(1.05)' : 'scale(1)',
                filter: isPlaying ? 'brightness(1.1)' : 'brightness(1)',
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
              <span className="text-6xl opacity-50">📻</span>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
          
          {/* Track info overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white font-bold text-xl mb-1 drop-shadow-lg truncate">
              {title}
            </h3>
            <p className="text-white/80 text-sm drop-shadow-md truncate">
              {artist}
            </p>
          </div>
        </div>

        {/* Equalizer */}
        <div className="flex justify-center gap-1 mb-6 h-8 items-end">
          {isPlaying ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i}
                  className={`w-1.5 bg-white/70 rounded-full eq-bar eq-bar-${i}`}
                  style={{
                    filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))'
                  }}
                />
              ))}
            </>
          ) : (
            <div className="h-8 flex items-center text-white/40 text-xs">
              {currentStation ? 'Paused' : 'Select a station'}
            </div>
          )}
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-3 mb-4">
          <Volume2 size={18} className="text-white/60" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.4)]
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button 
            onClick={toggleLike}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300"
            style={{
              transform: isLiked ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            <Heart 
              size={20} 
              fill={isLiked ? "white" : "none"} 
              stroke="white" 
              className="transition-all duration-300"
              style={{ 
                filter: isLiked ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))' : 'none'
              }}
            />
          </button>

          <div className="flex items-center gap-3">
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 disabled:opacity-30"
              onClick={prevStation}
              disabled={!currentStation}
            >
              <SkipBack size={20} className="text-white" />
            </button>
            
            <button 
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:opacity-50"
              onClick={togglePlay}
              disabled={!currentStation}
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
              }}
            >
              {isPlaying ? 
                <Pause size={24} className="text-black" /> : 
                <Play size={24} className="text-black ml-1" />
              }
            </button>
            
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 disabled:opacity-30"
              onClick={nextStation}
              disabled={!currentStation}
            >
              <SkipForward size={20} className="text-white" />
            </button>
          </div>

          <div className="w-10" />
        </div>
      </div>

      {/* Border overlay */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      />
    </div>
  );
}
