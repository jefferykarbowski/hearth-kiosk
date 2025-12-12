import { createContext, useContext, useState, useEffect } from 'react';

const WeatherContext = createContext(null);

// Weather condition to background image mapping
const WEATHER_BACKGROUNDS = {
  // Clear
  '01d': 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=1920&q=80', // sunny day
  '01n': 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1920&q=80', // clear night stars
  
  // Few clouds
  '02d': 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=80', // partly cloudy day
  '02n': 'https://images.unsplash.com/photo-1532978379173-523e16f371f2?w=1920&q=80', // cloudy night
  
  // Scattered/broken clouds
  '03d': 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=1920&q=80', // cloudy sky
  '03n': 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=80',
  '04d': 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=1920&q=80', // overcast
  '04n': 'https://images.unsplash.com/photo-1532978379173-523e16f371f2?w=1920&q=80',
  
  // Rain
  '09d': 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1920&q=80', // rain
  '09n': 'https://images.unsplash.com/photo-1501691223387-dd0500403074?w=1920&q=80', // rain night
  '10d': 'https://images.unsplash.com/photo-1433863448220-78aaa064ff47?w=1920&q=80', // rain with sun
  '10n': 'https://images.unsplash.com/photo-1501691223387-dd0500403074?w=1920&q=80',
  
  // Thunderstorm
  '11d': 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=1920&q=80', // storm
  '11n': 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=1920&q=80',
  
  // Snow
  '13d': 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1920&q=80', // snow day
  '13n': 'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1920&q=80', // snow night
  
  // Mist/fog
  '50d': 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1920&q=80', // foggy
  '50n': 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1920&q=80',
};

const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=1920&q=80';

export function WeatherProvider({ children }) {
  const [weather, setWeather] = useState(null);
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather');
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
          
          // Set background based on weather icon
          const bg = WEATHER_BACKGROUNDS[data.icon] || DEFAULT_BACKGROUND;
          setBackground(bg);
        }
      } catch (e) {
        console.error('Weather fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000); // Every 15 min
    return () => clearInterval(interval);
  }, []);

  const value = {
    weather,
    background,
    isLoading
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}
