/**
 * Marks — the notation vocabulary. See DESIGN.md.
 *
 * Every mark is drawn SVG in the score's own grammar. These replace icon-font
 * glyphs and logo tiles throughout the interface. Each takes its colour from
 * `currentColor` so a stave's identity propagates without prop drilling.
 */

/** Deterministic pseudo-random in [0,1) from a string — so a station's mark
 *  is always drawn the same way, across reloads and across devices. */
export function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Comb — a cluster of vertical rules. Broadband static; the radio mark.
 * `animated` makes the rules flicker at uneven intervals so it reads as noise.
 */
export function Comb({ seed = 'lyrapod', bars = 9, animated = false, className = '', height = 28 }) {
  const rnd = seedFrom(seed);
  const rules = Array.from({ length: bars }, (_, i) => ({
    x: i * (100 / bars) + 100 / bars / 2,
    h: 0.25 + rnd() * 0.75,
    dur: (0.9 + rnd() * 1.4).toFixed(2),
    delay: (rnd() * 1.2).toFixed(2),
  }));

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {rules.map((r, i) => (
        <rect
          key={i}
          x={r.x - 1.1}
          y={height - r.h * height}
          width="2.2"
          height={r.h * height}
          fill="currentColor"
          className={animated ? 'comb-rule' : undefined}
          style={animated ? { '--dur': `${r.dur}s`, '--delay': `${r.delay}s` } : { opacity: 0.75 }}
        />
      ))}
    </svg>
  );
}

/**
 * Arc — the whistler. A tone descending through the spectrum over several
 * seconds. Reserved for the live realization; using it elsewhere would spend
 * the one mark that means "this is playing".
 */
export function Arc({ className = '', strokeWidth = 2, animated = true }) {
  return (
    <svg
      viewBox="0 0 200 100"
      className={`${animated ? 'mark-draw' : ''} ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ '--len': 320 }}
    >
      <path
        d="M2 14 C 60 16, 88 30, 104 54 S 150 88, 198 92"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Block — a sustained bar. A mix, a set, a long-form show.
 */
export function Block({ seed = 'lyrapod', className = '', rows = 4 }) {
  const rnd = seedFrom(seed);
  const bars = Array.from({ length: rows }, (_, i) => ({
    y: i * (100 / rows) + 2,
    x: rnd() * 22,
    w: 40 + rnd() * 58,
  }));

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false" preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={100 / rows - 4}
          fill="currentColor"
          opacity={0.35 + (i / rows) * 0.5}
        />
      ))}
    </svg>
  );
}

/**
 * Stipple — a dot field. Noise, idle, the resting score.
 */
export function Stipple({ seed = 'lyrapod', count = 110, className = '', animated = true }) {
  const rnd = seedFrom(seed);
  const dots = Array.from({ length: count }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    r: 0.22 + rnd() * 0.55,
    o: 0.2 + rnd() * 0.8,
  }));

  return (
    // `slice` keeps the dots circular. Stretching a dot field turns every dot
    // into an ellipse, which reads as a smear rather than as noise.
    <svg
      viewBox="0 0 100 100"
      className={`${animated ? 'stipple' : ''} ${className}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" opacity={d.o} />
      ))}
    </svg>
  );
}

/**
 * StationMark — the per-station glyph. Derived from the station's own name, so
 * every station has a stable, distinct mark without anyone drawing 47 of them.
 */
export function StationMark({ name = '', playing = false, className = '' }) {
  const rnd = seedFrom(name);
  const kind = Math.floor(rnd() * 3);

  if (kind === 0) return <Comb seed={name} bars={7} animated={playing} className={className} />;
  if (kind === 1) return <Block seed={name} rows={4} className={className} />;
  return <Stipple seed={name} count={64} animated={playing} className={className} />;
}
