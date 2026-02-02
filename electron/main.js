const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Enable touch support for Linux touchscreens
app.commandLine.appendSwitch('touch-events', 'enabled');
app.commandLine.appendSwitch('enable-touch-drag-drop');
app.commandLine.appendSwitch('touch-selection-strategy', 'direction');
app.commandLine.appendSwitch('disable-pinch');
app.commandLine.appendSwitch('overscroll-history-navigation', '0');
app.commandLine.appendSwitch('enable-features', 'TouchpadAndWheelScrollLatching,AsyncTouchStartForScrollingEnabled');

// GPU settings for Surface Pro Linux
// app.commandLine.appendSwitch('disable-gpu');  // Try with GPU enabled
// app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

// Keep a global reference of the window object
let mainWindow;

// Backend URL
const KIOSK_URL = 'http://localhost:3001';

function createWindow() {
  // Create the browser window - testing without strict kiosk mode
  mainWindow = new BrowserWindow({
    width: 2736,
    height: 1824,
    fullscreen: true,
    frame: false,           // No window frame/title bar
    // kiosk: true,         // Can try this if fullscreen still crashes
    // kiosk: true,         // Disabled for testing
    autoHideMenuBar: true,  // Hide menu bar
    backgroundColor: '#1a1a2e', // Dark background while loading
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,       // Try without sandbox
      // Allow autoplay
      autoplayPolicy: 'no-user-gesture-required',
    }
  });

  // Enable autoplay for audio/video
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:"]
      }
    });
  });

  // Load the kiosk URL
  mainWindow.loadURL(KIOSK_URL);

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent the window from being closed accidentally
  mainWindow.on('close', (e) => {
    // Could add confirmation dialog here if needed
  });

  // Log when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Kiosk loaded successfully');
  });

  // Handle page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
    // Retry after 5 seconds
    setTimeout(() => {
      console.log('Retrying...');
      mainWindow.loadURL(KIOSK_URL);
    }, 5000);
  });

  // Handle crashes
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer crashed, reloading...', killed);
    setTimeout(() => {
      mainWindow.loadURL(KIOSK_URL);
    }, 2000);
  });

  // Handle unresponsive
  mainWindow.on('unresponsive', () => {
    console.error('Window unresponsive, reloading...');
    mainWindow.loadURL(KIOSK_URL);
  });

  // Prevent new windows from opening (keep everything in kiosk)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open Spotify URLs externally if needed, otherwise deny
    if (url.includes('spotify.com')) {
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });
}

// When Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  app.quit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

console.log('Kitchen Radio Kiosk - Electron starting...');
