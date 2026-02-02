/**
 * Hearth Sync Service
 * Syncs kiosk configuration from the Hearth website
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/hearth-config.json');
const DEFAULT_CONFIG = {
  kioskId: null,
  hearthApiUrl: 'https://hearth-at-home.com/api',
  location: null,
  timezone: 'America/Detroit',
  tabs: {
    radio: true,
    spotify: true,
    weather: true,
    recipes: false,
    youtube: true,
    mixcloud: true,
  },
  radioStations: [
    'wcbn', 'kfjc', 'kalx', 'wfmu', 'kcrw', 'nts1', 'nts2'
  ],
  services: {
    spotify: false,
    allrecipes: false,
    youtube: false,
  },
  lastSync: null,
};

class HearthSync {
  constructor() {
    this.config = this.loadConfig();
    this.syncInterval = null;
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error loading Hearth config:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig() {
    try {
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving Hearth config:', error);
    }
  }

  async syncFromCloud() {
    if (!this.config.kioskId) {
      console.log('No kiosk ID configured, skipping sync');
      return null;
    }

    try {
      const response = await fetch(
        `${this.config.hearthApiUrl}/kiosk/${this.config.kioskId}/config`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.config) {
        this.config = {
          ...this.config,
          ...data.config,
          lastSync: new Date().toISOString(),
        };
        this.saveConfig();
        console.log('Synced config from Hearth cloud');
      }

      return this.config;
    } catch (error) {
      console.error('Error syncing from Hearth cloud:', error);
      return null;
    }
  }

  startAutoSync(intervalMs = 5 * 60 * 1000) {
    // Sync every 5 minutes by default
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncFromCloud();
    }, intervalMs);

    // Initial sync
    this.syncFromCloud();
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  setKioskId(kioskId) {
    this.config.kioskId = kioskId;
    this.saveConfig();
  }

  getConfig() {
    return this.config;
  }

  updateLocal(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    return this.config;
  }
}

// Singleton instance
const hearthSync = new HearthSync();

module.exports = hearthSync;
