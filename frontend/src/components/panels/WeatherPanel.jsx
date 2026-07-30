import { useState, useEffect } from 'react';
import { useWeather } from '../../contexts/WeatherContext';
import { Comb } from '../marks/Marks';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function hour(ms) {
  const d = new Date(ms);
  const h = d.getHours();
  const ampm = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
}

/** Temperature plotted as a curve — the score's own way of showing a series. */
function TempCurve({ points, color }) {
  if (points.length < 2) return null;

  const temps = points.map((p) => p.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = max - min || 1;

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * 100,
    y: 88 - ((p.temp - min) / span) * 70,
  }));

  const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="1.6" fill={color} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/**
 * Weather, read in full: current conditions, the next 24 hours as a plotted
 * curve, then the five-day range. Atmospheric data owns cyan in this system —
 * which is apt, since the product is named after an atmospheric signal.
 */
export default function WeatherPanel({ onClose }) {
  const { weather } = useWeather();
  const [forecast, setForecast] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    fetch('/api/weather/forecast')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        setForecast(d);
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);

  const cyan = '#49d4ff';

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: 'var(--ink)' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 seam-b"
        style={{ background: 'var(--ink)' }}
      >
        <div className="flex items-baseline gap-3">
          <h1 className="stave-label" style={{ color: cyan }}>Weather</h1>
          <span className="text-[13px]" style={{ color: 'var(--chalk-3)' }}>
            {weather?.city || forecast?.city || ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="tap flex items-center px-3 stave-label"
          style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
        >
          Close
        </button>
      </header>

      <div className="px-5 pb-8 pt-5">
        {/* Current */}
        <section className="panel mb-px p-5">
          {weather ? (
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <p className="stave-label">Now</p>
                <p
                  className="font-mono tnum leading-none"
                  style={{ fontSize: 'clamp(3.5rem, 10vw, 5.5rem)', color: cyan }}
                >
                  {weather.temp}°
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-8 gap-y-2 pb-2 sm:grid-cols-3">
                <div>
                  <dt className="stave-label">Feels like</dt>
                  <dd className="font-mono text-xl tnum" style={{ color: 'var(--chalk)' }}>{weather.feels_like}°</dd>
                </div>
                <div>
                  <dt className="stave-label">Humidity</dt>
                  <dd className="font-mono text-xl tnum" style={{ color: 'var(--chalk)' }}>{weather.humidity}%</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="stave-label">Conditions</dt>
                  <dd className="text-xl capitalize" style={{ color: 'var(--chalk)' }}>{weather.description}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--chalk-3)' }}>Current conditions unavailable.</p>
          )}
        </section>

        {state === 'error' && (
          <p className="panel p-4 text-sm" style={{ color: 'var(--chalk-2)' }}>
            The forecast could not be loaded. Current conditions above are still live.
          </p>
        )}

        {state === 'ready' && forecast && (
          <>
            {/* Next hours, plotted */}
            <section className="panel mb-px p-5">
              <h2 className="stave-label mb-4">Next 24 hours</h2>

              <div className="h-24 w-full">
                <TempCurve points={forecast.hourly} color={cyan} />
              </div>

              <div className="mt-2 flex justify-between">
                {forecast.hourly.map((h) => (
                  <div key={h.time} className="flex flex-col items-center gap-1" style={{ minWidth: 40 }}>
                    <span className="font-mono text-sm tnum" style={{ color: 'var(--chalk)' }}>{h.temp}°</span>
                    <span className="font-mono text-[11px] tnum" style={{ color: 'var(--chalk-3)' }}>{hour(h.time)}</span>
                    {h.pop > 0 && (
                      <span className="font-mono text-[10px] tnum" style={{ color: cyan }}>{h.pop}%</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Five day */}
            <section className="panel p-5">
              <h2 className="stave-label mb-4">Five days</h2>

              <ul>
                {forecast.daily.map((d, i) => {
                  const allMin = Math.min(...forecast.daily.map((x) => x.min));
                  const allMax = Math.max(...forecast.daily.map((x) => x.max));
                  const span = allMax - allMin || 1;
                  const left = ((d.min - allMin) / span) * 100;
                  const width = ((d.max - d.min) / span) * 100;

                  return (
                    <li
                      key={d.date}
                      className={`flex items-center gap-4 py-3 ${i > 0 ? 'seam-t' : ''}`}
                    >
                      <span className="w-12 stave-label">
                        {i === 0 ? 'Today' : DAY[new Date(d.date).getDay()]}
                      </span>

                      <span className="w-10 text-right font-mono text-sm tnum" style={{ color: 'var(--chalk-2)' }}>
                        {d.min}°
                      </span>

                      {/* The day's range as a bar on a shared scale. */}
                      <span className="relative h-1.5 flex-1" style={{ background: 'var(--ink-3)' }}>
                        <span
                          className="absolute top-0 h-full"
                          style={{ left: `${left}%`, width: `${Math.max(width, 3)}%`, background: cyan }}
                        />
                      </span>

                      <span className="w-10 font-mono text-sm tnum" style={{ color: 'var(--chalk)' }}>
                        {d.max}°
                      </span>

                      <span className="w-10 text-right font-mono text-[11px] tnum" style={{ color: d.pop > 30 ? cyan : 'var(--chalk-3)' }}>
                        {d.pop > 0 ? `${d.pop}%` : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}

        {state === 'loading' && (
          <div className="panel p-5" style={{ color: cyan, opacity: 0.4 }}>
            <Comb seed="loading" bars={20} animated className="h-12 w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
