const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { PrivacyShield } = require('./privacyFilter');
const { MemoryManager } = require('./memoryManager');
const { LocalStore } = require('./storage');
const { VpnManager } = require('./vpnManager');
const { xrayCore } = require('./xrayCore');
const { dpiEngine } = require('./dpiEngine');
const { PasswordManager } = require('./passwordManager');
const { setupContextMenu } = require('./contextMenu');

// Enforce single instance lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock && !process.argv.includes('--smoke-test')) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ================= PERFORMANCE & PRIVACY CHROMIUM FLAGS =================
// Privacy: disable Google telemetry and crash reporting
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-metrics');
app.commandLine.appendSwitch('disable-metrics-reporting');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('no-default-browser-check');

// Performance: Native DNS prefetching and speculative connections
app.commandLine.appendSwitch('dns-prefetch-disable', '0');
// Disable QUIC: TSPU throttles/drops UDP 443 to googlevideo/YouTube, causing 10-15s black screen/hang. TCP/TLS (HTTP/2) connects immediately.
app.commandLine.appendSwitch('disable-quic');
app.commandLine.appendSwitch('enable-tcp-fast-open');

// Performance: GPU acceleration and hardware rendering
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('canvas-oop-rasterization');

// Performance: High-speed V8 JIT & Disk Cache (512MB)
app.commandLine.appendSwitch('disk-cache-size', '536870912');
app.commandLine.appendSwitch('media-cache-size', '268435456');

// Native Chromium Dark Mode Engine (pure prefers-color-scheme, no GPU inversion penalty)
app.commandLine.appendSwitch('force-dark-mode');

app.commandLine.appendSwitch(
  'disable-features',
  'Translate,AutofillServerCommunication,OptimizationHints,MediaRouter,DialMediaRouteProvider,HeavyAdIntervention,PostQuantumKyber,TLS13PostQuantumKyber'
);
app.commandLine.appendSwitch(
  'enable-features',
  'WebAssemblyLazyCompilation,ParallelDownloading,BackForwardCache,CanvasOopRasterization'
);

// State
let mainWindow = null;
let tabs = new Map(); // tabId -> { id, view, url, title, favicon, isHibernated, canGoBack, canGoForward, isLoading }
let activeTabId = null;
let tabCounter = 1;

const HEADER_HEIGHT = 84;
const NEW_TAB_URL = `file://${path.join(__dirname, 'ui', 'newtab.html')}`;

const storage = new LocalStore();
const privacyShield = new PrivacyShield();
let vpnManager = null;
const passwordManager = new PasswordManager();
const memoryManager = new MemoryManager({
  timeoutMinutes: storage.getSettings().hibernateTimeoutMinutes || 5
});

// Configure memory manager callback
memoryManager.setHibernateCallback((tabId, _tabState) => {
  const tab = tabs.get(tabId);
  if (tab && !tab.isHibernated) {
    if (tab.view) {
      try {
        mainWindow.contentView.removeChildView(tab.view);
        tab.view.webContents.close();
      } catch (e) {
        console.error('Error closing hibernated view:', e);
      }
      tab.view = null;
    }
    tab.isHibernated = true;
    sendTabUpdate(tabId, { isHibernated: true });
    broadcastMemoryStats();
  }
});

// Periodic hibernation check
const hiberTimer = setInterval(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    memoryManager.checkHibernation(activeTabId);
  }
}, 30000);
if (hiberTimer.unref) hiberTimer.unref();

