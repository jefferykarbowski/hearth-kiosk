import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ChevronLeft } from 'lucide-react';
import { useKiosk } from '../../contexts/KioskContext';
import { useRadio } from '../../contexts/RadioContext';

export default function SpotifyOverlay() {
  const { launchedApp, closeApp, returnHome } = useKiosk();
  const { setActiveTab } = useRadio();

  // Only show when Spotify is launched
  const isSpotifyActive = launchedApp?.id === 'spotify';

  const handleBackToRadio = async () => {
    await closeApp('spotify');
    await returnHome();
    setActiveTab('radio');
  };

  return (
    <AnimatePresence>
      {isSpotifyActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Back to Radio button - left column, vertically centered */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: 0.3 }}
            onClick={handleBackToRadio}
            /* Centred with auto margins, not -translate-y-1/2: Framer writes an
               inline transform for the x animation and would override it. */
            className="pointer-events-auto absolute bottom-0 left-2 top-0 my-auto flex h-fit flex-col items-center gap-3 px-3 py-6 font-medium"
            style={{
              background: 'var(--sig-green)',
              color: 'var(--ink)',
              border: '1px solid var(--sig-green)',
            }}
            whileHover={{ scale: 1.05, x: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-8 h-8" />
            <Radio className="w-10 h-10" />
            <span className="text-sm font-bold tracking-wide" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
              RADIO
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
