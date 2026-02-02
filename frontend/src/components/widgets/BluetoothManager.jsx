import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bluetooth, BluetoothConnected, BluetoothOff, RefreshCw, Loader2, Speaker, Headphones, Smartphone } from 'lucide-react';

export default function BluetoothManager() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [btStatus, setBtStatus] = useState({ available: false, powered: false });

  // Fetch devices on mount and periodically
  useEffect(() => {
    fetchStatus();
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bluetooth/status');
      const data = await res.json();
      setBtStatus(data);
    } catch {
      setBtStatus({ available: false, powered: false });
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/bluetooth/devices');
      const data = await res.json();
      if (data.devices) {
        setDevices(data.devices);
        setError(null);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (e) {
      setError('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (address) => {
    setConnecting(address);
    setError(null);
    try {
      const res = await fetch(`/api/bluetooth/connect/${address}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Connection failed');
      }
      await fetchDevices();
    } catch (e) {
      setError('Connection failed');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (address) => {
    setConnecting(address);
    setError(null);
    try {
      const res = await fetch(`/api/bluetooth/disconnect/${address}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Disconnect failed');
      }
      await fetchDevices();
    } catch (e) {
      setError('Disconnect failed');
    } finally {
      setConnecting(null);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      await fetch('/api/bluetooth/scan', { method: 'POST' });
      // Poll for new devices during scan
      const scanInterval = setInterval(fetchDevices, 2000);
      setTimeout(() => {
        clearInterval(scanInterval);
        setScanning(false);
        fetchDevices();
      }, 10000);
    } catch {
      setError('Scan failed');
      setScanning(false);
    }
  };

  const getDeviceIcon = (device) => {
    const iconType = device.icon?.toLowerCase() || '';
    if (iconType.includes('audio') || iconType.includes('speaker')) {
      return Speaker;
    }
    if (iconType.includes('headphone') || iconType.includes('headset')) {
      return Headphones;
    }
    if (iconType.includes('phone')) {
      return Smartphone;
    }
    return device.connected ? BluetoothConnected : Bluetooth;
  };

  if (!btStatus.available) {
    return (
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center gap-3 text-white/50">
          <BluetoothOff className="w-5 h-5" />
          <span>Bluetooth not available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-white/80 flex items-center gap-2">
          <Bluetooth className="w-4 h-4 text-blue-400" />
          Bluetooth Devices
        </h3>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title={scanning ? 'Scanning...' : 'Scan for devices'}
        >
          <RefreshCw className={`w-4 h-4 text-white/60 ${scanning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-red-400 text-sm px-3 py-2 rounded-lg bg-red-500/10"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning indicator */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-blue-400 text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Scanning for devices...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device list */}
      {loading ? (
        <div className="text-center text-white/50 py-4">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading devices...
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center text-white/50 py-4">
          No paired devices found
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device);
            const isConnecting = connecting === device.address;

            return (
              <motion.div
                key={device.address}
                layout
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: device.connected
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: device.connected
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  device.connected
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/10 text-white/40'
                }`}>
                  <DeviceIcon className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{device.name}</h4>
                  <p className="text-xs text-white/50">
                    {device.connected ? 'Connected' : 'Paired'}
                  </p>
                </div>

                {/* Action button */}
                <button
                  onClick={() => device.connected
                    ? handleDisconnect(device.address)
                    : handleConnect(device.address)
                  }
                  disabled={isConnecting}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    device.connected
                      ? 'bg-white/10 hover:bg-white/20 text-white/70'
                      : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                  }`}
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : device.connected ? (
                    'Disconnect'
                  ) : (
                    'Connect'
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
