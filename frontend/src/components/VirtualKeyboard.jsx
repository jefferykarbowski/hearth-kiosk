import { useState, useEffect, useRef } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'simple-keyboard/build/css/index.css';

export default function VirtualKeyboard({ onChange, onClose, initialValue = '' }) {
  const [input, setInput] = useState(initialValue);
  const [layout, setLayout] = useState('default');
  const keyboardRef = useRef();

  const onKeyPress = (button) => {
    if (button === '{shift}' || button === '{lock}') {
      setLayout(layout === 'default' ? 'shift' : 'default');
    } else if (button === '{enter}') {
      onChange(input);
      onClose?.();
    } else if (button === '{bksp}') {
      const newInput = input.slice(0, -1);
      setInput(newInput);
      onChange(newInput);
    } else if (button === '{space}') {
      const newInput = input + ' ';
      setInput(newInput);
      onChange(newInput);
    } else if (!button.startsWith('{')) {
      const newInput = input + button;
      setInput(newInput);
      onChange(newInput);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(30, 30, 30, 0.98)',
      padding: '10px',
      zIndex: 2147483647,
      borderTop: '2px solid #444',
      isolation: 'isolate'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        padding: '0 10px'
      }}>
        <input
          type="text"
          value={input}
          readOnly
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '18px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '8px',
            color: 'white',
            marginRight: '10px'
          }}
        />
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#1DB954',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Done
        </button>
      </div>
      <Keyboard
        keyboardRef={r => (keyboardRef.current = r)}
        layoutName={layout}
        onChange={setInput}
        onKeyPress={onKeyPress}
        theme="hg-theme-default hg-layout-default dark-theme"
        layout={{
          default: [
            '1 2 3 4 5 6 7 8 9 0 {bksp}',
            'q w e r t y u i o p',
            'a s d f g h j k l',
            '{shift} z x c v b n m {shift}',
            '{space}'
          ],
          shift: [
            '! @ # $ % ^ & * ( ) {bksp}',
            'Q W E R T Y U I O P',
            'A S D F G H J K L',
            '{shift} Z X C V B N M {shift}',
            '{space}'
          ]
        }}
        display={{
          '{bksp}': '⌫',
          '{enter}': '↵',
          '{shift}': '⇧',
          '{space}': 'space'
        }}
      />
      <style>{`
        .dark-theme {
          background: transparent !important;
        }
        .dark-theme .hg-button {
          background: #444 !important;
          color: white !important;
          border: 1px solid #555 !important;
          height: 50px !important;
          font-size: 18px !important;
        }
        .dark-theme .hg-button:active {
          background: #1DB954 !important;
        }
        .dark-theme .hg-button[data-skbtn="{space}"] {
          min-width: 300px !important;
        }
      `}</style>
    </div>
  );
}
