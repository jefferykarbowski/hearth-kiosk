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
    <div className="bg-black/50 backdrop-blur-sm border-t border-white/10 py-2 overflow-hidden">
      <div className="animate-scroll flex whitespace-nowrap">
        {/* Duplicate headlines for seamless loop */}
        {[...headlines, ...headlines].map((headline, i) => (
          <span key={i} className="mx-8 text-sm text-white/70">
            <span className="text-indigo-400 mr-2">•</span>
            {headline.title}
          </span>
        ))}
      </div>
    </div>
  );
}
