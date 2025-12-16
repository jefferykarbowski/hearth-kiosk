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
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-3 px-3 py-6 rounded-2xl font-medium shadow-2xl text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(79, 70, 229, 0.95))',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
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
