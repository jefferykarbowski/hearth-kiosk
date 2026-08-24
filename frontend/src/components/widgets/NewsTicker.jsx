import { useState, useEffect } from 'react';

// PLACEHOLDER - Can be enhanced with 21st.dev Magic component

export default function NewsTicker() {
  const [headlines, setHeadlines] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await res.json();
          setHeadlines(data.headlines || []);
        }
      } catch (e) {
        console.error('News fetch error:', e);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 10 * 60 * 1000); // Every 10 min
    return () => clearInterval(interval);
  }, []);

  if (headlines.length === 0) return null;

  return (
    <div className="overflow-hidden py-2" style={{ background: 'var(--ink)' }}>
      <div className="animate-scroll flex whitespace-nowrap">
        {/* Duplicated so the loop has no visible seam. */}
        {[...headlines, ...headlines].map((headline, i) => (
          <span key={i} className="mx-8 text-sm" style={{ color: 'var(--chalk-2)' }}>
            {/* A tick on the time axis, not a bullet. */}
            <span aria-hidden="true" className="mr-3 inline-block align-middle" style={{ width: 1, height: 11, background: 'var(--sig-cyan)' }} />
            {headline.title}
          </span>
        ))}
      </div>
    </div>
  );
}
