const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Tabs
  createTab: (url) => ipcRenderer.invoke('create-tab', url),
  closeTab: (tabId) => ipcRenderer.invoke('close-tab', tabId),
  switchTab: (tabId) => ipcRenderer.invoke('switch-tab', tabId),
  navigateTab: (tabId, url) => ipcRenderer.invoke('navigate-tab', { tabId, url }),
  goBack: (tabId) => ipcRenderer.invoke('tab-go-back', tabId),
  goForward: (tabId) => ipcRenderer.invoke('tab-go-forward', tabId),
  reloadTab: (tabId) => ipcRenderer.invoke('tab-reload', tabId),
  hibernateTab: (tabId) => ipcRenderer.invoke('tab-hibernate', tabId),

  // Events from Main process
  onTabCreated: (cb) => ipcRenderer.on('tab-created', (_event, data) => cb(data)),
  onTabUpdated: (cb) => ipcRenderer.on('tab-updated', (_event, data) => cb(data)),
  onTabClosed: (cb) => ipcRenderer.on('tab-closed', (_event, data) => cb(data)),
  onTabActivated: (cb) => ipcRenderer.on('tab-activated', (_event, data) => cb(data)),
  onShieldStats: (cb) => ipcRenderer.on('shield-stats-update', (_event, data) => cb(data)),
  onMemoryStats: (cb) => ipcRenderer.on('memory-stats-update', (_event, data) => cb(data)),
  onShortcut: (cb) => ipcRenderer.on('shortcut-trigger', (_event, action) => cb(action)),

  // Privacy Shield
  toggleShield: (enabled) => ipcRenderer.invoke('toggle-shield', enabled),
  getShieldStats: (tabId) => ipcRenderer.invoke('get-shield-stats', tabId),
  setModalOpen: (isOpen) => ipcRenderer.invoke('set-modal-open', isOpen),

  // Built-in VPN & Tor
  getVpnStatus: () => ipcRenderer.invoke('vpn-get-status'),
  getVpnServers: () => ipcRenderer.invoke('vpn-get-servers'),
  enableVpn: (serverId, customUrl, scope) => ipcRenderer.invoke('vpn-enable', { serverId, customUrl, scope }),
  enableTor: (port, scope) => ipcRenderer.invoke('tor-enable', { port, scope }),
  checkTorPort: (port) => ipcRenderer.invoke('tor-check-port', port),
  setVpnScope: (scope) => ipcRenderer.invoke('vpn-set-scope', scope),
  toggleSmartBypass: (enabled) => ipcRenderer.invoke('bypass-toggle', enabled),
  getSmartBypassStatus: () => ipcRenderer.invoke('bypass-get-status'),
  importVpnSubscription: (urlOrConfig, customTitle) => ipcRenderer.invoke('vpn-import-subscription', urlOrConfig, customTitle),
  updateVpnSubscription: () => ipcRenderer.invoke('vpn-update-subscription'),
  deleteVpnSubscription: () => ipcRenderer.invoke('vpn-delete-subscription'),
  pingVpnServers: () => ipcRenderer.invoke('vpn-ping-servers'),
  getVpnSubscriptionInfo: () => ipcRenderer.invoke('vpn-get-subscription-info'),
  getDeviceHwid: () => ipcRenderer.invoke('vpn-get-device-hwid'),
  setDeviceHwid: (hwid) => ipcRenderer.invoke('vpn-set-device-hwid', hwid),
  getXrayStatus: () => ipcRenderer.invoke('xray-get-status'),
  installXray: () => ipcRenderer.invoke('xray-install'),
  onXrayProgress: (cb) => ipcRenderer.on('xray-download-progress', (_event, percent) => cb(percent)),
  saveTorBridges: (opts) => ipcRenderer.invoke('tor-save-bridges', opts),
  openTorTelegramBot: () => ipcRenderer.invoke('tor-open-telegram-bot'),
  onTorStartupPrompt: (cb) => ipcRenderer.on('tor-startup-prompt', (_event, data) => cb(data)),
  respondTorStartup: (enableTor) => ipcRenderer.invoke('tor-startup-response', enableTor),

  // Built-in Password Manager
  getSavedPasswords: () => ipcRenderer.invoke('passwords-get-all'),
  savePassword: (cred) => ipcRenderer.invoke('passwords-save', cred),
  deletePassword: (id) => ipcRenderer.invoke('passwords-delete', id),
  onPasswordSavePrompt: (cb) => ipcRenderer.on('password-save-prompt', (_event, data) => cb(data)),

  // Audio Mute
  toggleTabMute: (tabId) => ipcRenderer.invoke('tab-toggle-mute', tabId),

  // Bookmarks & History
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  addBookmark: (item) => ipcRenderer.invoke('add-bookmark', item),
  removeBookmark: (id) => ipcRenderer.invoke('remove-bookmark', id),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  clearAllBrowsingData: () => ipcRenderer.invoke('clear-all-data'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Find in page
  findInPage: (text, forward) => ipcRenderer.invoke('find-in-page', { text, forward }),
  stopFindInPage: () => ipcRenderer.invoke('stop-find-in-page'),

  // Open external or inspect
  openDevTools: () => ipcRenderer.send('open-devtools')
});
