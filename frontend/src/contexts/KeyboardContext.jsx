import { createContext, useContext, useState } from 'react';

const KeyboardContext = createContext();

export function KeyboardProvider({ children }) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  return (
    <KeyboardContext.Provider value={{ isKeyboardOpen, setIsKeyboardOpen }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  return useContext(KeyboardContext);
}
