import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWeather } from '../../contexts/WeatherContext';

// Map weather icon codes to Lucide icons
const getWeatherIcon = (iconCode) => {
  const iconMap = {
    '01d': Sun, '01n': Sun,
    '02d': Cloud, '02n': Cloud,
    '03d': Cloud, '03n': Cloud,
    '04d': Cloud, '04n': Cloud,
    '09d': CloudRain, '09n': CloudRain,
    '10d': CloudRain, '10n': CloudRain,
    '11d': CloudLightning, '11n': CloudLightning,
    '13d': CloudSnow, '13n': CloudSnow,
    '50d': CloudFog, '50n': CloudFog,
  };
  return iconMap[iconCode] || Cloud;
};

export default function WeatherBadge() {
  const { weather } = useWeather();
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.icon) : Cloud;

  return (
    <div className="flex items-center gap-3">
      {/* Time */}
      <div className="text-lg font-medium text-white/80 tabular-nums">
        {formatTime(time)}
      </div>

      {/* Weather Badge */}
      {weather && (
        <motion.div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <WeatherIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold tabular-nums">
            {Math.round(weather.temp)}°F
          </span>
          <span className="opacity-60">•</span>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0 opacity-60" />
            <span className="truncate max-w-[100px]">Midland, MI</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
