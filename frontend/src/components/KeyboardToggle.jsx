import { Keyboard } from 'lucide-react';

export default function KeyboardToggle() {
  const toggleKeyboard = async () => {
    try {
      await fetch('/api/kiosk/keyboard/toggle', { method: 'POST' });
    } catch (e) {
      console.error('Failed to toggle keyboard:', e);
    }
  };

  return (
    <button
      onClick={toggleKeyboard}
      className="fixed bottom-20 right-4 z-[9999] w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
      title="Toggle keyboard"
    >
      <Keyboard className="w-6 h-6 text-white" />
    </button>
  );
}
