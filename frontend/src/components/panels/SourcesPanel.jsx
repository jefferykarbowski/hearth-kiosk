import { useSources } from '../../contexts/SourcesContext';
import { Comb, Block, Stipple } from '../marks/Marks';

function Mark({ kind, id, color }) {
  const cls = 'h-full w-full';
  const style = { color };
  if (kind === 'comb') return <span style={style} className="block h-6 w-10"><Comb seed={id} bars={7} className={cls} height={18} /></span>;
  if (kind === 'block') return <span style={style} className="block h-6 w-10"><Block seed={id} rows={3} className={cls} /></span>;
  return <span style={style} className="block h-6 w-10"><Stipple seed={id} count={40} animated={false} className={cls} /></span>;
}

/**
 * Arrange the score — which sources appear, and in what order.
 *
 * Reordering uses explicit up/down controls rather than drag: this is a
 * touchscreen used with wet hands, where a drag that starts a scroll instead
 * is a daily annoyance.
 */
export default function SourcesPanel({ onClose }) {
  const { sources, toggle, move } = useSources();

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: 'var(--ink)' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 seam-b"
        style={{ background: 'var(--ink)' }}
      >
        <h1 className="stave-label">Arrange sources</h1>
        <button
          onClick={onClose}
          className="tap flex items-center px-3 stave-label"
          style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
        >
          Done
        </button>
      </header>

      <div className="px-5 pb-8 pt-5">
        <p className="mb-4 max-w-[64ch] text-[13px]" style={{ color: 'var(--chalk-3)' }}>
          Each source is a stave. Switch one off to remove it from the rail, or move it to change
          the order it appears in.
        </p>

        <ul className="panel">
          {sources.map((s, i) => {
            const planned = s.status !== 'live';

            return (
              <li
                key={s.id}
                className={`flex items-center gap-4 p-4 ${i > 0 ? 'seam-t' : ''}`}
              >
                <Mark kind={s.mark} id={s.id} color={s.color} />

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold" style={{ color: planned ? 'var(--chalk-2)' : 'var(--chalk)' }}>
                    {s.label}
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--chalk-3)' }}>
                    {planned ? 'Not available yet' : s.legend}
                  </p>
                </div>

                {/* Order */}
                <div className="flex">
                  <button
                    onClick={() => move(s.id, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${s.label} earlier`}
                    className="tap flex items-center justify-center disabled:opacity-20"
                    style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 6l8 10H4z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => move(s.id, 1)}
                    disabled={i === sources.length - 1}
                    aria-label={`Move ${s.label} later`}
                    className="tap ml-px flex items-center justify-center disabled:opacity-20"
                    style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 18L4 8h16z" />
                    </svg>
                  </button>
                </div>

                {/* On / off — a stave rule that lights, not a pill switch. */}
                <button
                  onClick={() => toggle(s.id)}
                  disabled={planned}
                  role="switch"
                  aria-checked={s.enabled}
                  aria-label={`${s.label} ${s.enabled ? 'on' : 'off'}`}
                  className="tap flex w-[84px] flex-col justify-center gap-1.5 px-3 disabled:opacity-30"
                  style={{ border: '1px solid var(--ink-4)' }}
                >
                  <span
                    className="block h-[3px] w-full transition-all duration-200"
                    style={{ background: s.enabled ? s.color : 'var(--ink-4)' }}
                  />
                  <span className="stave-label" style={{ color: s.enabled ? s.color : 'var(--chalk-3)', fontSize: 11 }}>
                    {s.enabled ? 'On' : 'Off'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 max-w-[64ch] text-[13px]" style={{ color: 'var(--chalk-3)' }}>
          Apple Music and Amazon Music are listed for ordering but are not connected yet.
        </p>
      </div>
    </div>
  );
}