// ================= SETUP PRIVACY & NETWORK INTERCEPTOR =================
function setupNetworkShield() {
  const ses = session.defaultSession;

  // Intercept & block tracking domains and strip UTM parameters
  ses.webRequest.onBeforeRequest((details, callback) => {
    const rawUrl = details.url;

    // Skip internal browser files
    if (rawUrl.startsWith('file://') || rawUrl.startsWith('devtools://')) {
      return callback({ cancel: false });
    }

    // Auto-redirect deprecated root web.telegram.org to modern Web K to prevent blank screen
    if (details.resourceType === 'main_frame') {
      try {
        const u = new URL(rawUrl);
        if (u.hostname === 'web.telegram.org' && (u.pathname === '/' || u.pathname === '')) {
          return callback({ redirectURL: 'https://web.telegram.org/k/' });
        }
      } catch {}
    }

    // Check if tracking / telemetry URL
    if (details.resourceType === 'main_frame') {
      // Main frame is only blocked if the domain itself is a tracker
      if (privacyShield.isTrackingDomain(rawUrl)) {
        privacyShield.recordBlocked(activeTabId, rawUrl);
        return callback({ cancel: true });
      }
    } else {
      // Subresources are checked against domain + path heuristics
      if (privacyShield.isTrackingUrl(rawUrl)) {
        privacyShield.recordBlocked(activeTabId, rawUrl);
        return callback({ cancel: true });
      }
    }

    // Strip tracking parameters from navigation URLs if enabled
    if (details.resourceType === 'main_frame' && storage.getSettings().stripTrackingParams !== false) {
      const cleanedUrl = privacyShield.cleanUrl(rawUrl);
      if (cleanedUrl !== rawUrl) {
        return callback({ redirectURL: cleanedUrl });
      }
    }

    callback({ cancel: false });
  });

  // Inject Do-Not-Track & Global Privacy Control headers (filtered to frames & XHR so media/images bypass Node)
  const headerFilter = {
    urls: ['http://*/*', 'https://*/*'],
    types: ['mainFrame', 'subFrame', 'xhr']
  };

  ses.webRequest.onBeforeSendHeaders(headerFilter, (details, callback) => {
    details.requestHeaders['DNT'] = '1';
    details.requestHeaders['Sec-GPC'] = '1';
    callback({ requestHeaders: details.requestHeaders });
  });
}

// ================= WINDOW CREATION =================
function createMainWindow() {
  // Force dark theme for the app
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#0e1015',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      v8CacheOptions: 'bypassHeatCheck',
      spellcheck: false
    }
  });

  // Show window only after it's ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  mainWindow.on('resize', () => {
    updateActiveViewBounds();
  });

  mainWindow.on('close', () => {
    for (const [, tab] of tabs.entries()) {
      if (tab.view) {
        try {
          tab.view.webContents.close();
        } catch {}
      }
    }
    tabs.clear();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // When shell is ready, open initial tab & handle startup Tor/VPN
  mainWindow.webContents.once('did-finish-load', async () => {
    createTab(NEW_TAB_URL);
    broadcastMemoryStats();

    const currentSettings = storage.getSettings();
    if (currentSettings.torStartupMode === 'always') {
      await vpnManager.enableTor(currentSettings.torPort || 9050);
    } else if (currentSettings.torStartupMode === 'ask') {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-startup-prompt');
        }
      }, 500);
    } else if (currentSettings.vpnEnabled) {
      await vpnManager.enableVpn(currentSettings.selectedVpnServer, currentSettings.customProxyUrl);
    }
  });
}

function updateActiveViewBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const activeTab = tabs.get(activeTabId);
  if (!activeTab || !activeTab.view) return;

  const [width, height] = mainWindow.getContentSize();
  activeTab.view.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width: width,
    height: Math.max(0, height - HEADER_HEIGHT)
  });
}

// ================= TAB MANAGEMENT =================
function createTab(initialUrl = NEW_TAB_URL) {
  const tabId = `tab_${tabCounter++}`;
  const targetUrl = initialUrl === 'aura://newtab' ? NEW_TAB_URL : initialUrl;

  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      v8CacheOptions: 'bypassHeatCheck',
      spellcheck: false,
      enablePreferredSizeMode: false,
      backgroundThrottling: true
    }
  });
  view.setBackgroundColor('#0e1015');

  const tab = {
    id: tabId,
    view: view,
    url: targetUrl,
    title: 'New Tab',
    favicon: '',
    isHibernated: false,
    canGoBack: false,
    canGoForward: false,
    isLoading: false
  };

  tabs.set(tabId, tab);
  memoryManager.registerTab(tabId, { url: targetUrl, title: tab.title, favicon: tab.favicon });

  setupViewListeners(tab);

  // Switch to new tab
  switchTab(tabId);

  // Load URL
  view.webContents.loadURL(targetUrl);

  // Notify UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tab-created', {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isHibernated: tab.isHibernated,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
      isLoading: tab.isLoading
    });
  }

  broadcastMemoryStats();
  return tab;
}

