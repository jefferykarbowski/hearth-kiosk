import { useState, useEffect } from 'react';
import { useWeather } from '../contexts/WeatherContext';

/**
 * The score at rest.
 *
 * This is furniture: the state the kitchen sees most of the day, so it is
 * designed rather than blanked. The dense VLF plate carries the field and the
 * reading sits in its quiet lower third.
 */
export default function Screensaver({ isActive, onDismiss }) {
  const { weather } = useWeather();
  const [now, setNow] = useState(new Date());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) setVisible(true);
  }, [isActive]);

  // Only tick while showing — a kiosk runs for weeks.
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  if (!isActive && !visible) return null;

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <button
      onClick={dismiss}
      aria-label="Dismiss screensaver"
      className="fixed inset-0 z-[90] flex w-full flex-col justify-end text-left transition-opacity duration-300"
      style={{ background: 'var(--ink)', opacity: visible && isActive ? 1 : 0 }}
    >
      <img
        src="/brand/splash-02.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.5 }}
      />

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(7,8,10,0.55) 0%, rgba(7,8,10,0.2) 35%, var(--ink) 88%)' }}
      />

      <div className="relative p-8 pb-12 md:p-14 md:pb-16">
        <p
          className="font-mono tnum leading-none"
          style={{ fontSize: 'clamp(4rem, 15vw, 11rem)', color: 'var(--chalk)' }}
        >
          {time}
        </p>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <p className="stave-label" style={{ color: 'var(--chalk-2)' }}>{date}</p>

          {weather && (
            <p className="flex items-baseline gap-2">
              <span className="font-mono text-2xl tnum" style={{ color: 'var(--sig-cyan)' }}>
                {weather.temp}°
              </span>
              <span className="text-[13px] capitalize" style={{ color: 'var(--chalk-2)' }}>
                {weather.description}
              </span>
            </p>
          )}
        </div>

        <p className="mt-6 stave-label" style={{ color: 'var(--chalk-3)', fontSize: 11 }}>
          Touch to resume
        </p>
      </div>
    </button>
  );
}
