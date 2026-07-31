import { useState } from 'react';
import { useRadio } from '../../contexts/RadioContext';
import { StationMark } from '../marks/Marks';

/**
 * The station index — every station is a cell in the score carrying its own
 * mark. The live cell is identified by the source colour on its left seam and
 * by its mark moving, never by a fill or a glow.
 */
export default function StationGrid() {
  const { stations, currentStation, isPlaying, playStation } = useRadio();
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => setImageErrors((prev) => ({ ...prev, [id]: true }));

  if (!stations.length) {
    return (
      <div className="panel p-8 text-center">
        <p className="stave-label">No stations</p>
        <p className="mt-2 text-sm text-chalk-2">
          The station list could not be loaded. Check the backend connection.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Stations">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="stave-label">Stations</h2>
        <span className="font-mono text-xs text-chalk-3 tnum">{stations.length}</span>
      </header>

      <div className="grid grid-cols-2 gap-px xl:grid-cols-3" style={{ background: 'var(--ink-3)' }}>
        {stations.map((station) => {
          const active = currentStation?.id === station.id;
          const live = active && isPlaying;
          // Track and artist deliberately live only in the realization panel:
          // repeating them here made the active cell grow and shove the grid.
          const useFallback = !station.logo || imageErrors[station.id];

          return (
            <button
              key={station.id}
              onClick={() => playStation(station)}
              aria-current={active ? 'true' : undefined}
              className="group relative flex min-h-[92px] items-start gap-3 p-3 text-left transition-colors duration-200"
              style={{ background: active ? 'var(--ink-3)' : 'var(--ink-2)' }}
            >
              {/* Live seam — the only place the source colour appears in a cell. */}
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 top-0 transition-all duration-300"
                style={{ width: active ? 3 : 0, background: 'var(--sig-green)' }}
              />

              {/* Station identity: real logo where one exists, its mark otherwise. */}
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden"
                style={{ border: '1px solid var(--ink-4)' }}
              >
                {!useFallback ? (
                  <img
                    src={station.logo}
                    alt=""
                    className="h-full w-full object-contain p-0.5"
                    loading="lazy"
                    onError={() => handleImageError(station.id)}
                  />
                ) : (
                  <span className="block h-6 w-8" style={{ color: 'var(--sig-green)' }}>
                    <StationMark name={station.name} playing={live} className="h-full w-full" />
                  </span>
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[15px] font-semibold leading-tight"
                  style={{ color: active ? 'var(--chalk)' : 'var(--chalk)' }}
                >
                  {station.name}
                </span>
                <span className="mt-0.5 block truncate text-[13px]" style={{ color: 'var(--chalk-3)' }}>
                  {station.genre}
                </span>
              </span>

              {/* Playing: a small live comb rather than an icon badge. */}
              {live && (
                <span
                  aria-label="Playing"
                  className="block h-5 w-6 flex-shrink-0"
                  style={{ color: 'var(--sig-green)' }}
                >
                  <StationMark name={station.name} playing className="h-full w-full" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
