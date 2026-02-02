import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Monitor, Smartphone, Globe, RefreshCw, Check, RotateCcw, Power, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import BluetoothManager from '../widgets/BluetoothManager';

export default function KioskSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    kioskMode,
    setKioskMode,
    availableApps,
    refreshApps,
    loading
  } = useKiosk();
  const [refreshing, setRefreshing] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(null);
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
    setShowRestartConfirm(null);
    // Don't reset restarting state - we're about to restart anyway
  };

  return (
    <>
      {/* Settings trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full transition-colors hover:bg-white/10"
        title="Kiosk Settings"
      >
        <Settings className="w-5 h-5 text-white/60 hover:text-white" />
      </button>

      {/* Settings Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[90vh]"
            >
              <div
                className="rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
                style={{
                  background: 'rgba(20, 20, 30, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-indigo-400" />
                    Kiosk Settings
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Kiosk Mode Toggle */}
                <div 
                  className="p-4 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Kiosk Mode</h3>
                      <p className="text-sm text-white/60 mt-1">
                        {kioskMode 
                          ? 'Launch native apps instead of embedded players'
                          : 'Show embedded players in browser'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => setKioskMode(!kioskMode)}
                      className={`
                        relative w-14 h-8 rounded-full transition-colors
                        ${kioskMode ? 'bg-indigo-500' : 'bg-white/20'}
                      `}
                    >
                      <motion.div
                        className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md"
                        animate={{ left: kioskMode ? '1.75rem' : '0.25rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>

                {/* Available Apps */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white/80">Available Apps</h3>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      title="Refresh app detection"
                    >
                      <RefreshCw 
                        className={`w-4 h-4 text-white/60 ${refreshing ? 'animate-spin' : ''}`} 
                      />
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center text-white/50 py-4">
                      Detecting apps...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableApps.map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center gap-3 p-3 rounded-lg"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          {/* Icon */}
                          <div 
                            className={`
                              w-10 h-10 rounded-lg flex items-center justify-center
                              ${app.available 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-white/10 text-white/40'
                              }
                            `}
                          >
                            {app.available ? (
                              <Smartphone className="w-5 h-5" />
                            ) : (
                              <Globe className="w-5 h-5" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <h4 className="font-medium">{app.name}</h4>
                            <p className="text-xs text-white/50">
                              {app.available 
                                ? 'Native app installed' 
                                : 'Web only'
                              }
                            </p>
                          </div>

                          {/* Status */}
                          {app.available && (
                            <Check className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bluetooth Devices */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <BluetoothManager />
                </div>

                {/* System Controls */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <h3 className="font-medium text-white/80 mb-3 flex items-center gap-2">
                    <Power className="w-4 h-4 text-orange-400" />
                    System Controls
                  </h3>

                  <AnimatePresence mode="wait">
                    {showRestartConfirm ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          {showRestartConfirm === 'kiosk'
                            ? 'Restart the kiosk application?'
                            : 'Reboot the entire system?'}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRestart(showRestartConfirm)}
                            disabled={restarting}
                            className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-colors"
                          >
                            {restarting ? 'Restarting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setShowRestartConfirm(null)}
                            disabled={restarting}
                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="buttons"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex gap-2"
                      >
                        <button
                          onClick={() => setShowRestartConfirm('kiosk')}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 font-medium transition-colors"
                          title="Restart the kiosk application"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restart Kiosk
                        </button>
                        <button
                          onClick={() => setShowRestartConfirm('system')}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium transition-colors"
                          title="Reboot the entire system"
                        >
                          <Power className="w-4 h-4" />
                          Reboot System
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Help text */}
                <p className="text-xs text-white/40 text-center">
                  {kioskMode
                    ? 'Clicking Spotify or Mixcloud will launch the native app. Use the floating home button to return.'
                    : 'Apps will open as embedded players within the browser.'
                  }
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
