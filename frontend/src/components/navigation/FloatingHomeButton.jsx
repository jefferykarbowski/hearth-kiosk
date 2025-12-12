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
                className="flex items-center gap-3 px-4 py-3 rounded-full font-medium shadow-lg"
                style={{
                  background: 'rgba(99, 102, 241, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
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
                  className="flex items-center gap-3 px-4 py-3 rounded-full font-medium shadow-lg"
                  style={{
                    background: 'rgba(239, 68, 68, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
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
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: expanded 
              ? 'rgba(239, 68, 68, 0.95)' 
              : 'rgba(99, 102, 241, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
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

        {/* Pulse animation when app is launched */}
        {launchedApp && !expanded && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'rgba(99, 102, 241, 0.5)',
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
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
