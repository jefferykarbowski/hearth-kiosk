import { useState, useEffect } from 'react';
import { StationMark } from '../marks/Marks';

function relTime(pubDate) {
  if (!pubDate) return null;
  const t = new Date(pubDate).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/**
 * News, read in full.
 *
 * Dense like a wire-service front page, but set in the score's grammar: one
 * lead, then a ruled index. Headlines open on the kiosk's own browser via the
 * existing kiosk endpoint rather than navigating away from the app.
 */
export default function NewsPanel({ onClose }) {
  const [headlines, setHeadlines] = useState([]);
  const [source, setSource] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    fetch('/api/news')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        setHeadlines(d.headlines || []);
        setSource(d.source || null);
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);

  const open = (link) => {
    if (!link) return;
    fetch('/api/kiosk/open-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: link }),
    }).catch(() => {});
  };

  const [lead, ...rest] = headlines;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: 'var(--ink)' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 seam-b"
        style={{ background: 'var(--ink)' }}
      >
        <div className="flex items-baseline gap-3">
          <h1 className="stave-label" style={{ color: 'var(--sig-cyan)' }}>News</h1>
          {source && <span className="text-[13px]" style={{ color: 'var(--chalk-3)' }}>{source}</span>}
        </div>
        <button
          onClick={onClose}
          className="tap flex items-center gap-2 px-3 stave-label"
          style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
        >
          Close
        </button>
      </header>

      {state === 'loading' && (
        <p className="p-6 text-sm" style={{ color: 'var(--chalk-3)' }}>Loading headlines…</p>
      )}

      {state === 'error' && (
        <div className="p-6">
          <p className="text-sm" style={{ color: 'var(--chalk)' }}>Could not load the news feed.</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--chalk-3)' }}>
            The backend could not reach the RSS source. Playback is unaffected.
          </p>
        </div>
      )}

      {state === 'ready' && (
        <div className="px-5 pb-8 pt-5">
          {/* Lead story */}
          {lead && (
            <button onClick={() => open(lead.link)} className="mb-px block w-full text-left">
              <article className="panel grid gap-4 p-4 md:grid-cols-[1.6fr_1fr]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="stave-label" style={{ color: 'var(--sig-cyan)' }}>Lead</span>
                    {relTime(lead.pubDate) && (
                      <span className="font-mono text-[11px] tnum" style={{ color: 'var(--chalk-3)' }}>
                        {relTime(lead.pubDate)}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold leading-[1.15]" style={{ color: 'var(--chalk)' }}>
                    {lead.title}
                  </h2>
                  {lead.description && (
                    <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed" style={{ color: 'var(--chalk-2)' }}>
                      {lead.description}
                    </p>
                  )}
                </div>

                <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--ink-3)' }}>
                  {lead.image ? (
                    <img src={lead.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full p-4" style={{ color: 'var(--sig-cyan)', opacity: 0.4 }}>
                      {/* No image in the feed. A mark derived from the headline
                          beats a stock placeholder and never implies a photo. */}
                      <StationMark name={lead.title} className="h-full w-full" />
                    </div>
                  )}
                </div>
              </article>
            </button>
          )}

          {/* Index */}
          <div className="grid gap-px md:grid-cols-2 xl:grid-cols-3" style={{ background: 'var(--ink-3)' }}>
            {rest.map((h, i) => (
              <button
                key={`${h.link}-${i}`}
                onClick={() => open(h.link)}
                className="flex gap-3 p-3 text-left transition-colors duration-150"
                style={{ background: 'var(--ink-2)' }}
              >
                <span
                  className="h-16 w-20 flex-shrink-0 overflow-hidden"
                  style={{ background: 'var(--ink-3)' }}
                >
                  {h.image ? (
                    <img src={h.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="block h-full w-full p-2" style={{ color: 'var(--sig-cyan)', opacity: 0.35 }}>
                      <StationMark name={h.title} className="h-full w-full" />
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-snug" style={{ color: 'var(--chalk)' }}>
                    {h.title}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    {relTime(h.pubDate) && (
                      <span className="font-mono text-[11px] tnum" style={{ color: 'var(--chalk-3)' }}>
                        {relTime(h.pubDate)}
                      </span>
                    )}
                    {h.author && (
                      <span className="truncate text-[11px]" style={{ color: 'var(--chalk-3)' }}>{h.author}</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {headlines.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--chalk-3)' }}>The feed returned no stories.</p>
          )}
        </div>
      )}
    </div>
  );
}
