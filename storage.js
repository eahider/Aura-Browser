const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LocalStore {
  constructor() {
    this.userDataPath = app ? app.getPath('userData') : path.join(__dirname, 'browser_data');
    if (!fs.existsSync(this.userDataPath)) {
      try {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      } catch (e) {
        console.error('Failed to create userData dir', e);
      }
    }

    this.dataFile = path.join(this.userDataPath, 'aura_data.json');
    this.defaults = {
      settings: {
        searchEngine: 'duckduckgo', // 'duckduckgo', 'brave', 'google', 'yandex'
        hibernateTimeoutMinutes: 5, // suspend tab after 5 minutes of inactivity
        privacyShieldEnabled: true,
        stripTrackingParams: true,
        clearOnExit: false,
        theme: 'dark',
        language: 'ru', // 'ru' | 'en'
        vpnEnabled: false,
        selectedVpnServer: 'nl-ams',
        customProxyUrl: '',
        vpnSubscriptionUrl: '',
        vpnSubscriptionInfo: null,
        vpnImportedServers: [],
        torStartupMode: 'ask', // 'ask', 'always', 'never'
        torPort: 9050,
        torBridges: '',
        useTorBridges: false,
        torBridgeType: 'obfs4', // 'obfs4' | 'webtunnel'
        vpnRoutingScope: 'browser', // 'browser' | 'system'
        smartBypassEnabled: true, // true | false
        deviceHwid: ''
      },
      bookmarks: [
        { id: '1', title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '' },
        { id: '2', title: 'GitHub', url: 'https://github.com', icon: '' },
        { id: '3', title: 'Wikipedia', url: 'https://wikipedia.org', icon: '' }
      ],
      history: []
    };

    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...this.defaults,
          ...parsed,
          settings: {
            ...this.defaults.settings,
            ...(parsed.settings || {})
          }
        };
      }
    } catch (err) {
      console.error('Failed to read aura_data.json, falling back to defaults:', err);
    }
    return JSON.parse(JSON.stringify(this.defaults));
  }

  save() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save aura_data.json:', err);
    }
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  getDeviceHwid() {
    if (!this.data.settings.deviceHwid) {
      const crypto = require('crypto');
      this.data.settings.deviceHwid = crypto.randomUUID();
      this.save();
    }
    return this.data.settings.deviceHwid;
  }

  setDeviceHwid(hwid) {
    this.data.settings.deviceHwid = (hwid || '').trim();
    this.save();
    return this.data.settings.deviceHwid;
  }

  getBookmarks() {
    return this.data.bookmarks;
  }

  addBookmark(item) {
    if (!item.url) return this.data.bookmarks;
    const exists = this.data.bookmarks.find(b => b.url === item.url);
    if (!exists) {
      this.data.bookmarks.unshift({
        id: Date.now().toString(),
        title: item.title || item.url,
        url: item.url,
        icon: item.icon || '',
        createdAt: new Date().toISOString()
      });
      this.save();
    }
    return this.data.bookmarks;
  }

  removeBookmark(id) {
    this.data.bookmarks = this.data.bookmarks.filter(b => b.id !== id);
    this.save();
    return this.data.bookmarks;
  }

  getHistory(limit = 100) {
    return this.data.history.slice(0, limit);
  }

  addHistory(entry) {
    if (!entry.url || entry.url.startsWith('about:') || entry.url.startsWith('file://')) return;
    // Don't add duplicate of most recent entry
    if (this.data.history[0] && this.data.history[0].url === entry.url) {
      return;
    }
    this.data.history.unshift({
      id: Date.now().toString(),
      title: entry.title || entry.url,
      url: entry.url,
      visitedAt: new Date().toISOString()
    });
    // Cap history at 500 items for zero bloat
    if (this.data.history.length > 500) {
      this.data.history.length = 500;
    }
    this.save();
  }

  clearHistory() {
    this.data.history = [];
    this.save();
    return [];
  }

  clearAllData() {
    this.data.history = [];
    this.save();
    return true;
  }
}

module.exports = { LocalStore };
