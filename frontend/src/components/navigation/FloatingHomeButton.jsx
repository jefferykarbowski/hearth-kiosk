import { motion, AnimatePresence } from 'framer-motion';
import { Home, Radio, X, XCircle } from 'lucide-react';
import { useKiosk } from '../../contexts/KioskContext';
import { useRadio } from '../../contexts/RadioContext';
import { useState } from 'react';

export default function FloatingHomeButton() {
  const { launchedApp, returnHome, closeApp, kioskMode } = useKiosk();
  const { setActiveTab } = useRadio();
  const [expanded, setExpanded] = useState(false);

  // Always show in kiosk mode as a quick access button
  if (!kioskMode) return null;

  const handleReturnHome = async () => {
    await returnHome();
    setActiveTab('radio');
    setExpanded(false);
  };

  const handleCloseApp = async () => {
    if (launchedApp?.id) {
      await closeApp(launchedApp.id);
      await returnHome();
    }
    setExpanded(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2"
      >
        {/* Expanded menu */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex flex-col gap-2 mb-2"
            >
              {/* Return to Radio button */}
              <motion.button
                onClick={handleReturnHome}
                className="tap flex items-center gap-3 px-4 py-3 font-medium"
                style={{
                  background: 'var(--sig-green)',
                  color: 'var(--ink)',
                  border: '1px solid var(--sig-green)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Radio className="w-5 h-5" />
                <span>Back to Radio</span>
              </motion.button>

              {/* Close external app button - only show when app is launched */}
              {launchedApp && (
                <motion.button
                  onClick={handleCloseApp}
                  className="tap flex items-center gap-3 px-4 py-3 font-medium"
                  style={{
                    background: 'var(--ink-2)',
                    color: 'var(--chalk)',
                    border: '1px solid var(--ink-4)',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <XCircle className="w-5 h-5" />
                  <span>Close {launchedApp.app || launchedApp.id}</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main floating button */}
        <motion.button
          onClick={() => setExpanded(!expanded)}
          className="tap-lg flex items-center justify-center"
          style={{
            background: expanded ? 'var(--ink-2)' : 'var(--sig-green)',
            color: expanded ? 'var(--chalk)' : 'var(--ink)',
            border: `1px solid ${expanded ? 'var(--ink-4)' : 'var(--sig-green)'}`,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            rotate: expanded ? 180 : 0,
          }}
        >
          {expanded ? (
            <X className="w-6 h-6" />
          ) : (
            <Home className="w-6 h-6" />
          )}
        </motion.button>

        {/* An external app is running: the stave rule breathes rather than a halo. */}
        {launchedApp && !expanded && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 -top-1"
            style={{
              height: 3,
              background: 'var(--sig-green)',
            }}
            animate={{
              opacity: [1, 0.25, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
