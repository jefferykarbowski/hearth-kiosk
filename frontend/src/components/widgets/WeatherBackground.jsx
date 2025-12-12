import { useWeather } from '../../contexts/WeatherContext';

export default function WeatherBackground() {
  const { background, isLoading } = useWeather();

  return (
    <>
      {/* Background image layer */}
      <div 
        className="fixed inset-0 -z-20 transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: isLoading ? 0 : 1,
        }}
      />
      
      {/* Dark overlay for readability */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(10, 10, 15, 0.7) 0%, rgba(10, 10, 15, 0.85) 100%)',
        }}
      />
      
      {/* Animated gradient overlay (subtle) */}
      <div 
        className="fixed inset-0 -z-10 opacity-50"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
          `,
          animation: 'bgPulse 8s ease-in-out infinite',
        }}
      />
    </>
  );
}
