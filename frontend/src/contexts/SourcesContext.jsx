import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { loadLayout, saveLayout, resolveSources } from '../config/sources';

const SourcesContext = createContext(null);

export function SourcesProvider({ children }) {
  const [layout, setLayout] = useState(loadLayout);

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const sources = useMemo(() => resolveSources(layout), [layout]);
  const enabled = useMemo(() => sources.filter((s) => s.enabled), [sources]);

  const toggle = useCallback((id) => {
    setLayout((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  /** Move a source one position earlier or later in the score. */
  const move = useCallback((id, direction) => {
    setLayout((prev) => {
      const ordered = [...prev].sort((a, b) => a.order - b.order);
      const i = ordered.findIndex((s) => s.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= ordered.length) return prev;
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      return ordered.map((s, idx) => ({ ...s, order: idx }));
    });
  }, []);

  const value = useMemo(
    () => ({ sources, enabled, toggle, move }),
    [sources, enabled, toggle, move]
  );

  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

export function useSources() {
  const ctx = useContext(SourcesContext);
  if (!ctx) throw new Error('useSources must be used within SourcesProvider');
  return ctx;
}
