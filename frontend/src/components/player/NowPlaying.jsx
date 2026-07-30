import { useRadio } from '../../contexts/RadioContext';
import { Arc, Stipple, Comb } from '../marks/Marks';

/** Transport control. Square, hairline-bounded, sized for wet hands. */
function Transport({ label, onClick, disabled, primary = false, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex items-center justify-center transition-colors duration-150 disabled:opacity-25"
      style={{
        // Transport minimum is 64px — wet hands. Prev/Next were 56 and failed it.
        width: primary ? 84 : 64,
        height: primary ? 84 : 64,
        border: `1px solid ${primary ? 'var(--sig-green)' : 'var(--ink-4)'}`,
        background: primary ? 'var(--sig-green)' : 'transparent',
        color: primary ? 'var(--ink)' : 'var(--chalk)',
      }}
    >
      {children}
    </button>
  );
}

/**
 * The realization — what the score sounds like right now.
 *
 * The whistler arc is reserved for this panel alone: it is the one mark that
 * means "playing". Artwork, when the backend resolves it from iTunes, sits
 * behind the marks rather than replacing them.
 */
export default function NowPlaying() {
  const { currentStation, isPlaying, metadata, togglePlay, nextStation, prevStation } = useRadio();

  const artwork = metadata.artwork || currentStation?.logo || null;
  const title = metadata.title || currentStation?.name || 'No station';
  const detail = metadata.artist || currentStation?.genre || 'Choose a station to begin';

  return (
    <section className="panel flex w-full flex-col" aria-label="Now playing">
      {/* The field: artwork behind, marks in front. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: 'var(--ink)' }}>
        {artwork && (
          <img
            src={artwork}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: isPlaying ? 0.34 : 0.16, filter: 'grayscale(0.4) contrast(1.1)' }}
          />
        )}

        {/* Idle: a resting stipple field. Playing: the whistler descends. */}
        <div className="absolute inset-0" style={{ color: 'var(--sig-green)' }}>
          {isPlaying ? (
            <div className="whistler h-full w-full p-6">
              <Arc className="h-full w-full" strokeWidth={1.5} />
            </div>
          ) : (
            <Stipple seed={currentStation?.name || 'idle'} count={130} className="h-full w-full" />
          )}
        </div>

        {/* Frequency ruler — the score's own axis, not a progress bar. */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-3 pb-2">
          {['10k', '5k', '1k', '500', '100'].map((hz) => (
            <span key={hz} className="font-mono text-[10px] tnum" style={{ color: 'var(--chalk-3)' }}>
              {hz}
            </span>
          ))}
        </div>
      </div>

      {/* Reading */}
      <div className="seam-t p-4">
        <p className="stave-label" style={{ color: isPlaying ? 'var(--sig-green)' : 'var(--chalk-3)' }}>
          {isPlaying ? 'On air' : currentStation ? 'Paused' : 'Idle'}
        </p>
        <h2 className="mt-1.5 text-lg font-semibold leading-tight" style={{ color: 'var(--chalk)' }}>
          {title}
        </h2>
        <p className="mt-0.5 text-[13px]" style={{ color: 'var(--chalk-2)' }}>
          {detail}
        </p>
      </div>

      {/* Transport */}
      <div className="seam-t flex items-center justify-center gap-3 p-4">
        <Transport label="Previous station" onClick={prevStation} disabled={!currentStation}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 5h2.5v14H6zM20 5v14L9.5 12z" />
          </svg>
        </Transport>

        <Transport label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} disabled={!currentStation} primary>
          {isPlaying ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4h4v16H7zM13 4h4v16h-4z" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 3l16 9-16 9z" />
            </svg>
          )}
        </Transport>

        <Transport label="Next station" onClick={nextStation} disabled={!currentStation}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M15.5 5H18v14h-2.5zM4 5l10.5 7L4 19z" />
          </svg>
        </Transport>
      </div>

      {/* Live signal strip — a working level meter, not an ornament. */}
      <div className="seam-t h-8 px-4 py-2" style={{ color: 'var(--sig-green)', opacity: isPlaying ? 1 : 0.2 }}>
        <Comb seed={currentStation?.name || 'flat'} bars={28} animated={isPlaying} className="h-full w-full" height={16} />
      </div>
    </section>
  );
}
