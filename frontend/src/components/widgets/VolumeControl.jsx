import { useState, useEffect } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

export default function VolumeControl() {
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);

  // Fetch current volume on mount and periodically
  useEffect(() => {
    fetchVolume();
    // Poll every 2 seconds to catch external changes
    const interval = setInterval(fetchVolume, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchVolume = async () => {
    try {
      const res = await fetch('/api/volume');
      const data = await res.json();
      if (!data.error) {
        setVolume(data.volume);
        setMuted(data.muted);
      }
    } catch (e) {
      // Silent fail
    }
  };

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume);
    try {
      await fetch(`/api/volume/${newVolume}`, { method: 'PUT' });
    } catch (e) {
      console.error('Volume change error:', e);
    }
  };

  const toggleMute = async () => {
    try {
      await fetch('/api/volume/mute/toggle', { method: 'POST' });
      setMuted(!muted);
    } catch (e) {
      console.error('Mute toggle error:', e);
    }
  };

  const handleSliderChange = (e) => {
    const newVolume = parseInt(e.target.value);
    handleVolumeChange(newVolume);
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-3">
      {/* Volume slider - always visible */}
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={handleSliderChange}
        className="w-24 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.4)]
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110"
      />

      {/* Volume button - click to mute */}
      <button
        onClick={toggleMute}
        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        title={muted ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon size={20} className={muted ? 'text-red-400' : ''} />
      </button>
    </div>
  );
}
