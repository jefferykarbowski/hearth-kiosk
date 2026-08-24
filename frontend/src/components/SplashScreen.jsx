import { useEffect, useState } from 'react';

/**
 * Boot splash. The generated whistler plate carries the field; the wordmark is
 * drawn into the negative space the image was composed to leave.
 *
 * Shows once per app start, then dissolves. It never blocks input — if the app
 * is ready sooner, the splash is already on its way out.
 */
export default function SplashScreen({ duration = 2200 }) {
  const [phase, setPhase] = useState('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), duration);
    const t2 = setTimeout(() => setPhase('gone'), duration + 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration]);

  if (phase === 'gone') return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-700"
      style={{
        background: 'var(--ink)',
        opacity: phase === 'out' ? 0 : 1,
      }}
    >
      <img
        src="/brand/splash-01.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.85 }}
      />

      {/* The field darkens toward the wordmark so type never fights the plate. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 30%, var(--ink) 92%)' }}
      />

      <div className="relative p-8 pb-12 md:p-12 md:pb-16">
        <h1
          className="font-semibold leading-none"
          style={{
            fontSize: 'clamp(2.75rem, 9vw, 6rem)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--chalk)',
          }}
        >
          LyraPod
        </h1>
        <p
          className="mt-3 max-w-[46ch] text-[13px] md:text-[15px]"
          style={{ color: 'var(--chalk-2)', letterSpacing: '0.04em' }}
        >
          Freeform and community radio, long-form sets, and streaming — on one screen.
        </p>
      </div>
    </div>
  );
}