function setupViewListeners(tab) {
  const { view, id: tabId } = tab;

  // Handle popups / window.open
  view.webContents.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: 'deny' };
  });

  // Global browser keyboard shortcuts while focused on web content
  view.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    // Zoom shortcuts (Ctrl++, Ctrl+-, Ctrl+0)
    if (input.control && (input.key === '=' || input.key === '+')) {
      event.preventDefault();
      const currentZoom = view.webContents.getZoomLevel();
      view.webContents.setZoomLevel(Math.min(currentZoom + 0.5, 3.0));
      return;
    }
    if (input.control && input.key === '-') {
      event.preventDefault();
      const currentZoom = view.webContents.getZoomLevel();
      view.webContents.setZoomLevel(Math.max(currentZoom - 0.5, -2.0));
      return;
    }
    if (input.control && input.key === '0') {
      event.preventDefault();
      view.webContents.setZoomLevel(0);
      return;
    }

    // Standard Navigation & Tab shortcuts
    if (input.control && !input.shift && !input.alt) {
      const key = input.key.toLowerCase();
      if (key === 't') {
        event.preventDefault();
        createTab(NEW_TAB_URL);
        return;
      }
      if (key === 'w') {
        event.preventDefault();
        closeTab(tabId);
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        view.webContents.reload();
        return;
      }
      if (key === 'l') {
        event.preventDefault();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut-trigger', 'focus-omnibox');
        }
        return;
      }
      if (key === 'f') {
        event.preventDefault();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut-trigger', 'open-find');
        }
        return;
      }
      if (key === 'h') {
        event.preventDefault();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut-trigger', 'toggle-history');
        }
        return;
      }
      if (key === 'b') {
        event.preventDefault();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut-trigger', 'toggle-bookmarks');
        }
        return;
      }
      if (key === 'd') {
        event.preventDefault();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut-trigger', 'bookmark-current');
        }
        return;
      }
    }

    // Ctrl+Shift+I or F12 -> Open/close DevTools
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      event.preventDefault();
      if (view.webContents.isDevToolsOpened()) {
        view.webContents.closeDevTools();
      } else {
        view.webContents.openDevTools({ mode: 'detach' });
      }
      return;
    }

    // Ctrl+Shift+R or Ctrl+F5 -> Hard reload
    if ((input.control && input.shift && input.key.toLowerCase() === 'r') || (input.control && input.key === 'F5')) {
      event.preventDefault();
      view.webContents.reloadIgnoringCache();
      return;
    }

    // F5 -> Reload
    if (input.key === 'F5') {
      event.preventDefault();
      view.webContents.reload();
      return;
    }

    // Alt+Left -> Back, Alt+Right -> Forward
    if (input.alt && input.key === 'ArrowLeft') {
      event.preventDefault();
      const nh = view.webContents.navigationHistory;
      if (nh ? nh.canGoBack() : view.webContents.canGoBack()) {
        if (nh) nh.goBack(); else view.webContents.goBack();
      }
      return;
    }
    if (input.alt && input.key === 'ArrowRight') {
      event.preventDefault();
      const nh = view.webContents.navigationHistory;
      if (nh ? nh.canGoForward() : view.webContents.canGoForward()) {
        if (nh) nh.goForward(); else view.webContents.goForward();
      }
      return;
    }

    // Ctrl+Tab / Ctrl+Shift+Tab -> Next/Prev tab
    if (input.control && input.key === 'Tab') {
      event.preventDefault();
      const tabIds = Array.from(tabs.keys());
      if (tabIds.length > 1) {
        const curIdx = tabIds.indexOf(activeTabId);
        if (input.shift) {
          const prevIdx = (curIdx - 1 + tabIds.length) % tabIds.length;
          switchTab(tabIds[prevIdx]);
        } else {
          const nextIdx = (curIdx + 1) % tabIds.length;
          switchTab(tabIds[nextIdx]);
        }
      }
      return;
    }

    // Ctrl+Shift+L -> Passwords vault
    if (input.control && input.shift && input.key.toLowerCase() === 'l') {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut-trigger', 'toggle-passwords');
      }
      return;
    }

    // Escape -> close modals / stop find
    if (input.key === 'Escape') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut-trigger', 'escape');
      }
    }
  });

  // Professional desktop context menu
  setupContextMenu(view.webContents, {
    onOpenLinkInNewTab: (url) => createTab(url),
    onSearch: (q) => createTab('https://duckduckgo.com/?q=' + encodeURIComponent(q))
  });

  // Audio playing & muting support
  view.webContents.on('media-started-playing', () => {
    sendTabUpdate(tabId, { isAudible: true, isMuted: view.webContents.isAudioMuted() });
  });
  view.webContents.on('media-stopped-playing', () => {
    sendTabUpdate(tabId, { isAudible: false, isMuted: view.webContents.isAudioMuted() });
  });

  // Autofill, login capture, and dark mode injection on DOM ready
  view.webContents.on('dom-ready', async () => {
    try {
      const currentUrl = view.webContents.getURL();

      // Inject universal dark mode hints for web content without breaking custom site styles
      if (currentUrl.startsWith('http://') || currentUrl.startsWith('https://')) {
        view.webContents.insertCSS(`
          :root {
            color-scheme: dark;
          }
        `).catch(() => {});

        let domain = '';
        try {
          domain = new URL(currentUrl).hostname;
        } catch {}

        if (domain) {
          const creds = passwordManager.getForDomain(domain);
          if (creds.length > 0) {
            const cred = creds[0];
            const autofillJs = `
              (() => {
                try {
                  const u = ${JSON.stringify(cred.username)};
                  const p = ${JSON.stringify(cred.password)};
                  const pwInputs = document.querySelectorAll('input[type="password"]');
                  pwInputs.forEach(pi => {
                    if (!pi.value) {
                      pi.value = p;
                      pi.dispatchEvent(new Event('input', { bubbles: true }));
                      pi.dispatchEvent(new Event('change', { bubbles: true }));
                      const form = pi.form || document;
                      const usrInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[name*="email"]');
                      if (usrInputs.length > 0 && !usrInputs[0].value) {
                        usrInputs[0].value = u;
                        usrInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                        usrInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }
                  });
                } catch(e){}
              })();
            `;
            view.webContents.executeJavaScript(autofillJs);
          }
        }

        // Form submit detection hook for saving passwords
        const formHookJs = `
          (() => {
            if (window.__auraFormHook) return;
            window.__auraFormHook = true;
            document.addEventListener('submit', (e) => {
              try {
                const form = e.target;
                const passInput = form.querySelector('input[type="password"]');
                if (!passInput || !passInput.value) return;
                const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[name*="email"]');
                let username = '';
                for (const ti of textInputs) {
                  if (ti.value && ti.value !== passInput.value) {
                    username = ti.value;
                    break;
                  }
                }
                if (username && passInput.value) {
                  console.log('__AURA_LOGIN__:' + JSON.stringify({
                    domain: window.location.hostname,
                    username: username,
                    password: passInput.value
                  }));
                }
              } catch(err){}
            }, true);
          })();
        `;
        view.webContents.executeJavaScript(formHookJs);
      }
    } catch (e) {}
  });

  // Capture login detection message
  view.webContents.on('console-message', (event, level, message) => {
    const rawMsg = (event && typeof event.message === 'string') ? event.message : (typeof message === 'string' ? message : (typeof level === 'string' ? level : ''));
    if (rawMsg && rawMsg.startsWith('__AURA_LOGIN__:')) {
      try {
        const payload = JSON.parse(rawMsg.replace('__AURA_LOGIN__:', ''));
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('password-save-prompt', payload);
        }
      } catch {}
    }
  });

  view.webContents.on('did-start-loading', () => {
    tab.isLoading = true;
    sendTabUpdate(tabId, { isLoading: true });
  });

  view.webContents.on('did-stop-loading', () => {
    const navHistory = view.webContents.navigationHistory;
    tab.isLoading = false;
    tab.canGoBack = navHistory ? navHistory.canGoBack() : view.webContents.canGoBack();
    tab.canGoForward = navHistory ? navHistory.canGoForward() : view.webContents.canGoForward();
    tab.url = view.webContents.getURL();
    memoryManager.updateTabInfo(tabId, { url: tab.url });

    sendTabUpdate(tabId, {
      isLoading: false,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
      url: tab.url
    });

    if (tabId === activeTabId && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        'shield-stats-update',
        privacyShield.getTabStats(tabId)
      );
    }
  });

  view.webContents.on('page-title-updated', (_event, title) => {
    tab.title = title;
    memoryManager.updateTabInfo(tabId, { title });
    sendTabUpdate(tabId, { title });
    storage.addHistory({ title, url: tab.url });
  });

  view.webContents.on('page-favicon-updated', (_event, favicons) => {
    if (favicons && favicons.length > 0) {
      tab.favicon = favicons[0];
      memoryManager.updateTabInfo(tabId, { favicon: tab.favicon });
      sendTabUpdate(tabId, { favicon: tab.favicon });
    }
  });
}

