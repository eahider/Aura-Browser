// Aura Browser Mobile - Core Application Logic
// Supports Multi-Tabs, Privacy Shield, Passwords, Bookmarks, Proxies, and Native Bridges

import { MobilePrivacyShield } from './privacyShield.js';
import { MobileI18n } from './i18n.js';
import { parseSubscriptionText, fetchSubscriptionUrl } from './subscriptionParser.js';

// Search engine URL formatters
const SEARCH_ENGINES = {
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}&t=aura`,
  brave: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  yandex: (q) => `https://yandex.ru/search/?text=${encodeURIComponent(q)}`
};

const DEFAULT_PRESET_SERVERS = [
  { id: 'nl-ams', name: 'Amsterdam High-Speed', flag: 'NL', type: 'SOCKS5', proxyUrl: 'socks5://185.100.86.1:1080', ping: '24ms' },
  { id: 'de-fra', name: 'Frankfurt Direct', flag: 'DE', type: 'VLESS', proxyUrl: 'vless://de.aurabrowser.app:443', ping: '31ms' },
  { id: 'us-nyc', name: 'New York Liberty', flag: 'US', type: 'SOCKS5', proxyUrl: 'socks5://198.51.100.12:1080', ping: '78ms' },
  { id: 'fi-hel', name: 'Helsinki Fast', flag: 'FI', type: 'SHADOWSOCKS', proxyUrl: 'ss://fi.aurabrowser.app:8388', ping: '19ms' }
];

