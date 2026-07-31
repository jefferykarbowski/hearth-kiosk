import { useState } from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import BluetoothManager from '../widgets/BluetoothManager';

/* Small inline marks — the score's grammar, not an icon set. */
const Gear = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
  </svg>
);

const Tick = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <path d="M4 12.5l5.5 5.5L20 6.5" />
  </svg>
);

export default function KioskSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { kioskMode, setKioskMode, availableApps, refreshApps, loading } = useKiosk();
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [restarting, setRestarting] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshApps();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleRestart = async (type) => {
    setRestarting(true);
    try {
      const endpoint = type === 'kiosk' ? '/api/system/restart-kiosk' : '/api/system/reboot';
      await fetch(endpoint, { method: 'POST' });
    } catch (e) {
      console.error('Restart failed:', e);
    }
    setConfirm(null);
    // Deliberately leave `restarting` set — the machine is going down.
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="tap flex items-center justify-center seam-l"
        aria-label="Kiosk settings"
        style={{ color: 'var(--chalk-2)' }}
      >
        <Gear />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop. Opaque ink rather than a blur — this world has no glass. */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close settings"
            className="absolute inset-0 h-full w-full"
            style={{ background: 'rgba(7, 8, 10, 0.86)' }}
          />

          {/*
            Centred with flexbox, not with -translate-x-1/2.
            Framer Motion writes `transform` inline and resolves it to `none`
            once an animation settles, which silently deleted the translate
            centring and pushed this panel off the bottom of a 600px screen.
          */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kiosk settings"
            className="panel relative flex w-full flex-col"
            style={{ maxWidth: 480, maxHeight: 'min(88vh, 720px)' }}
          >
            <header className="flex flex-shrink-0 items-center justify-between p-4 seam-b">
              <h2 className="stave-label">Kiosk settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="tap flex items-center justify-center"
                aria-label="Close"
                style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>
            </header>

            {/* Only this region scrolls, so the header and footer stay put. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Kiosk mode */}
              <section className="flex items-center justify-between gap-4 p-4 seam-b">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold" style={{ color: 'var(--chalk)' }}>Kiosk mode</h3>
                  <p className="mt-0.5 text-[13px]" style={{ color: 'var(--chalk-3)' }}>
                    {kioskMode
                      ? 'Launch native apps instead of embedded players'
                      : 'Show embedded players in the app'}
                  </p>
                </div>

                <button
                  onClick={() => setKioskMode(!kioskMode)}
                  role="switch"
                  aria-checked={kioskMode}
                  aria-label={`Kiosk mode ${kioskMode ? 'on' : 'off'}`}
                  className="tap flex w-[84px] flex-shrink-0 flex-col justify-center gap-1.5 px-3"
                  style={{ border: '1px solid var(--ink-4)' }}
                >
                  <span
                    className="block h-[3px] w-full transition-all duration-200"
                    style={{ background: kioskMode ? 'var(--sig-green)' : 'var(--ink-4)' }}
                  />
                  <span className="stave-label" style={{ fontSize: 11, color: kioskMode ? 'var(--sig-green)' : 'var(--chalk-3)' }}>
                    {kioskMode ? 'On' : 'Off'}
                  </span>
                </button>
              </section>

              {/* Apps */}
              <section className="p-4 seam-b">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="stave-label">Available apps</h3>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="tap flex items-center justify-center disabled:opacity-40"
                    aria-label="Refresh app detection"
                    style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={refreshing ? 'animate-spin' : ''} aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
                    </svg>
                  </button>
                </div>

                {loading ? (
                  <p className="py-3 text-sm" style={{ color: 'var(--chalk-3)' }}>Detecting apps…</p>
                ) : availableApps.length === 0 ? (
                  <p className="py-3 text-sm" style={{ color: 'var(--chalk-3)' }}>No apps detected.</p>
                ) : (
                  <ul style={{ border: '1px solid var(--ink-3)' }}>
                    {availableApps.map((app, i) => (
                      <li
                        key={app.id}
                        className={`flex items-center gap-3 p-3 ${i > 0 ? 'seam-t' : ''}`}
                      >
                        <span
                          aria-hidden="true"
                          className="block h-8 w-[3px] flex-shrink-0"
                          style={{ background: app.available ? 'var(--sig-green)' : 'var(--ink-4)' }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium" style={{ color: 'var(--chalk)' }}>{app.name}</span>
                          <span className="block text-[13px]" style={{ color: 'var(--chalk-3)' }}>
                            {app.available ? 'Native app installed' : 'Web only'}
                          </span>
                        </span>
                        {app.available && (
                          <span style={{ color: 'var(--sig-green)' }}><Tick /></span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Bluetooth */}
              <section className="p-4 seam-b">
                <BluetoothManager />
              </section>

              {/* System — destructive actions kept isolated from everything else */}
              <section className="p-4">
                <h3 className="stave-label mb-3">System</h3>

                {confirm ? (
                  <div>
                    <p className="mb-3 text-sm" style={{ color: 'var(--chalk)' }}>
                      {confirm === 'kiosk'
                        ? 'Restart the kiosk application? Playback will stop.'
                        : 'Reboot the whole machine? This takes about a minute.'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirm(null)}
                        disabled={restarting}
                        className="tap flex-1 px-3 stave-label disabled:opacity-40"
                        style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRestart(confirm)}
                        disabled={restarting}
                        className="tap flex-1 px-3 stave-label disabled:opacity-40"
                        style={{ border: '1px solid var(--sig-magenta)', color: 'var(--sig-magenta)' }}
                      >
                        {restarting ? 'Restarting…' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirm('kiosk')}
                      className="tap flex-1 px-3 stave-label"
                      style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
                    >
                      Restart app
                    </button>
                    <button
                      onClick={() => setConfirm('system')}
                      className="tap flex-1 px-3 stave-label"
                      style={{ border: '1px solid var(--ink-4)', color: 'var(--chalk-2)' }}
                    >
                      Reboot
                    </button>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex-shrink-0 p-4 seam-t">
              <p className="text-[13px]" style={{ color: 'var(--chalk-3)' }}>
                {kioskMode
                  ? 'Spotify and Mixcloud open as native apps. Use the home button to come back.'
                  : 'Sources play inside the app.'}
              </p>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