function switchTab(tabId) {
  if (!tabs.has(tabId)) return;
  const targetTab = tabs.get(tabId);

  // If currently active tab has a view attached, remove it
  if (activeTabId && tabs.has(activeTabId)) {
    const prevTab = tabs.get(activeTabId);
    if (prevTab && prevTab.view && mainWindow) {
      try {
        mainWindow.contentView.removeChildView(prevTab.view);
      } catch {}
    }
  }

  activeTabId = tabId;
  memoryManager.touchTab(tabId);

  // If tab was hibernated, wake it up!
  if (targetTab.isHibernated || !targetTab.view) {
    targetTab.isHibernated = false;
    memoryManager.wakeTab(tabId);

    targetTab.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        v8CacheOptions: 'bypassHeatCheck',
        spellcheck: false,
        backgroundThrottling: true
      }
    });
    targetTab.view.setBackgroundColor('#0e1015');
    setupViewListeners(targetTab);
    targetTab.view.webContents.loadURL(targetTab.url);
  }

  // Attach view to window
  if (mainWindow && targetTab.view) {
    mainWindow.contentView.addChildView(targetTab.view);
    updateActiveViewBounds();
  }

  // Notify UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tab-activated', tabId);
    mainWindow.webContents.send(
      'shield-stats-update',
      privacyShield.getTabStats(tabId)
    );
  }

  broadcastMemoryStats();
}