class AuraMobileApp {
  constructor() {
    this.i18n = new MobileI18n();
    this.shield = new MobilePrivacyShield();
    this.tabs = [];
    this.activeTabId = null;

    // Settings
    this.searchEngine = localStorage.getItem('aura_search_engine') || 'duckduckgo';
    this.proxyMode = localStorage.getItem('aura_proxy_mode') || 'direct'; // 'direct' | 'proxy' | 'tor'
    this.activeServerId = localStorage.getItem('aura_active_server') || 'nl-ams';
    this.importedServers = JSON.parse(localStorage.getItem('aura_imported_servers') || '[]');
    this.servers = [...DEFAULT_PRESET_SERVERS, ...this.importedServers];

    // Data Vaults
    this.passwords = JSON.parse(localStorage.getItem('aura_passwords_vault') || '[]');
    this.bookmarks = JSON.parse(localStorage.getItem('aura_bookmarks') || JSON.stringify([
      { id: 'bm-1', title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🦆' },
      { id: 'bm-2', title: 'GitHub', url: 'https://github.com', icon: '🐙' },
      { id: 'bm-3', title: 'Wikipedia', url: 'https://wikipedia.org', icon: '📚' }
    ]));
    this.history = JSON.parse(localStorage.getItem('aura_history') || '[]');

    this.initDom();
    this.initCapacitor();
    this.initEvents();
    this.loadInitialTabs();
    this.renderProxyStatus();
    this.i18n.applyTranslations();
  }

  /* ------------------- DOM ELEMENTS ------------------- */
  initDom() {
    this.dom = {
      // Top Bar
      urlInput: document.getElementById('urlInput'),
      btnClearInput: document.getElementById('btnClearInput'),
      btnReload: document.getElementById('btnReload'),
      btnShieldToggle: document.getElementById('btnShieldToggle'),
      shieldBadge: document.getElementById('shieldBadge'),
      btnTabCounter: document.getElementById('btnTabCounter'),
      tabCountBox: document.getElementById('tabCountBox'),
      btnTopMenu: document.getElementById('btnTopMenu'),
      progressBar: document.getElementById('progressBar'),
      progressBarContainer: document.getElementById('progressBarContainer'),

      // Viewport
      tabsContainer: document.getElementById('tabsContainer'),

      // Bottom Bar
      navBtnBack: document.getElementById('navBtnBack'),
      navBtnForward: document.getElementById('navBtnForward'),
      navBtnHome: document.getElementById('navBtnHome'),
      navBtnTabs: document.getElementById('navBtnTabs'),
      navTabsBadge: document.getElementById('navTabsBadge'),
      navBtnMenu: document.getElementById('navBtnMenu'),

      // Tab Switcher
      tabSwitcherOverlay: document.getElementById('tabSwitcherOverlay'),
      tabsGrid: document.getElementById('tabsGrid'),
      btnCreateNewTab: document.getElementById('btnCreateNewTab'),
      btnCloseAllTabs: document.getElementById('btnCloseAllTabs'),
      btnCloseTabSwitcher: document.getElementById('btnCloseTabSwitcher'),

      // Shield Sheet
      shieldSheet: document.getElementById('shieldSheet'),
      shieldBackdrop: document.getElementById('shieldBackdrop'),
      btnCloseShield: document.getElementById('btnCloseShield'),
      shieldStatsPageCount: document.getElementById('shieldStatsPageCount'),
      shieldStatsTotalCount: document.getElementById('shieldStatsTotalCount'),
      toggleBlockTrackers: document.getElementById('toggleBlockTrackers'),
      toggleStripUtm: document.getElementById('toggleStripUtm'),
      blockedRequestsList: document.getElementById('blockedRequestsList'),
      btnWipeData: document.getElementById('btnWipeData'),

      // Passwords Sheet
      passwordsSheet: document.getElementById('passwordsSheet'),
      passwordsBackdrop: document.getElementById('passwordsBackdrop'),
      btnClosePasswords: document.getElementById('btnClosePasswords'),
      vaultSearchInput: document.getElementById('vaultSearchInput'),
      btnToggleAddPassword: document.getElementById('btnToggleAddPassword'),
      addVaultForm: document.getElementById('addVaultForm'),
      btnCancelAddVault: document.getElementById('btnCancelAddVault'),
      vaultNewDomain: document.getElementById('vaultNewDomain'),
      vaultNewUsername: document.getElementById('vaultNewUsername'),
      vaultNewPassword: document.getElementById('vaultNewPassword'),
      vaultItemsList: document.getElementById('vaultItemsList'),

      // VPN Sheet
      vpnSheet: document.getElementById('vpnSheet'),
      vpnBackdrop: document.getElementById('vpnBackdrop'),
      btnCloseVpn: document.getElementById('btnCloseVpn'),
      modeBtnDirect: document.getElementById('modeBtnDirect'),
      modeBtnProxy: document.getElementById('modeBtnProxy'),
      modeBtnTor: document.getElementById('modeBtnTor'),
      proxyStatusDot: document.getElementById('proxyStatusDot'),
      proxyStatusTitle: document.getElementById('proxyStatusTitle'),
      proxyStatusServer: document.getElementById('proxyStatusServer'),
      proxyServerList: document.getElementById('proxyServerList'),
      subscriptionInput: document.getElementById('subscriptionInput'),
      btnLoadSubscription: document.getElementById('btnLoadSubscription'),

      // Bookmarks & History Sheet
      bookmarksSheet: document.getElementById('bookmarksSheet'),
      bookmarksBackdrop: document.getElementById('bookmarksBackdrop'),
      btnCloseBookmarks: document.getElementById('btnCloseBookmarks'),
      tabBtnBookmarks: document.getElementById('tabBtnBookmarks'),
      tabBtnHistory: document.getElementById('tabBtnHistory'),
      sectionBookmarks: document.getElementById('sectionBookmarks'),
      sectionHistory: document.getElementById('sectionHistory'),
      bookmarksList: document.getElementById('bookmarksList'),
      historyList: document.getElementById('historyList'),
      btnClearHistory: document.getElementById('btnClearHistory'),

      // Main Menu Sheet
      mainMenuSheet: document.getElementById('mainMenuSheet'),
      mainMenuBackdrop: document.getElementById('mainMenuBackdrop'),
      btnCloseMainMenu: document.getElementById('btnCloseMainMenu'),
      menuTileShield: document.getElementById('menuTileShield'),
      menuTileVpn: document.getElementById('menuTileVpn'),
      menuTilePasswords: document.getElementById('menuTilePasswords'),
      menuTileBookmarks: document.getElementById('menuTileBookmarks'),
      selectLanguage: document.getElementById('selectLanguage'),
      selectSearchEngine: document.getElementById('selectSearchEngine'),
      btnAddCurrentBookmark: document.getElementById('btnAddCurrentBookmark'),

      // Toast
      mobileToast: document.getElementById('mobileToast')
    };

    // Pre-populate selects
    this.dom.selectLanguage.value = this.i18n.lang;
    this.dom.selectSearchEngine.value = this.searchEngine;
  }

  /* ------------------- CAPACITOR INTEGRATION ------------------- */
  async initCapacitor() {
    if (window.Capacitor) {
      const { Plugins } = window.Capacitor;
      if (Plugins.StatusBar) {
        try {
          await Plugins.StatusBar.setBackgroundColor({ color: '#0e1015' });
        } catch {}
      }
      if (Plugins.SplashScreen) {
        try {
          await Plugins.SplashScreen.hide();
        } catch {}
      }
      if (Plugins.App) {
        Plugins.App.addListener('backButton', () => {
          this.handleHardwareBack();
        });
      }
    }
  }

  handleHardwareBack() {
    // If any sheet is open, close it
    if (this.isAnySheetOpen()) {
      this.closeAllSheets();
      return;
    }
    // If tab switcher is open, close it
    if (this.dom.tabSwitcherOverlay.classList.contains('open')) {
      this.closeTabSwitcher();
      return;
    }
    // Otherwise go back in active tab
    const tab = this.getActiveTab();
    if (tab && tab.historyIndex > 0) {
      this.navigateTabBack(tab);
    }
  }

  /* ------------------- INITIAL TABS ------------------- */
  loadInitialTabs() {
    const savedTabs = JSON.parse(sessionStorage.getItem('aura_mobile_active_tabs') || '[]');
    if (savedTabs.length > 0) {
      savedTabs.forEach(t => this.createTab(t.url, false, t.isNewTab));
      this.switchTab(savedTabs[0].id);
    } else {
      this.createTab('', true, true);
    }
  }

  /* ------------------- TAB OPERATIONS ------------------- */
  createTab(url = '', activate = true, isNewTab = true) {
    const tabId = 'tab-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newTab = {
      id: tabId,
      title: isNewTab ? this.i18n.t('new_tab') : (url || 'Web Page'),
      url: isNewTab ? '' : url,
      isNewTab: !!isNewTab,
      history: isNewTab ? [] : [url],
      historyIndex: isNewTab ? -1 : 0,
      blockedCount: 0,
      recentBlocked: []
    };

    this.tabs.push(newTab);

    // Create DOM wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'tab-frame-wrapper';
    wrapper.id = `frame-${tabId}`;
    this.dom.tabsContainer.appendChild(wrapper);

    if (newTab.isNewTab) {
      this.renderNewTabView(wrapper, newTab);
    } else {
      this.renderIframeView(wrapper, newTab, url);
    }

    this.updateTabCounters();
    if (activate) {
      this.switchTab(tabId);
    }
    return newTab;
  }

  switchTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    this.activeTabId = tabId;

    // Toggle active classes on frame wrappers
    document.querySelectorAll('.tab-frame-wrapper').forEach(el => {
      el.classList.toggle('active', el.id === `frame-${tabId}`);
    });

    // Update Omnibox
    this.dom.urlInput.value = tab.isNewTab ? '' : tab.url;
    this.dom.btnClearInput.style.display = tab.url ? 'flex' : 'none';

    // Update Shield badge
    this.dom.shieldBadge.textContent = tab.blockedCount.toString();

    // Update nav buttons
    this.updateNavButtons();
    this.updateTabCounters();
    this.closeTabSwitcher();
  }

  closeTab(tabId) {
    const idx = this.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    // Remove DOM frame
    const frame = document.getElementById(`frame-${tabId}`);
    if (frame) frame.remove();

    this.tabs.splice(idx, 1);

    if (this.tabs.length === 0) {
      this.createTab('', true, true);
    } else if (this.activeTabId === tabId) {
      const nextIdx = Math.max(0, idx - 1);
      this.switchTab(this.tabs[nextIdx].id);
    } else {
      this.updateTabCounters();
    }

    this.renderTabsGrid();
  }

  closeAllTabs() {
    this.dom.tabsContainer.innerHTML = '';
    this.tabs = [];
    this.createTab('', true, true);
    this.renderTabsGrid();
    this.showToast(this.i18n.t('tab_memory_freed'));
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  updateTabCounters() {
    const count = this.tabs.length;
    this.dom.tabCountBox.textContent = count.toString();
    this.dom.navTabsBadge.textContent = count.toString();
  }

  updateNavButtons() {
    const tab = this.getActiveTab();
    if (!tab || tab.isNewTab) {
      this.dom.navBtnBack.disabled = true;
      this.dom.navBtnForward.disabled = true;
    } else {
      this.dom.navBtnBack.disabled = tab.historyIndex <= 0;
      this.dom.navBtnForward.disabled = tab.historyIndex >= tab.history.length - 1;
    }
  }

  /* ------------------- RENDERING TAB VIEWS ------------------- */
  renderNewTabView(container, tab) {
    container.innerHTML = `
      <div class="new-tab-view">
        <div class="aura-brand-hero">
          <div class="brand-logo-ring">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 3a9 9 0 0 1 9 9"></path>
              <circle cx="12" cy="3" r="1.5" fill="#818cf8"></circle>
            </svg>
          </div>
          <h1 class="brand-hero-title">${this.i18n.t('aura_title')}</h1>
          <p class="brand-hero-subtitle">${this.i18n.t('aura_tagline')}</p>
        </div>

        <div class="privacy-status-banner">
          <div class="privacy-banner-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div class="privacy-banner-text">
            <h4>${this.i18n.t('shield_status_active')}</h4>
            <p>${this.i18n.t('trackers_blocked_total')}: <strong>${this.shield.totalBlockedCount}</strong></p>
          </div>
        </div>

        <div class="speed-dial-section">
          <div class="section-label">${this.i18n.t('quick_shortcuts')}</div>
          <div class="speed-dial-grid">
            <div class="speed-dial-card" data-url="https://duckduckgo.com">
              <div class="speed-dial-icon" style="background: rgba(222, 88, 51, 0.15); color: #de5833;">🦆</div>
              <span class="speed-dial-title">${this.i18n.t('speed_dial_ddg')}</span>
            </div>
            <div class="speed-dial-card" data-url="https://github.com">
              <div class="speed-dial-icon" style="background: rgba(129, 140, 248, 0.15); color: #818cf8;">🐙</div>
              <span class="speed-dial-title">${this.i18n.t('speed_dial_github')}</span>
            </div>
            <div class="speed-dial-card" data-url="https://wikipedia.org">
              <div class="speed-dial-icon" style="background: rgba(255, 255, 255, 0.1); color: #f1f5f9;">📚</div>
              <span class="speed-dial-title">${this.i18n.t('speed_dial_wiki')}</span>
            </div>
            <div class="speed-dial-card" data-url="https://web.telegram.org">
              <div class="speed-dial-icon" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">✈️</div>
              <span class="speed-dial-title">${this.i18n.t('speed_dial_tg')}</span>
            </div>
            <div class="speed-dial-card" data-url="https://reddit.com">
              <div class="speed-dial-icon" style="background: rgba(255, 69, 0, 0.15); color: #ff4500;">👽</div>
              <span class="speed-dial-title">${this.i18n.t('speed_dial_reddit')}</span>
            </div>
            <div class="speed-dial-card" data-url="https://proton.me">
              <div class="speed-dial-icon" style="background: rgba(110, 86, 207, 0.15); color: #a78bfa;">🛡️</div>
              <span class="speed-dial-title">${this.i18n.t('speed_dial_proton')}</span>
            </div>
          </div>
        </div>

        <div class="quick-tools-row">
          <div class="quick-tool-card" id="btnQuickOpenPasswords">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>${this.i18n.t('passwords_title')}</span>
          </div>
          <div class="quick-tool-card" id="btnQuickOpenBookmarks">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>${this.i18n.t('bookmarks_title')}</span>
          </div>
        </div>
      </div>
    `;

    // Speed dial click listeners
    container.querySelectorAll('.speed-dial-card').forEach(card => {
      card.addEventListener('click', () => {
        const targetUrl = card.getAttribute('data-url');
        this.navigateActiveTab(targetUrl);
      });
    });

    const passBtn = container.querySelector('#btnQuickOpenPasswords');
    if (passBtn) passBtn.addEventListener('click', () => this.openPasswordsSheet());

    const bmBtn = container.querySelector('#btnQuickOpenBookmarks');
    if (bmBtn) bmBtn.addEventListener('click', () => this.openBookmarksSheet());
  }

  renderIframeView(container, tab, targetUrl) {
    const cleanedUrl = this.shield.cleanUrl(targetUrl);
    container.innerHTML = `
      <iframe 
        class="tab-iframe" 
        src="${cleanedUrl}" 
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
    `;

    this.startProgressAnimation();

    const iframe = container.querySelector('iframe');
    iframe.onload = () => {
      this.finishProgressAnimation();
      try {
        const frameTitle = iframe.contentDocument ? iframe.contentDocument.title : '';
        if (frameTitle) {
          tab.title = frameTitle;
        }
      } catch {}
      this.recordHistory(cleanedUrl, tab.title);
    };
  }

  /* ------------------- NAVIGATION ------------------- */
  navigateActiveTab(rawInput) {
    const tab = this.getActiveTab();
    if (!tab) return;

    let targetUrl = rawInput.trim();
    if (!targetUrl) return;

    // Check if input is URL or search query
    const hasScheme = /^[a-zA-Z]+:\/\//.test(targetUrl);
    const hasDot = targetUrl.includes('.') && !targetUrl.includes(' ');

    if (!hasScheme && hasDot) {
      targetUrl = 'https://' + targetUrl;
    } else if (!hasScheme) {
      const searchFn = SEARCH_ENGINES[this.searchEngine] || SEARCH_ENGINES.duckduckgo;
      targetUrl = searchFn(targetUrl);
    }

    // Clean tracking tags
    targetUrl = this.shield.cleanUrl(targetUrl);

    tab.isNewTab = false;
    tab.url = targetUrl;
    tab.title = targetUrl;

    if (tab.historyIndex < tab.history.length - 1) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
    }
    tab.history.push(targetUrl);
    tab.historyIndex = tab.history.length - 1;

    // Re-render frame
    const wrapper = document.getElementById(`frame-${tab.id}`);
    if (wrapper) {
      this.renderIframeView(wrapper, tab, targetUrl);
    }

    this.dom.urlInput.value = targetUrl;
    this.dom.btnClearInput.style.display = 'flex';
    this.updateNavButtons();
  }

  navigateTabBack(tab) {
    if (!tab || tab.historyIndex <= 0) return;
    tab.historyIndex--;
    const prevUrl = tab.history[tab.historyIndex];
    tab.url = prevUrl;
    this.dom.urlInput.value = prevUrl;
    const wrapper = document.getElementById(`frame-${tab.id}`);
    if (wrapper) {
      this.renderIframeView(wrapper, tab, prevUrl);
    }
    this.updateNavButtons();
  }

  navigateTabForward(tab) {
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    tab.historyIndex++;
    const nextUrl = tab.history[tab.historyIndex];
    tab.url = nextUrl;
    this.dom.urlInput.value = nextUrl;
    const wrapper = document.getElementById(`frame-${tab.id}`);
    if (wrapper) {
      this.renderIframeView(wrapper, tab, nextUrl);
    }
    this.updateNavButtons();
  }

  reloadActiveTab() {
    const tab = this.getActiveTab();
    if (!tab || tab.isNewTab) return;
    const wrapper = document.getElementById(`frame-${tab.id}`);
    if (wrapper) {
      this.renderIframeView(wrapper, tab, tab.url);
    }
  }

  goHome() {
    const tab = this.getActiveTab();
    if (!tab) return;
    tab.isNewTab = true;
    tab.url = '';
    tab.title = this.i18n.t('new_tab');
    this.dom.urlInput.value = '';
    this.dom.btnClearInput.style.display = 'none';

    const wrapper = document.getElementById(`frame-${tab.id}`);
    if (wrapper) {
      this.renderNewTabView(wrapper, tab);
    }
    this.updateNavButtons();
  }

  /* ------------------- PROGRESS BAR ------------------- */
  startProgressAnimation() {
    this.dom.progressBar.style.opacity = '1';
    this.dom.progressBar.style.width = '35%';
    setTimeout(() => {
      if (this.dom.progressBar.style.width === '35%') {
        this.dom.progressBar.style.width = '75%';
      }
    }, 400);
  }

  finishProgressAnimation() {
    this.dom.progressBar.style.width = '100%';
    setTimeout(() => {
      this.dom.progressBar.style.opacity = '0';
      setTimeout(() => {
        this.dom.progressBar.style.width = '0%';
      }, 300);
    }, 300);
  }

  /* ------------------- TAB SWITCHER OVERLAY ------------------- */
  openTabSwitcher() {
    this.renderTabsGrid();
    this.dom.tabSwitcherOverlay.classList.add('open');
  }

  closeTabSwitcher() {
    this.dom.tabSwitcherOverlay.classList.remove('open');
  }

  renderTabsGrid() {
    this.dom.tabsGrid.innerHTML = '';
    this.tabs.forEach(tab => {
      const card = document.createElement('div');
      card.className = `tab-card ${tab.id === this.activeTabId ? 'active' : ''}`;
      card.innerHTML = `
        <div class="tab-card-header">
          <span class="tab-card-title">${tab.title || this.i18n.t('new_tab')}</span>
          <button class="btn-close-tab-card" data-tab-id="${tab.id}">✕</button>
        </div>
        <div class="tab-card-preview">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span class="tab-card-url">${tab.url ? new URL(tab.url).hostname : 'aura://newtab'}</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-close-tab-card')) {
          this.switchTab(tab.id);
        }
      });

      const closeBtn = card.querySelector('.btn-close-tab-card');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });

      this.dom.tabsGrid.appendChild(card);
    });
  }

  /* ------------------- BOTTOM SHEETS ------------------- */
  openSheet(sheet, backdrop) {
    this.closeAllSheets();
    backdrop.classList.add('active');
    sheet.classList.add('open');
  }

  closeSheet(sheet, backdrop) {
    sheet.classList.remove('open');
    backdrop.classList.remove('active');
  }

  closeAllSheets() {
    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
    document.querySelectorAll('.bottom-sheet-backdrop').forEach(b => b.classList.remove('active'));
  }

  isAnySheetOpen() {
    return !!document.querySelector('.bottom-sheet.open');
  }

  openShieldSheet() {
    const tab = this.getActiveTab();
    const pageCount = tab ? tab.blockedCount : 0;
    this.dom.shieldStatsPageCount.textContent = pageCount.toString();
    this.dom.shieldStatsTotalCount.textContent = this.shield.totalBlockedCount.toString();
    this.renderBlockedRequests();
    this.openSheet(this.dom.shieldSheet, this.dom.shieldBackdrop);
  }

  renderBlockedRequests() {
    const stats = this.shield.getStats();
    if (stats.recentBlocked.length === 0) {
      this.dom.blockedRequestsList.innerHTML = `<div class="empty-list-notice">${this.i18n.t('shield_no_trackers')}</div>`;
      return;
    }
    this.dom.blockedRequestsList.innerHTML = stats.recentBlocked.map(item => `
      <div class="blocked-req-item">
        <span>${item.domain}</span>
        <span>${item.time}</span>
      </div>
    `).join('');
  }

  openPasswordsSheet() {
    this.renderPasswordsList();
    this.openSheet(this.dom.passwordsSheet, this.dom.passwordsBackdrop);
  }

  renderPasswordsList(filter = '') {
    const list = this.passwords.filter(p => 
      !filter || p.domain.toLowerCase().includes(filter.toLowerCase()) || p.username.toLowerCase().includes(filter.toLowerCase())
    );

    if (list.length === 0) {
      this.dom.vaultItemsList.innerHTML = `<div class="empty-list-notice">${this.i18n.t('no_passwords')}</div>`;
      return;
    }

    this.dom.vaultItemsList.innerHTML = list.map((item, idx) => `
      <div class="vault-item-card">
        <div class="vault-item-info">
          <span class="vault-domain">${item.domain}</span>
          <span class="vault-username">${item.username}</span>
        </div>
        <div class="vault-actions">
          <button class="vault-btn-icon btn-copy-pwd" data-idx="${idx}" title="${this.i18n.t('copy')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="vault-btn-icon btn-del-pwd" data-idx="${idx}" title="${this.i18n.t('delete')}">✕</button>
        </div>
      </div>
    `).join('');

    this.dom.vaultItemsList.querySelectorAll('.btn-copy-pwd').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        navigator.clipboard.writeText(this.passwords[idx].password);
        this.showToast(this.i18n.t('copied'));
      });
    });

    this.dom.vaultItemsList.querySelectorAll('.btn-del-pwd').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        this.passwords.splice(idx, 1);
        localStorage.setItem('aura_passwords_vault', JSON.stringify(this.passwords));
        this.renderPasswordsList(this.dom.vaultSearchInput.value);
        this.showToast(this.i18n.t('password_deleted'));
      });
    });
  }

  openVpnSheet() {
    this.renderServerList();
    this.renderProxyStatus();
    this.openSheet(this.dom.vpnSheet, this.dom.vpnBackdrop);
  }

  renderServerList() {
    this.dom.proxyServerList.innerHTML = this.servers.map(s => `
      <div class="server-item ${s.id === this.activeServerId ? 'active' : ''}" data-server-id="${s.id}">
        <div class="server-left">
          <span class="server-flag">${s.flag}</span>
          <span class="server-name">${s.name}</span>
        </div>
        <span class="server-ping">${s.ping}</span>
      </div>
    `).join('');

    this.dom.proxyServerList.querySelectorAll('.server-item').forEach(item => {
      item.addEventListener('click', () => {
        this.activeServerId = item.getAttribute('data-server-id');
        localStorage.setItem('aura_active_server', this.activeServerId);
        if (this.proxyMode === 'direct') {
          this.setProxyMode('proxy');
        } else {
          this.renderProxyStatus();
          this.renderServerList();
        }
      });
    });
  }

  setProxyMode(mode) {
    this.proxyMode = mode;
    localStorage.setItem('aura_proxy_mode', mode);

    this.dom.modeBtnDirect.classList.toggle('active', mode === 'direct');
    this.dom.modeBtnProxy.classList.toggle('active', mode === 'proxy');
    this.dom.modeBtnTor.classList.toggle('active', mode === 'tor');

    this.renderProxyStatus();
  }

  renderProxyStatus() {
    const isDirect = this.proxyMode === 'direct';
    const activeServer = this.servers.find(s => s.id === this.activeServerId) || this.servers[0];

    this.dom.proxyStatusDot.classList.toggle('active', !isDirect);
    if (this.proxyMode === 'tor') {
      this.dom.proxyStatusTitle.textContent = "Tor Onion (127.0.0.1:9050)";
      this.dom.proxyStatusServer.textContent = "3-Hop Encrypted Routing";
    } else if (this.proxyMode === 'proxy') {
      this.dom.proxyStatusTitle.textContent = this.i18n.t('proxy_active_status');
      this.dom.proxyStatusServer.textContent = `${activeServer.name} (${activeServer.flag})`;
    } else {
      this.dom.proxyStatusTitle.textContent = this.i18n.t('proxy_direct_status');
      this.dom.proxyStatusServer.textContent = "Direct ISP Gateway";
    }
  }

  openBookmarksSheet() {
    this.renderBookmarks();
    this.renderHistory();
    this.openSheet(this.dom.bookmarksSheet, this.dom.bookmarksBackdrop);
  }

  renderBookmarks() {
    if (this.bookmarks.length === 0) {
      this.dom.bookmarksList.innerHTML = `<div class="empty-list-notice">${this.i18n.t('no_bookmarks')}</div>`;
      return;
    }
    this.dom.bookmarksList.innerHTML = this.bookmarks.map((b, idx) => `
      <div class="vault-item-card" style="cursor: pointer;" data-url="${b.url}">
        <div class="vault-item-info">
          <span class="vault-domain">${b.title}</span>
          <span class="vault-username">${b.url}</span>
        </div>
        <button class="vault-btn-icon btn-del-bm" data-idx="${idx}">✕</button>
      </div>
    `).join('');

    this.dom.bookmarksList.querySelectorAll('.vault-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-del-bm')) {
          this.navigateActiveTab(card.getAttribute('data-url'));
          this.closeAllSheets();
        }
      });
    });

    this.dom.bookmarksList.querySelectorAll('.btn-del-bm').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        this.bookmarks.splice(idx, 1);
        localStorage.setItem('aura_bookmarks', JSON.stringify(this.bookmarks));
        this.renderBookmarks();
      });
    });
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.dom.historyList.innerHTML = `<div class="empty-list-notice">${this.i18n.t('no_history')}</div>`;
      return;
    }
    this.dom.historyList.innerHTML = this.history.map(h => `
      <div class="vault-item-card" style="cursor: pointer;" data-url="${h.url}">
        <div class="vault-item-info">
          <span class="vault-domain">${h.title}</span>
          <span class="vault-username">${h.time}</span>
        </div>
      </div>
    `).join('');

    this.dom.historyList.querySelectorAll('.vault-item-card').forEach(card => {
      card.addEventListener('click', () => {
        this.navigateActiveTab(card.getAttribute('data-url'));
        this.closeAllSheets();
      });
    });
  }

  recordHistory(url, title) {
    if (!url || url.startsWith('about:')) return;
    this.history.unshift({
      url,
      title: title || url,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (this.history.length > 200) this.history.pop();
    localStorage.setItem('aura_history', JSON.stringify(this.history));
  }

  addCurrentBookmark() {
    const tab = this.getActiveTab();
    if (!tab || tab.isNewTab || !tab.url) return;

    const exists = this.bookmarks.find(b => b.url === tab.url);
    if (!exists) {
      this.bookmarks.unshift({
        id: 'bm-' + Date.now(),
        title: tab.title || tab.url,
        url: tab.url,
        icon: '★'
      });
      localStorage.setItem('aura_bookmarks', JSON.stringify(this.bookmarks));
      this.showToast(this.i18n.t('bookmark_added'));
    }
  }

  showToast(msg) {
    this.dom.mobileToast.textContent = msg;
    this.dom.mobileToast.classList.add('visible');
    setTimeout(() => {
      this.dom.mobileToast.classList.remove('visible');
    }, 2200);
  }

  /* ------------------- EVENT LISTENERS ------------------- */
  initEvents() {
    // Omnibox
    this.dom.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigateActiveTab(this.dom.urlInput.value);
        this.dom.urlInput.blur();
      }
    });

    this.dom.urlInput.addEventListener('input', () => {
      this.dom.btnClearInput.style.display = this.dom.urlInput.value ? 'flex' : 'none';
    });

    this.dom.btnClearInput.addEventListener('click', () => {
      this.dom.urlInput.value = '';
      this.dom.btnClearInput.style.display = 'none';
      this.dom.urlInput.focus();
    });

    // Top buttons
    this.dom.btnReload.addEventListener('click', () => this.reloadActiveTab());
    this.dom.btnShieldToggle.addEventListener('click', () => this.openShieldSheet());
    this.dom.btnTabCounter.addEventListener('click', () => this.openTabSwitcher());
    this.dom.btnTopMenu.addEventListener('click', () => this.openSheet(this.dom.mainMenuSheet, this.dom.mainMenuBackdrop));

    // Bottom Navigation
    this.dom.navBtnBack.addEventListener('click', () => {
      const tab = this.getActiveTab();
      if (tab) this.navigateTabBack(tab);
    });

    this.dom.navBtnForward.addEventListener('click', () => {
      const tab = this.getActiveTab();
      if (tab) this.navigateTabForward(tab);
    });

    this.dom.navBtnHome.addEventListener('click', () => this.goHome());
    this.dom.navBtnTabs.addEventListener('click', () => this.openTabSwitcher());
    this.dom.navBtnMenu.addEventListener('click', () => this.openSheet(this.dom.mainMenuSheet, this.dom.mainMenuBackdrop));

    // Tab Switcher Overlay
    this.dom.btnCreateNewTab.addEventListener('click', () => {
      this.createTab('', true, true);
      this.closeTabSwitcher();
    });
    this.dom.btnCloseAllTabs.addEventListener('click', () => this.closeAllTabs());
    this.dom.btnCloseTabSwitcher.addEventListener('click', () => this.closeTabSwitcher());

    // Backdrops
    [
      this.dom.shieldBackdrop,
      this.dom.passwordsBackdrop,
      this.dom.vpnBackdrop,
      this.dom.bookmarksBackdrop,
      this.dom.mainMenuBackdrop
    ].forEach(b => b.addEventListener('click', () => this.closeAllSheets()));

    // Sheet close buttons
    this.dom.btnCloseShield.addEventListener('click', () => this.closeAllSheets());
    this.dom.btnClosePasswords.addEventListener('click', () => this.closeAllSheets());
    this.dom.btnCloseVpn.addEventListener('click', () => this.closeAllSheets());
    this.dom.btnCloseBookmarks.addEventListener('click', () => this.closeAllSheets());
    this.dom.btnCloseMainMenu.addEventListener('click', () => this.closeAllSheets());

    // Shield sheet toggles & wipe
    this.dom.toggleBlockTrackers.addEventListener('change', (e) => {
      this.shield.enabled = e.target.checked;
    });

    this.dom.toggleStripUtm.addEventListener('change', (e) => {
      this.shield.stripParamsEnabled = e.target.checked;
    });

    this.dom.btnWipeData.addEventListener('click', () => {
      this.shield.resetAll();
      this.history = [];
      localStorage.removeItem('aura_history');
      this.renderBlockedRequests();
      this.dom.shieldStatsPageCount.textContent = '0';
      this.dom.shieldStatsTotalCount.textContent = '0';
      this.dom.shieldBadge.textContent = '0';
      this.showToast(this.i18n.t('wipe_success'));
    });

    // Passwords sheet
    this.dom.btnToggleAddPassword.addEventListener('click', () => {
      const isHidden = this.dom.addVaultForm.style.display === 'none';
      this.dom.addVaultForm.style.display = isHidden ? 'flex' : 'none';
    });

    this.dom.btnCancelAddVault.addEventListener('click', () => {
      this.dom.addVaultForm.style.display = 'none';
    });

    this.dom.addVaultForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const domain = this.dom.vaultNewDomain.value.trim();
      const username = this.dom.vaultNewUsername.value.trim();
      const password = this.dom.vaultNewPassword.value.trim();
      if (!domain || !username || !password) return;

      this.passwords.unshift({ domain, username, password });
      localStorage.setItem('aura_passwords_vault', JSON.stringify(this.passwords));
      this.dom.addVaultForm.reset();
      this.dom.addVaultForm.style.display = 'none';
      this.renderPasswordsList();
      this.showToast(this.i18n.t('password_saved'));
    });

    this.dom.vaultSearchInput.addEventListener('input', (e) => {
      this.renderPasswordsList(e.target.value);
    });

    // VPN mode buttons
    this.dom.modeBtnDirect.addEventListener('click', () => this.setProxyMode('direct'));
    this.dom.modeBtnProxy.addEventListener('click', () => this.setProxyMode('proxy'));
    this.dom.modeBtnTor.addEventListener('click', () => this.setProxyMode('tor'));

    // Subscription Importer
    this.dom.btnLoadSubscription.addEventListener('click', async () => {
      const raw = this.dom.subscriptionInput.value.trim();
      if (!raw) return;

      try {
        let servers = [];
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
          servers = await fetchSubscriptionUrl(raw);
        } else {
          servers = parseSubscriptionText(raw);
        }

        if (servers && servers.length > 0) {
          this.importedServers = servers;
          this.servers = [...DEFAULT_PRESET_SERVERS, ...this.importedServers];
          localStorage.setItem('aura_imported_servers', JSON.stringify(this.importedServers));
          this.renderServerList();
          this.showToast(this.i18n.t('sub_success'));
          this.dom.subscriptionInput.value = '';
        } else {
          this.showToast(this.i18n.t('sub_error'));
        }
      } catch (err) {
        this.showToast(this.i18n.t('sub_error') + ': ' + err.message);
      }
    });

    // Bookmarks vs History Segment
    this.dom.tabBtnBookmarks.addEventListener('click', () => {
      this.dom.tabBtnBookmarks.classList.add('active');
      this.dom.tabBtnHistory.classList.remove('active');
      this.dom.sectionBookmarks.style.display = 'block';
      this.dom.sectionHistory.style.display = 'none';
    });

    this.dom.tabBtnHistory.addEventListener('click', () => {
      this.dom.tabBtnHistory.classList.add('active');
      this.dom.tabBtnBookmarks.classList.remove('active');
      this.dom.sectionBookmarks.style.display = 'none';
      this.dom.sectionHistory.style.display = 'block';
    });

    this.dom.btnClearHistory.addEventListener('click', () => {
      this.history = [];
      localStorage.removeItem('aura_history');
      this.renderHistory();
    });

    // Menu Tiles
    this.dom.menuTileShield.addEventListener('click', () => this.openShieldSheet());
    this.dom.menuTileVpn.addEventListener('click', () => this.openVpnSheet());
    this.dom.menuTilePasswords.addEventListener('click', () => this.openPasswordsSheet());
    this.dom.menuTileBookmarks.addEventListener('click', () => this.openBookmarksSheet());
    this.dom.btnAddCurrentBookmark.addEventListener('click', () => this.addCurrentBookmark());

    // Settings selects
    this.dom.selectLanguage.addEventListener('change', (e) => {
      this.i18n.setLanguage(e.target.value);
    });

    this.dom.selectSearchEngine.addEventListener('change', (e) => {
      this.searchEngine = e.target.value;
      localStorage.setItem('aura_search_engine', this.searchEngine);
    });
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.AuraApp = new AuraMobileApp();
});