function closeTab(tabId) {
  if (!tabs.has(tabId)) return;
  const tab = tabs.get(tabId);

  // Clean up view
  if (tab.view) {
    try {
      if (mainWindow) mainWindow.contentView.removeChildView(tab.view);
      tab.view.webContents.close();
    } catch {}
  }

  tabs.delete(tabId);
  memoryManager.unregisterTab(tabId);
  privacyShield.clearTab(tabId);

  // Notify UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tab-closed', tabId);
  }

  // If closed tab was active, switch to next available tab
  if (activeTabId === tabId) {
    if (tabs.size > 0) {
      const remainingTabIds = Array.from(tabs.keys());
      const nextTabId = remainingTabIds[remainingTabIds.length - 1];
      switchTab(nextTabId);
    } else {
      createTab(NEW_TAB_URL);
    }
  }

  broadcastMemoryStats();
}

function sendTabUpdate(tabId, updates) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tab-updated', { id: tabId, ...updates });
  }
}

function broadcastMemoryStats() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('memory-stats-update', memoryManager.getStats());
  }
}

// ================= IPC HANDLERS =================
function setupIpcHandlers() {
  // Window Controls
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Tabs
  ipcMain.handle('create-tab', (_event, url) => {
    const tab = createTab(url || NEW_TAB_URL);
    return tab.id;
  });

  ipcMain.handle('close-tab', (_event, tabId) => {
    closeTab(tabId);
    return true;
  });

  ipcMain.handle('switch-tab', (_event, tabId) => {
    switchTab(tabId);
    return true;
  });

  ipcMain.handle('navigate-tab', (_event, { tabId, url }) => {
    const tab = tabs.get(tabId);
    if (tab) {
      const targetUrl = url === 'aura://newtab' ? NEW_TAB_URL : url;
      tab.url = targetUrl;
      if (tab.view) {
        tab.view.webContents.loadURL(targetUrl);
      } else {
        // Tab was hibernated, wake and load
        switchTab(tabId);
      }
    }
    return true;
  });

  ipcMain.handle('tab-go-back', (_event, tabId) => {
    const tab = tabs.get(tabId);
    if (tab && tab.view) {
      const navHistory = tab.view.webContents.navigationHistory;
      if (navHistory && navHistory.canGoBack()) {
        navHistory.goBack();
      } else if (tab.view.webContents.canGoBack()) {
        tab.view.webContents.goBack();
      }
    }
  });

  ipcMain.handle('tab-go-forward', (_event, tabId) => {
    const tab = tabs.get(tabId);
    if (tab && tab.view) {
      const navHistory = tab.view.webContents.navigationHistory;
      if (navHistory && navHistory.canGoForward()) {
        navHistory.goForward();
      } else if (tab.view.webContents.canGoForward()) {
        tab.view.webContents.goForward();
      }
    }
  });

  ipcMain.handle('tab-reload', (_event, tabId) => {
    const tab = tabs.get(tabId);
    if (tab && tab.view) {
      if (tab.isLoading) {
        tab.view.webContents.stop();
      } else {
        tab.view.webContents.reload();
      }
    }
  });

  ipcMain.handle('tab-hibernate', (_event, tabId) => {
    return memoryManager.hibernateTab(tabId);
  });

  // Modal Overlay Visibility Toggle
  ipcMain.handle('set-modal-open', (_event, isOpen) => {
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.view && typeof activeTab.view.setVisible === 'function') {
      activeTab.view.setVisible(!isOpen);
    }
    return true;
  });

  // Shield
  ipcMain.handle('toggle-shield', (_event, enabled) => {
    return privacyShield.toggle(enabled);
  });

  ipcMain.handle('get-shield-stats', (_event, tabId) => {
    return privacyShield.getTabStats(tabId || activeTabId);
  });

  // Bookmarks & History
  ipcMain.handle('get-bookmarks', () => storage.getBookmarks());
  ipcMain.handle('add-bookmark', (_event, item) => storage.addBookmark(item));
  ipcMain.handle('remove-bookmark', (_event, id) => storage.removeBookmark(id));
  ipcMain.handle('get-history', () => storage.getHistory());
  ipcMain.handle('clear-history', () => storage.clearHistory());

  ipcMain.handle('clear-all-data', async () => {
    storage.clearAllData();
    await session.defaultSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'cache', 'shadercache', 'websql', 'indexdb']
    });
    return true;
  });

  // Settings
  ipcMain.handle('get-settings', () => storage.getSettings());
  ipcMain.handle('save-settings', (_event, newSettings) => {
    const updated = storage.updateSettings(newSettings);
    if (updated.hibernateTimeoutMinutes !== undefined) {
      memoryManager.setTimeoutMinutes(updated.hibernateTimeoutMinutes);
    }
    return updated;
  });

  // Find in page
  ipcMain.handle('find-in-page', (_event, { text, forward }) => {
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.view) {
      activeTab.view.webContents.findInPage(text, { forward, findNext: true });
    }
  });

  ipcMain.handle('stop-find-in-page', () => {
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.view) {
      activeTab.view.webContents.stopFindInPage('clearSelection');
    }
  });

  // Built-in VPN & Tor IPC Handlers
  ipcMain.handle('vpn-get-status', () => {
    return vpnManager ? vpnManager.getStatus() : {};
  });

  ipcMain.handle('vpn-get-servers', () => {
    return vpnManager ? vpnManager.getServers() : [];
  });

  ipcMain.handle('vpn-enable', async (_event, { serverId, customUrl, scope }) => {
    if (!vpnManager) return false;
    const currentScope = scope || storage.getSettings().vpnRoutingScope || 'browser';
    const ok = await vpnManager.enableVpn(serverId, customUrl, currentScope);
    if (ok) {
      storage.updateSettings({ vpnEnabled: true, selectedVpnServer: serverId, customProxyUrl: customUrl || '', vpnRoutingScope: currentScope });
    }
    return vpnManager.getStatus();
  });

  ipcMain.handle('tor-enable', async (_event, { port, scope } = {}) => {
    if (!vpnManager) return { success: false };
    const currentScope = scope || storage.getSettings().vpnRoutingScope || 'browser';
    const res = await vpnManager.enableTor(port || 9050, currentScope);
    return { ...res, status: vpnManager.getStatus() };
  });

  ipcMain.handle('tor-check-port', async (_event, port) => {
    if (!vpnManager) return false;
    return await vpnManager.checkTorPort(port || 9050);
  });

  ipcMain.handle('vpn-set-scope', (_event, scope) => {
    if (!vpnManager) return 'browser';
    const s = vpnManager.setRoutingScope(scope);
    storage.updateSettings({ vpnRoutingScope: s });
    return s;
  });

  ipcMain.handle('bypass-toggle', async (_event, enabled) => {
    if (!vpnManager) return { enabled: false };
    const status = await vpnManager.toggleSmartBypass(enabled);
    storage.updateSettings({ smartBypassEnabled: status.enabled });
    return status;
  });

  ipcMain.handle('bypass-get-status', () => {
    return vpnManager ? vpnManager.getBypassStatus() : { enabled: false };
  });

  ipcMain.handle('proxy-disable', async () => {
    if (!vpnManager) return false;
    await vpnManager.disableProxy();
    storage.updateSettings({ vpnEnabled: false });
    return vpnManager.getStatus();
  });

  ipcMain.handle('tor-startup-response', async (_event, enableTor) => {
    if (enableTor && vpnManager) {
      await vpnManager.enableTor(storage.getSettings().torPort || 9050);
    }
    return vpnManager.getStatus();
  });

  // Tor Bridges & Telegram Bot
  ipcMain.handle('tor-save-bridges', async (_event, { bridges, useBridges, bridgeType }) => {
    if (!vpnManager) return { success: false };
    vpnManager.setTorBridges(bridges, useBridges, bridgeType);
    storage.updateSettings({
      torBridges: bridges,
      useTorBridges: useBridges,
      torBridgeType: bridgeType
    });

    // Write torrc file into userData
    try {
      const torrcContent = vpnManager.generateTorrc();
      const torrcPath = path.join(app.getPath('userData'), 'torrc');
      fs.writeFileSync(torrcPath, torrcContent, 'utf-8');
    } catch (e) {
      console.warn('Failed to write torrc:', e);
    }

    return vpnManager.getStatus();
  });

  ipcMain.handle('tor-open-telegram-bot', async () => {
    try {
      await shell.openExternal('https://t.me/GetBridgesBot');
      return true;
    } catch (e) {
      return false;
    }
  });

  // VPN Subscription Management
  ipcMain.handle('vpn-import-subscription', async (_event, urlOrConfig, customTitle) => {
    if (!vpnManager) return { success: false, error: 'VPN Manager not ready' };
    try {
      const res = await vpnManager.importSubscription(urlOrConfig, customTitle);
      storage.updateSettings({
        vpnImportedServers: res.servers,
        vpnSubscriptionUrl: res.subscriptionUrl,
        vpnSubscriptionInfo: res.subscriptionInfo
      });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vpn-update-subscription', async () => {
    if (!vpnManager) return { success: false, error: 'VPN Manager not ready' };
    try {
      const res = await vpnManager.updateSubscription();
      storage.updateSettings({
        vpnImportedServers: res.servers,
        vpnSubscriptionUrl: res.subscriptionUrl,
        vpnSubscriptionInfo: res.subscriptionInfo
      });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vpn-delete-subscription', async () => {
    if (!vpnManager) return { success: false };
    vpnManager.deleteSubscription();
    storage.updateSettings({
      vpnImportedServers: [],
      vpnSubscriptionUrl: '',
      vpnSubscriptionInfo: null
    });
    return { success: true };
  });

  ipcMain.handle('vpn-ping-servers', async () => {
    if (!vpnManager) return { success: false, error: 'VPN Manager not ready' };
    try {
      const res = await vpnManager.pingAllServers();
      storage.updateSettings({
        vpnImportedServers: res.servers
      });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vpn-get-subscription-info', () => {
    return vpnManager ? vpnManager.subscriptionInfo : null;
  });

  ipcMain.handle('vpn-get-device-hwid', () => {
    return storage.getDeviceHwid();
  });

  ipcMain.handle('vpn-set-device-hwid', (_event, hwid) => {
    const updated = storage.setDeviceHwid(hwid);
    if (vpnManager) vpnManager.setDeviceHwid(updated);
    return updated;
  });

  // Xray-core tunnel (required for VLESS / VMess / Trojan / Shadowsocks servers)
  ipcMain.handle('xray-get-status', () => {
    return xrayCore.getStatus();
  });

  ipcMain.handle('xray-install', async () => {
    try {
      await xrayCore.download((percent) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('xray-download-progress', percent);
        }
      });
      return { success: true, status: xrayCore.getStatus() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Password Manager IPC Handlers
  ipcMain.handle('passwords-get-all', () => {
    return passwordManager.getAll();
  });

  ipcMain.handle('passwords-save', (_event, cred) => {
    return passwordManager.save(cred.domain, cred.username, cred.password);
  });

  ipcMain.handle('passwords-delete', (_event, id) => {
    return passwordManager.delete(id);
  });

  // Tab Mute Audio
  ipcMain.handle('tab-toggle-mute', (_event, tabId) => {
    const tab = tabs.get(tabId);
    if (tab && tab.view) {
      const isMuted = !tab.view.webContents.isAudioMuted();
      tab.view.webContents.setAudioMuted(isMuted);
      sendTabUpdate(tabId, { isMuted });
      return isMuted;
    }
    return false;
  });

  // Open Developer Tools / Inspector
  ipcMain.on('open-devtools', () => {
    const activeTab = tabs.get(activeTabId);
    if (activeTab && activeTab.view) {
      if (activeTab.view.webContents.isDevToolsOpened()) {
        activeTab.view.webContents.closeDevTools();
      } else {
        activeTab.view.webContents.openDevTools({ mode: 'detach' });
      }
    } else if (mainWindow) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });
}

// ================= APP LIFECYCLE =================
app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  const ses = session.defaultSession;

  vpnManager = new VpnManager(ses);
  vpnManager.setDeviceHwid(storage.getDeviceHwid());
  const savedSettings = storage.getSettings();
  if (savedSettings.vpnImportedServers && savedSettings.vpnImportedServers.length > 0) {
    vpnManager.setImportedServers(
      savedSettings.vpnImportedServers,
      savedSettings.vpnSubscriptionUrl,
      savedSettings.vpnSubscriptionInfo
    );
  }
  if (savedSettings.torBridges) {
    vpnManager.setTorBridges(savedSettings.torBridges, savedSettings.useTorBridges, savedSettings.torBridgeType);
  }
  if (savedSettings.vpnRoutingScope) {
    vpnManager.setRoutingScope(savedSettings.vpnRoutingScope);
  }
  if (savedSettings.smartBypassEnabled) {
    vpnManager.toggleSmartBypass(true);
  }

  setupNetworkShield();
  setupIpcHandlers();
  createMainWindow();

  if (process.argv.includes('--smoke-test')) {
    console.log('SMOKE_TEST: App initialized successfully');
    setTimeout(() => {
      console.log('SMOKE_TEST: Window & views verified');
      app.quit();
    }, 1500);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  const currentSettings = storage.getSettings();
  if (currentSettings.clearOnExit) {
    try {
      session.defaultSession.clearStorageData();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (vpnManager) {
    try {
      vpnManager.removeSystemProxy();
    } catch {}
  }
  try {
    dpiEngine?.stop?.();
  } catch {}
  // Never leave the tunnel process running after the browser exits.
  try {
    xrayCore?.stop?.();
  } catch {}
});
