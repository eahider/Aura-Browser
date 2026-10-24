// Aura Browser - Frontend Renderer Logic
// Native developer & engineering minimalist interface
document.addEventListener('DOMContentLoaded', async () => {
  const api = window.electronAPI;

  // SVG Icons
  const SVG_GLOBE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
  const SVG_SPEED = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
  const SVG_SHIELD = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  const SVG_LOCK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
  const SVG_TOR = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 9 9"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const SVG_AUDIO = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
  const SVG_AUDIO_MUTED = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
  const SVG_BOOKMARK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
  const SVG_STAR_FILLED = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  const SVG_STAR_OUTLINE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  const SVG_EYE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const SVG_USER = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
  const SVG_CLIPBOARD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const SVG_TRASH = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const SVG_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const SVG_SEARCH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

  // State
  let tabs = [];
  let activeTabId = null;
  let settings = { searchEngine: 'duckduckgo' };
  let currentShieldStats = { tabBlockedCount: 0, totalBlockedCount: 0, blockedList: [] };

  // DOM Elements
  const tabStrip = document.getElementById('tabStrip');
  const btnNewTab = document.getElementById('btnNewTab');
  const btnBack = document.getElementById('btnBack');
  const btnForward = document.getElementById('btnForward');
  const btnReload = document.getElementById('btnReload');
  const btnHome = document.getElementById('btnHome');
  const omniboxInput = document.getElementById('omniboxInput');
  const searchEngineIcon = document.getElementById('searchEngineIcon');
  const shieldPill = document.getElementById('shieldPill');
  const shieldBlockedCount = document.getElementById('shieldBlockedCount');
  const btnBookmarkStar = document.getElementById('btnBookmarkStar');
  const ramSaverChip = document.getElementById('ramSaverChip');
  const ramSavedText = document.getElementById('ramSavedText');

  // Modals
  const shieldModal = document.getElementById('shield-modal');
  const memoryModal = document.getElementById('memory-modal');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const historyModal = document.getElementById('history-modal');
  const settingsModal = document.getElementById('settings-modal');
  const vpnModal = document.getElementById('vpn-modal');
  const startupTorModal = document.getElementById('startup-tor-modal');
  const passwordsModal = document.getElementById('passwords-modal');
  const bypassModal = document.getElementById('bypass-modal');
  const passwordSaveBanner = document.getElementById('password-save-banner');
  const findBar = document.getElementById('find-bar');

  // Password Elements
  const btnPasswords = document.getElementById('btnPasswords');
  const passwordsList = document.getElementById('passwordsList');
  const passwordsSearchInput = document.getElementById('passwordsSearchInput');
  const pwdPromptDomain = document.getElementById('pwdPromptDomain');
  const pwdPromptUser = document.getElementById('pwdPromptUser');
  const btnSavePasswordConfirm = document.getElementById('btnSavePasswordConfirm');
  const btnSavePasswordDismiss = document.getElementById('btnSavePasswordDismiss');
  let pendingSaveLogin = null;

  // Smart Circumvention Elements
  const btnSmartBypass = document.getElementById('btnSmartBypass');
  const bypassIndicatorDot = document.getElementById('bypassIndicatorDot');
  const bypassPillText = document.getElementById('bypassPillText');
  const closeBypassModal = document.getElementById('closeBypassModal');
  const bypassMasterToggle = document.getElementById('bypassMasterToggle');
  const bypassStatusTitle = document.getElementById('bypassStatusTitle');

  // VPN Elements & Scope
  const btnVpnToggle = document.getElementById('btnVpnToggle');
  const vpnPillIcon = document.getElementById('vpnPillIcon');
  const vpnPillText = document.getElementById('vpnPillText');
  const vpnCurrentStatus = document.getElementById('vpnCurrentStatus');
  const vpnIndicatorDot = document.getElementById('vpnIndicatorDot');
  const vpnCurrentIp = document.getElementById('vpnCurrentIp');
  const tabBtnVpn = document.getElementById('tabBtnVpn');
  const tabBtnTor = document.getElementById('tabBtnTor');
  const panelVpn = document.getElementById('panelVpn');
  const panelTor = document.getElementById('panelTor');
  const vpnServersList = document.getElementById('vpnServersList');
  const customProxySection = document.getElementById('customProxySection');
  const customProxyInput = document.getElementById('customProxyInput');
  const btnConnectVpn = document.getElementById('btnConnectVpn');
  const btnConnectTor = document.getElementById('btnConnectTor');
  const btnDisconnectProxy = document.getElementById('btnDisconnectProxy');
  const btnScopeBrowser = document.getElementById('btnScopeBrowser');
  const btnScopeSystem = document.getElementById('btnScopeSystem');
  const vpnScopeHint = document.getElementById('vpnScopeHint');
  let currentVpnScope = 'browser';
  let selectedServerId = 'nl-ams';

  // Load Initial Settings
  try {
    settings = await api.getSettings();
    if (typeof setAppLanguage === 'function') {
      setAppLanguage(settings.language || 'ru');
      applyTranslationsToDOM();
    }
    updateSearchEngineUI(settings.searchEngine);
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // ================= WINDOW CONTROLS =================
  document.getElementById('btnWinMinimize').addEventListener('click', () => api.minimize());
  document.getElementById('btnWinMaximize').addEventListener('click', () => api.maximize());
  document.getElementById('btnWinClose').addEventListener('click', () => api.close());

  // ================= TAB RENDERING =================
  function renderTabs() {
    tabStrip.innerHTML = '';
    tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isHibernated ? 'hibernated' : ''} ${tab.isAudible ? 'audible' : ''}`;
      tabEl.dataset.tabId = tab.id;

      // Favicon
      const iconEl = document.createElement('div');
      iconEl.className = 'tab-favicon';
      if (tab.favicon && (tab.favicon.startsWith('http') || tab.favicon.startsWith('data:'))) {
        const img = document.createElement('img');
        img.src = tab.favicon;
        img.onerror = () => { iconEl.innerHTML = SVG_GLOBE; };
        iconEl.appendChild(img);
      } else {
        iconEl.innerHTML = tab.url && tab.url.includes('newtab.html') ? SVG_SPEED : SVG_GLOBE;
      }

      // Title
      const titleEl = document.createElement('div');
      titleEl.className = 'tab-title';
      titleEl.textContent = tab.title || (tab.isLoading ? (typeof t === 'function' ? t('loading') : 'Loading...') : (typeof t === 'function' ? t('new_tab') : 'New Tab'));

      // Hibernate sleep badge
      const sleepBadge = document.createElement('span');
      sleepBadge.className = 'tab-sleep-badge';
      sleepBadge.textContent = typeof t === 'function' ? t('sleep_badge') : 'Sleep';

      // Audio mute/unmute indicator
      const audioBtn = document.createElement('span');
      audioBtn.className = 'tab-audio-icon';
      audioBtn.innerHTML = tab.isMuted ? SVG_AUDIO_MUTED : SVG_AUDIO;
      audioBtn.title = tab.isMuted ? 'Unmute' : 'Mute';
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        api.toggleTabMute(tab.id);
      });

      // Close button
      const closeBtn = document.createElement('div');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = typeof t === 'function' ? t('close') : 'Close tab';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        api.closeTab(tab.id);
      });

      // Switch tab on click
      tabEl.addEventListener('click', () => {
        if (tab.id !== activeTabId) {
          api.switchTab(tab.id);
        }
      });

      // Middle click to close tab
      tabEl.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          api.closeTab(tab.id);
        }
      });

      tabEl.appendChild(iconEl);
      tabEl.appendChild(titleEl);
      tabEl.appendChild(sleepBadge);
      tabEl.appendChild(audioBtn);
      tabEl.appendChild(closeBtn);
      tabStrip.appendChild(tabEl);
    });

    // Scroll active tab into view
    const activeEl = tabStrip.querySelector('.tab.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  // ================= TAB EVENTS FROM MAIN =================
  api.onTabCreated((newTab) => {
    tabs.push(newTab);
    activeTabId = newTab.id;
    renderTabs();
    updateNavControls(newTab);
  });

  api.onTabActivated((tabId) => {
    activeTabId = tabId;
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      tab.isHibernated = false;
      renderTabs();
      updateNavControls(tab);
      refreshShieldStats(tab.id);
    }
  });

  api.onTabUpdated((updatedInfo) => {
    const idx = tabs.findIndex(t => t.id === updatedInfo.id);
    if (idx !== -1) {
      tabs[idx] = { ...tabs[idx], ...updatedInfo };
      if (tabs[idx].id === activeTabId) {
        updateNavControls(tabs[idx]);
        refreshShieldStats(tabs[idx].id);
      }
      renderTabs();
    }
  });

  api.onTabClosed((closedId) => {
    tabs = tabs.filter(t => t.id !== closedId);
    renderTabs();
  });

  api.onShieldStats((stats) => {
    currentShieldStats = stats;
    shieldBlockedCount.textContent = stats.tabBlockedCount || 0;
    document.getElementById('modalShieldCount').textContent = stats.tabBlockedCount || 0;
    renderBlockedList(stats.blockedList || []);
  });

  api.onMemoryStats((stats) => {
    if (ramSavedText) ramSavedText.textContent = `${stats.estimatedSavedMb} MB saved`;
    const memSavedMb = document.getElementById('memSavedMb');
    if (memSavedMb) memSavedMb.textContent = `${stats.estimatedSavedMb} MB`;
    const memSleepingTabs = document.getElementById('memSleepingTabs');
    if (memSleepingTabs) memSleepingTabs.textContent = `${stats.hibernatedCount}`;
  });

  // ================= NAVIGATION CONTROLS =================
  function updateNavControls(tab) {
    if (!tab) return;
    btnBack.disabled = !tab.canGoBack;
    btnForward.disabled = !tab.canGoForward;
    btnReload.innerHTML = tab.isLoading
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
    btnReload.title = tab.isLoading ? 'Stop' : 'Reload (Ctrl+R)';

    // Update Omnibox URL
    if (tab.url && !tab.url.includes('newtab.html') && tab.url !== 'about:blank') {
      omniboxInput.value = tab.url;
    } else {
      omniboxInput.value = '';
    }

    checkIfBookmarked(tab.url);
  }

  btnNewTab.addEventListener('click', () => {
    api.createTab();
  });

  btnBack.addEventListener('click', () => {
    if (activeTabId) api.goBack(activeTabId);
  });

  btnForward.addEventListener('click', () => {
    if (activeTabId) api.goForward(activeTabId);
  });

  btnReload.addEventListener('click', () => {
    if (activeTabId) api.reloadTab(activeTabId);
  });

  btnHome.addEventListener('click', () => {
    if (activeTabId) api.navigateTab(activeTabId, 'aura://newtab');
  });

  // Omnibox Navigation
  omniboxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = omniboxInput.value.trim();
      if (!val) return;

      const targetUrl = resolveUrlOrSearch(val, settings.searchEngine);
      if (activeTabId) {
        api.navigateTab(activeTabId, targetUrl);
      } else {
        api.createTab(targetUrl);
      }
      omniboxInput.blur();
    }
  });

  omniboxInput.addEventListener('focus', () => {
    omniboxInput.select();
  });

  function resolveUrlOrSearch(input, engine = 'duckduckgo') {
    // Smart Telegram Web K redirection
    if (/^https?:\/\/web\.telegram\.org\/?$/i.test(input) || /^web\.telegram\.org\/?$/i.test(input)) {
      return 'https://web.telegram.org/k/';
    }

    // Check if input is a valid URL or IP
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    const localhostPattern = /^(https?:\/\/)?localhost(:\d+)?(\/.*)?$/;

    if (urlPattern.test(input) || localhostPattern.test(input)) {
      if (!/^https?:\/\//i.test(input)) {
        return 'https://' + input;
      }
      return input;
    }

    // Search query with native dark mode parameters
    const query = encodeURIComponent(input);
    switch (engine) {
      case 'brave':
        return `https://search.brave.com/search?q=${query}`;
      case 'google':
        return `https://www.google.com/search?q=${query}&cs=1`;
      case 'yandex':
        return `https://ya.ru/search/?text=${query}&theme=dark`;
      case 'duckduckgo':
      default:
        return `https://duckduckgo.com/?q=${query}&kae=d`;
    }
  }

  function updateSearchEngineUI(engine) {
    searchEngineIcon.innerHTML = SVG_SEARCH;
    searchEngineIcon.title = (engine || 'search').toUpperCase();
  }

  // ================= PRIVACY SHIELD =================
  shieldPill.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal(shieldModal);
    if (shieldModal.classList.contains('open') && activeTabId) {
      refreshShieldStats(activeTabId);
    }
  });

  document.getElementById('closeShieldModal').addEventListener('click', () => {
    closeAllModals();
  });

  document.getElementById('shieldToggleInput').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await api.toggleShield(enabled);
    shieldPill.classList.toggle('disabled', !enabled);
  });

  const utmToggleInput = document.getElementById('utmToggleInput');
  if (utmToggleInput) {
    utmToggleInput.checked = settings.stripTrackingParams !== false;
    utmToggleInput.addEventListener('change', async (e) => {
      settings.stripTrackingParams = e.target.checked;
      await api.saveSettings(settings);
    });
  }

  async function refreshShieldStats(tabId) {
    if (!tabId) return;
    try {
      const stats = await api.getShieldStats(tabId);
      shieldBlockedCount.textContent = stats.tabBlockedCount;
      document.getElementById('modalShieldCount').textContent = stats.tabBlockedCount;
      renderBlockedList(stats.blockedList || []);
    } catch {}
  }

  function renderBlockedList(list) {
    const container = document.getElementById('blockedListContainer');
    if (!list || list.length === 0) {
      container.innerHTML = '<div style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 10px;">' + (typeof t === 'function' ? t('no_trackers') : 'No trackers detected on this page') + '</div>';
      return;
    }
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'blocked-item';
      row.innerHTML = `
        <span class="blocked-domain">${escapeHtml(item.domain)}</span>
        <span class="blocked-time">${item.time}</span>
      `;
      container.appendChild(row);
    });
  }

  // ================= MEMORY SAVER =================
  if (ramSaverChip) {
    ramSaverChip.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModal(memoryModal);
    });
  }

  document.getElementById('closeMemoryModal').addEventListener('click', () => {
    closeAllModals();
  });

  document.getElementById('btnHibernateInactive').addEventListener('click', async () => {
    tabs.forEach(t => {
      if (t.id !== activeTabId && !t.isHibernated) {
        api.hibernateTab(t.id);
      }
    });
    closeAllModals();
  });

  // ================= BOOKMARKS =================
  let bookmarksCache = [];

  async function checkIfBookmarked(url) {
    if (!url || url.includes('newtab.html')) {
      btnBookmarkStar.classList.remove('bookmarked');
      btnBookmarkStar.innerHTML = SVG_STAR_OUTLINE;
      return;
    }
    try {
      bookmarksCache = await api.getBookmarks();
      const isBookmarked = bookmarksCache.some(b => b.url === url);
      btnBookmarkStar.classList.toggle('bookmarked', isBookmarked);
      btnBookmarkStar.innerHTML = isBookmarked ? SVG_STAR_FILLED : SVG_STAR_OUTLINE;
    } catch {}
  }

  btnBookmarkStar.addEventListener('click', async () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab || !activeTab.url || activeTab.url.includes('newtab.html')) return;

    const isBookmarked = btnBookmarkStar.classList.contains('bookmarked');
    if (isBookmarked) {
      const item = bookmarksCache.find(b => b.url === activeTab.url);
      if (item) {
        await api.removeBookmark(item.id);
        btnBookmarkStar.classList.remove('bookmarked');
        btnBookmarkStar.innerHTML = SVG_STAR_OUTLINE;
      }
    } else {
      await api.addBookmark({
        title: activeTab.title || activeTab.url,
        url: activeTab.url
      });
      btnBookmarkStar.classList.add('bookmarked');
      btnBookmarkStar.innerHTML = SVG_STAR_FILLED;
    }
    checkIfBookmarked(activeTab.url);
  });

  document.getElementById('btnBookmarks').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal(bookmarksModal);
    if (bookmarksModal.classList.contains('open')) {
      renderBookmarksList();
    }
  });

  document.getElementById('closeBookmarksModal').addEventListener('click', () => {
    closeAllModals();
  });

  async function renderBookmarksList() {
    const listEl = document.getElementById('bookmarksList');
    try {
      const bookmarks = await api.getBookmarks();
      bookmarksCache = bookmarks;
      if (bookmarks.length === 0) {
        listEl.innerHTML = '<div style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 20px;">' + (typeof t === 'function' ? t('no_bookmarks') : 'No bookmarks yet') + '</div>';
        return;
      }
      listEl.innerHTML = '';
      bookmarks.forEach(bm => {
        const row = document.createElement('div');
        row.className = 'bookmark-item';
        row.innerHTML = `
          <div class="item-title-col">
            <span style="color: #818cf8; display: inline-flex; align-items: center;">${SVG_BOOKMARK}</span>
            <span class="item-title">${escapeHtml(bm.title || bm.url)}</span>
          </div>
          <span class="item-delete-btn">&times;</span>
        `;
        row.querySelector('.item-title-col').addEventListener('click', () => {
          if (activeTabId) api.navigateTab(activeTabId, bm.url);
          bookmarksModal.classList.remove('open');
        });
        row.querySelector('.item-delete-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          await api.removeBookmark(bm.id);
          renderBookmarksList();
          if (activeTabId) {
            const cur = tabs.find(t => t.id === activeTabId);
            if (cur) checkIfBookmarked(cur.url);
          }
        });
        listEl.appendChild(row);
      });
    } catch {}
  }

  // ================= HISTORY =================
  document.getElementById('btnHistory').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal(historyModal);
    if (historyModal.classList.contains('open')) {
      renderHistoryList();
    }
  });

  document.getElementById('closeHistoryModal').addEventListener('click', () => {
    closeAllModals();
  });

  document.getElementById('btnClearHistoryBtn').addEventListener('click', async () => {
    await api.clearHistory();
    renderHistoryList();
  });

  async function renderHistoryList() {
    const listEl = document.getElementById('historyList');
    try {
      const history = await api.getHistory();
      if (history.length === 0) {
        listEl.innerHTML = '<div style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 20px;">' + (typeof t === 'function' ? t('no_history') : 'No history recorded') + '</div>';
        return;
      }
      listEl.innerHTML = '';
      history.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-item';
        row.innerHTML = `
          <div class="item-title-col">
            <span style="color: #64748b; display: inline-flex; align-items: center;">${SVG_GLOBE}</span>
            <span class="item-title">${escapeHtml(item.title || item.url)}</span>
          </div>
        `;
        row.addEventListener('click', () => {
          if (activeTabId) api.navigateTab(activeTabId, item.url);
          historyModal.classList.remove('open');
        });
        listEl.appendChild(row);
      });
    } catch {}
  }

  // ================= CLEAR DATA (1-CLICK PURGE) =================
  document.getElementById('btnClearData').addEventListener('click', async () => {
    const msg = typeof t === 'function' ? t('wipe_confirm') : 'Wipe all local cache, cookies, session storage and history?';
    if (confirm(msg)) {
      await api.clearAllBrowsingData();
      alert(typeof t === 'function' ? t('wipe_success') : 'Browser cache, cookies and telemetry traces wiped completely.');
    }
  });

  // ================= SETTINGS =================
  document.getElementById('btnSettings').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal(settingsModal);
    if (settingsModal.classList.contains('open')) {
      document.getElementById('settingSearchEngine').value = settings.searchEngine || 'duckduckgo';
      document.getElementById('settingClearOnExit').checked = settings.clearOnExit || false;
      document.getElementById('settingTorStartup').value = settings.torStartupMode || 'ask';
      if (document.getElementById('settingLanguage')) {
        document.getElementById('settingLanguage').value = settings.language || 'ru';
      }
    }
  });

  document.getElementById('closeSettingsModal').addEventListener('click', () => {
    closeAllModals();
  });

  if (document.getElementById('settingLanguage')) {
    document.getElementById('settingLanguage').addEventListener('change', async (e) => {
      settings.language = e.target.value;
      if (typeof setAppLanguage === 'function') {
        setAppLanguage(settings.language);
        applyTranslationsToDOM();
      }
      await api.saveSettings(settings);
      renderTabs();
      refreshVpnStatus();
    });
  }

  document.getElementById('settingSearchEngine').addEventListener('change', async (e) => {
    settings.searchEngine = e.target.value;
    await api.saveSettings(settings);
    updateSearchEngineUI(settings.searchEngine);
  });

  document.getElementById('settingSleepTimeout').addEventListener('change', async (e) => {
    settings.hibernateTimeoutMinutes = parseInt(e.target.value, 10);
    await api.saveSettings(settings);
  });

  document.getElementById('settingClearOnExit').addEventListener('change', async (e) => {
    settings.clearOnExit = e.target.checked;
    await api.saveSettings(settings);
  });

  document.getElementById('settingTorStartup').addEventListener('change', async (e) => {
    settings.torStartupMode = e.target.value;
    await api.saveSettings(settings);
  });

  // ================= FIND IN PAGE (Ctrl+F) =================
  const findInput = document.getElementById('find-input');
  findInput.addEventListener('input', () => {
    const text = findInput.value;
    if (text) {
      api.findInPage(text, true);
    } else {
      api.stopFindInPage();
    }
  });

  document.getElementById('btnFindNext').addEventListener('click', () => {
    if (findInput.value) api.findInPage(findInput.value, true);
  });

  document.getElementById('btnFindPrev').addEventListener('click', () => {
    if (findInput.value) api.findInPage(findInput.value, false);
  });

  document.getElementById('btnFindClose').addEventListener('click', () => {
    findBar.classList.remove('open');
    api.stopFindInPage();
  });

  // ================= KEYBOARD SHORTCUTS =================
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 't':
          e.preventDefault();
          api.createTab();
          break;
        case 'w':
          e.preventDefault();
          if (activeTabId) api.closeTab(activeTabId);
          break;
        case 'l':
          e.preventDefault();
          omniboxInput.focus();
          omniboxInput.select();
          break;
        case 'r':
          e.preventDefault();
          if (activeTabId) api.reloadTab(activeTabId);
          break;
        case 'f':
          e.preventDefault();
          findBar.classList.add('open');
          findInput.focus();
          findInput.select();
          break;
        case 'h':
          e.preventDefault();
          historyModal.classList.toggle('open');
          renderHistoryList();
          break;
        case 'd':
          e.preventDefault();
          btnBookmarkStar.click();
          break;
      }
    } else if (e.key === 'Escape') {
      closeAllModals();
      findBar.classList.remove('open');
      api.stopFindInPage();
    }
  });

  // Handle shortcuts forwarded from active webContents
  api.onShortcut((action) => {
    switch (action) {
      case 'focus-omnibox':
        omniboxInput.focus();
        omniboxInput.select();
        break;
      case 'open-find':
        findBar.classList.add('open');
        findInput.focus();
        findInput.select();
        break;
      case 'toggle-history':
        toggleModal(historyModal);
        if (historyModal.classList.contains('open')) renderHistoryList();
        break;
      case 'toggle-bookmarks':
        toggleModal(bookmarksModal);
        if (bookmarksModal.classList.contains('open')) renderBookmarksList();
        break;
      case 'bookmark-current':
        btnBookmarkStar.click();
        break;
      case 'toggle-passwords':
        toggleModal(passwordsModal);
        if (passwordsModal.classList.contains('open')) renderPasswordsList();
        break;
      case 'escape':
        closeAllModals();
        findBar.classList.remove('open');
        api.stopFindInPage();
        break;
    }
  });

  function toggleModal(modal) {
    const isCurrentlyOpen = modal.classList.contains('open');
    closeAllModals();
    if (!isCurrentlyOpen) {
      modal.classList.add('open');
      api.setModalOpen(true);
    }
  }

  function closeAllModals() {
    let hadOpen = false;
    [shieldModal, memoryModal, bookmarksModal, historyModal, settingsModal, vpnModal, startupTorModal, passwordsModal, bypassModal].forEach(m => {
      if (m && m.classList.contains('open')) hadOpen = true;
      if (m) m.classList.remove('open');
    });
    if (hadOpen) {
      api.setModalOpen(false);
    }
  }

  // ================= VPN & TOR CONTROLS =================
  btnVpnToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal(vpnModal);
    if (vpnModal.classList.contains('open')) {
      refreshVpnStatus();
    }
  });

  document.getElementById('closeVpnModal').addEventListener('click', () => {
    closeAllModals();
  });

  tabBtnVpn.addEventListener('click', () => {
    tabBtnVpn.classList.add('active');
    tabBtnTor.classList.remove('active');
    panelVpn.style.display = 'block';
    panelTor.style.display = 'none';
  });

  tabBtnTor.addEventListener('click', () => {
    tabBtnTor.classList.add('active');
    tabBtnVpn.classList.remove('active');
    panelTor.style.display = 'block';
    panelVpn.style.display = 'none';
  });

  // ================= INCY-STYLE VPN SUBSCRIPTION & SERVERS =================
  const vpnSubCard = document.getElementById('vpnSubCard');
  const vpnSubName = document.getElementById('vpnSubName');
  const vpnSubBadge = document.getElementById('vpnSubBadge');
  const vpnSubMeta = document.getElementById('vpnSubMeta');
  const vpnSubTrafficTag = document.getElementById('vpnSubTrafficTag');
  const vpnSubExpireTag = document.getElementById('vpnSubExpireTag');
  const vpnSubUpdated = document.getElementById('vpnSubUpdated');
  const btnUpdateSubscription = document.getElementById('btnUpdateSubscription');
  const btnDeleteSubscription = document.getElementById('btnDeleteSubscription');
  const btnChangeSub = document.getElementById('btnChangeSub');
  const btnToggleSubInput = document.getElementById('btnToggleSubInput');
  const subInputContainer = document.getElementById('subInputContainer');
  const subInputArea = document.getElementById('subInputArea');
  const btnLoadSubscription = document.getElementById('btnLoadSubscription');
  const vpnServersCountTag = document.getElementById('vpnServersCountTag');
  const btnPingServers = document.getElementById('btnPingServers');
  const pingBtnText = document.getElementById('pingBtnText');
  const btnRefreshServers = document.getElementById('btnRefreshServers');

  function renderSubscriptionCard(info) {
    if (!vpnSubCard || !subInputContainer) return;
    if (info && (info.url || info.serverCount > 0)) {
      vpnSubCard.style.display = 'block';
      subInputContainer.style.display = 'none';

      if (vpnSubName) vpnSubName.textContent = info.title || 'VPN Subscription';
      if (vpnSubBadge) vpnSubBadge.textContent = `${info.serverCount || 0} ${typeof t === 'function' ? t('sub_servers_count') : 'серверов'}`;

      const hasMeta = !!(info.trafficText || (info.remainingDays !== null && info.remainingDays !== undefined));
      if (vpnSubMeta) {
        vpnSubMeta.style.display = hasMeta ? 'flex' : 'none';
        if (vpnSubTrafficTag) {
          vpnSubTrafficTag.style.display = info.trafficText ? 'inline-block' : 'none';
          vpnSubTrafficTag.textContent = info.trafficText ? `${typeof t === 'function' ? t('sub_traffic_prefix') : 'Трафик:'} ${info.trafficText}` : '';
        }
        if (vpnSubExpireTag) {
          const days = info.remainingDays;
          vpnSubExpireTag.style.display = (days !== null && days !== undefined) ? 'inline-block' : 'none';
          vpnSubExpireTag.textContent = (days !== null && days !== undefined) ? `${typeof t === 'function' ? t('sub_expire_prefix') : 'Осталось:'} ${days} ${typeof t === 'function' ? t('sub_days_unit') : 'д'}` : '';
        }
      }

      if (vpnSubUpdated) {
        if (info.lastUpdated) {
          const d = new Date(info.lastUpdated);
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          vpnSubUpdated.textContent = `${typeof t === 'function' ? t('sub_updated_prefix') : 'Обновлено:'} ${timeStr}`;
        } else {
          vpnSubUpdated.textContent = '';
        }
      }
    } else {
      vpnSubCard.style.display = 'none';
      subInputContainer.style.display = 'block';
      if (btnToggleSubInput) btnToggleSubInput.style.display = 'none';
    }
  }

  if (btnChangeSub) {
    btnChangeSub.addEventListener('click', () => {
      subInputContainer.style.display = 'block';
      if (btnToggleSubInput) btnToggleSubInput.style.display = 'block';
      subInputArea?.focus();
    });
  }

  if (btnToggleSubInput) {
    btnToggleSubInput.addEventListener('click', () => {
      subInputContainer.style.display = 'none';
    });
  }

  const vpnDeviceHwidVal = document.getElementById('vpnDeviceHwidVal');
  const btnCopyHwid = document.getElementById('btnCopyHwid');

  async function loadDeviceHwid() {
    if (api && api.getDeviceHwid && vpnDeviceHwidVal) {
      try {
        const hwid = await api.getDeviceHwid();
        vpnDeviceHwidVal.textContent = hwid || '--';
      } catch {}
    }
  }
  loadDeviceHwid();

  if (btnCopyHwid && vpnDeviceHwidVal) {
    btnCopyHwid.addEventListener('click', async () => {
      const hwid = vpnDeviceHwidVal.textContent.trim();
      if (hwid && hwid !== '--') {
        try {
          await navigator.clipboard.writeText(hwid);
          const orig = btnCopyHwid.textContent;
          btnCopyHwid.textContent = '✓ Скопировано';
          btnCopyHwid.style.color = '#10b981';
          setTimeout(() => {
            btnCopyHwid.textContent = orig;
            btnCopyHwid.style.color = '#818cf8';
          }, 2000);
        } catch {}
      }
    });
  }

  if (btnLoadSubscription) {
    btnLoadSubscription.addEventListener('click', async () => {
      const text = subInputArea.value.trim();
      if (!text) {
        alert(settings.language === 'en' ? 'Please paste your subscription URL or config' : 'Пожалуйста, вставьте ссылку на подписку или конфиг');
        return;
      }
      btnLoadSubscription.textContent = typeof t === 'function' ? t('loading') : 'Loading...';
      try {
        const res = await api.importVpnSubscription(text);
        if (res.success) {
          subInputArea.value = '';
          renderSubscriptionCard(res.subscriptionInfo);
          await renderVpnServers();
          alert(settings.language === 'en' ? `Loaded ${res.count} servers from your subscription.` : `Успешно загружено серверов: ${res.count}.`);
        } else {
          alert(res.error || 'Failed to parse subscription');
        }
      } catch (e) {
        alert(e.message);
      } finally {
        btnLoadSubscription.textContent = typeof t === 'function' ? t('load_servers_btn') : 'Load Servers';
      }
    });
  }

  async function handleRefreshSubscription() {
    const refreshBtns = [btnUpdateSubscription, btnRefreshServers].filter(Boolean);
    refreshBtns.forEach(b => b.classList.add('spinning', 'loading'));
    try {
      const res = await api.updateVpnSubscription();
      if (res.success) {
        renderSubscriptionCard(res.subscriptionInfo);
        await renderVpnServers();
        alert(typeof t === 'function' ? t('sub_updated_toast') : 'Подписка успешно обновлена!');
      } else {
        alert(res.error || 'Failed to update subscription');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      refreshBtns.forEach(b => b.classList.remove('spinning', 'loading'));
    }
  }

  if (btnUpdateSubscription) btnUpdateSubscription.addEventListener('click', handleRefreshSubscription);
  if (btnRefreshServers) btnRefreshServers.addEventListener('click', handleRefreshSubscription);

  if (btnDeleteSubscription) {
    btnDeleteSubscription.addEventListener('click', async () => {
      const confirmMsg = typeof t === 'function' ? t('delete_sub_confirm') : 'Удалить эту подписку?';
      if (!confirm(confirmMsg)) return;
      try {
        await api.deleteVpnSubscription();
        renderSubscriptionCard(null);
        await renderVpnServers();
      } catch (e) {
        alert(e.message);
      }
    });
  }

  if (btnPingServers) {
    btnPingServers.addEventListener('click', async () => {
      btnPingServers.classList.add('loading');
      if (pingBtnText) pingBtnText.textContent = typeof t === 'function' ? t('pinging') : 'Замер...';
      try {
        await api.pingVpnServers();
        await renderVpnServers();
      } catch (e) {
        console.warn('Ping error:', e);
      } finally {
        btnPingServers.classList.remove('loading');
        if (pingBtnText) pingBtnText.textContent = typeof t === 'function' ? t('btn_ping_all') : 'Пинг';
      }
    });
  }

  async function renderVpnServers() {
    try {
      const servers = await api.getVpnServers();
      vpnServersList.innerHTML = '';
      const importedCount = servers.filter(s => s.isImported).length;
      if (vpnServersCountTag) vpnServersCountTag.textContent = importedCount > 0 ? importedCount : servers.length;

      if (!servers.find(s => s.id === selectedServerId)) {
        selectedServerId = servers[0] ? servers[0].id : 'custom';
      }
      if (customProxySection) {
        customProxySection.style.display = selectedServerId === 'custom' ? 'block' : 'none';
      }

      servers.forEach(s => {
        const item = document.createElement('div');
        item.className = `vpn-server-item ${s.id === selectedServerId ? 'selected' : ''}`;
        item.dataset.serverId = s.id;

        // Protocol & security meta tag (e.g. "VLESS · TCP · REALITY · JSON")
        let protoTag = s.protocol || 'SOCKS5';
        if (s.network) {
          protoTag += ` · ${s.network.toUpperCase()}`;
        }
        if (s.security && s.security !== 'none') {
          protoTag += ` · ${s.security.toUpperCase()}`;
        }
        if (s.fullConfig || (s.protocol === 'VLESS' && s.security === 'reality' && s.isImported)) {
          protoTag += ` · JSON`;
        }

        // Flag icon or country code
        const flagText = s.flag || 'VPN';
        let flagDisplay = flagText;
        if (/^[A-Za-z]{2}$/.test(flagText)) {
          try {
            flagDisplay = String.fromCodePoint(...[...flagText.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
          } catch {}
        }

        // Ping indicator dot
        let pingClass = 'ping-none';
        const pingVal = parseInt(s.ping, 10);
        if (!isNaN(pingVal)) {
          if (pingVal < 150) pingClass = 'ping-fast';
          else if (pingVal < 300) pingClass = 'ping-med';
          else pingClass = 'ping-slow';
        } else if (s.ping === 'timeout') {
          pingClass = 'ping-slow';
        }

        item.innerHTML = `
          <div class="vpn-server-left">
            <span class="country-pill" title="${escapeHtml(flagText)}">${flagDisplay}</span>
            <div style="display: flex; flex-direction: column; overflow: hidden;">
              <span style="font-weight: 500; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(s.name)}</span>
              <span class="vpn-server-meta-tag">${escapeHtml(protoTag)}</span>
            </div>
          </div>
          <span class="vpn-server-ping">
            <span class="ping-dot ${pingClass}"></span>
            ${escapeHtml(s.ping || '--')}
          </span>
        `;
        item.addEventListener('click', () => {
          selectedServerId = s.id;
          document.querySelectorAll('.vpn-server-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          customProxySection.style.display = s.id === 'custom' ? 'block' : 'none';
        });
        vpnServersList.appendChild(item);
      });
    } catch {}
  }
  renderVpnServers();

  btnConnectVpn.addEventListener('click', async () => {
    btnConnectVpn.textContent = typeof t === 'function' ? t('connecting') : 'Connecting...';
    const customUrl = customProxyInput ? customProxyInput.value.trim() : '';
    const status = await api.enableVpn(selectedServerId, customUrl, currentVpnScope);
    btnConnectVpn.textContent = typeof t === 'function' ? t('connect_vpn_btn') : 'Connect VPN';
    if (status && status.mode !== 'vpn' && status.lastError) {
      alert(status.lastError);
    }
    updateVpnUI(status);
  });

  // ================= TOR BRIDGES & TELEGRAM BOT =================
  let selectedBridgeType = 'obfs4';
  const btnOpenGetBridgesBot = document.getElementById('btnOpenGetBridgesBot');
  const btnBridgeTypeObfs4 = document.getElementById('btnBridgeTypeObfs4');
  const btnBridgeTypeWebtunnel = document.getElementById('btnBridgeTypeWebtunnel');
  const torBridgesInput = document.getElementById('torBridgesInput');
  const chkUseTorBridges = document.getElementById('chkUseTorBridges');
  const btnSaveTorBridges = document.getElementById('btnSaveTorBridges');
  const torBridgesStatusBox = document.getElementById('torBridgesStatusBox');
  const torBridgesStatusIcon = document.getElementById('torBridgesStatusIcon');
  const torBridgesStatusText = document.getElementById('torBridgesStatusText');
  const btnCheckTorPort = document.getElementById('btnCheckTorPort');

  if (btnOpenGetBridgesBot) {
    btnOpenGetBridgesBot.addEventListener('click', () => {
      api.openTorTelegramBot();
    });
  }

  if (btnBridgeTypeObfs4 && btnBridgeTypeWebtunnel) {
    btnBridgeTypeObfs4.addEventListener('click', () => {
      selectedBridgeType = 'obfs4';
      btnBridgeTypeObfs4.classList.add('active');
      btnBridgeTypeWebtunnel.classList.remove('active');
    });

    btnBridgeTypeWebtunnel.addEventListener('click', () => {
      selectedBridgeType = 'webtunnel';
      btnBridgeTypeWebtunnel.classList.add('active');
      btnBridgeTypeObfs4.classList.remove('active');
    });
  }

  if (btnSaveTorBridges) {
    btnSaveTorBridges.addEventListener('click', async () => {
      const bridges = torBridgesInput.value.trim();
      const useBridges = chkUseTorBridges.checked;
      btnSaveTorBridges.textContent = 'Saving...';
      const status = await api.saveTorBridges({
        bridges,
        useBridges,
        bridgeType: selectedBridgeType
      });
      btnSaveTorBridges.textContent = typeof t === 'function' ? t('tor_save_bridges_btn') : 'Save Bridges';
      updateTorBridgesStatus(status);
    });
  }

  if (btnCheckTorPort) {
    btnCheckTorPort.addEventListener('click', async () => {
      btnCheckTorPort.textContent = '...';
      const port = parseInt(document.getElementById('torPortInput').value, 10) || 9050;
      const isRunning = await api.checkTorPort(port);
      if (isRunning) {
        alert(typeof t === 'function' ? t('tor_port_running') : 'Служба Tor активна и готова к работе');
      } else {
        alert(typeof t === 'function' ? t('tor_port_not_found') : 'Служба Tor не обнаружена на порту 9050/9150');
      }
      btnCheckTorPort.textContent = 'Check Tor Status';
    });
  }

  function updateTorBridgesStatus(status) {
    if (!status || !torBridgesInput) return;
    if (status.torBridges) {
      torBridgesInput.value = status.torBridges;
    }
    if (status.useTorBridges !== undefined && chkUseTorBridges) {
      chkUseTorBridges.checked = status.useTorBridges;
    }
    if (status.torBridgeType) {
      selectedBridgeType = status.torBridgeType;
      if (selectedBridgeType === 'webtunnel') {
        btnBridgeTypeWebtunnel?.classList.add('active');
        btnBridgeTypeObfs4?.classList.remove('active');
      } else {
        btnBridgeTypeObfs4?.classList.add('active');
        btnBridgeTypeWebtunnel?.classList.remove('active');
      }
    }
    const count = status.bridgesCount || 0;
    if (torBridgesStatusIcon && torBridgesStatusText && torBridgesStatusBox) {
      if (count > 0 && status.useTorBridges) {
        torBridgesStatusIcon.className = 'status-dot active';
        torBridgesStatusText.textContent = (settings.language === 'en' ? 'Bridges configured: ' : 'Настроено мостов: ') + count;
        torBridgesStatusBox.style.color = '#34d399';
      } else {
        torBridgesStatusIcon.className = 'status-dot';
        torBridgesStatusText.textContent = typeof t === 'function' ? t('tor_bridges_none') : 'No bridges configured';
        torBridgesStatusBox.style.color = '#94a3b8';
      }
    }
  }

  btnConnectTor.addEventListener('click', async () => {
    btnConnectTor.textContent = typeof t === 'function' ? t('connecting') : 'Connecting...';
    const port = parseInt(document.getElementById('torPortInput').value, 10) || 9050;
    const res = await api.enableTor(port, currentVpnScope);
    btnConnectTor.textContent = typeof t === 'function' ? t('connect_tor_btn') : 'Connect via Tor';
    if (!res.success) {
      alert(res.error || (typeof t === 'function' ? t('tor_port_not_found') : 'Служба Tor не обнаружена на порту 9050/9150'));
    }
    updateVpnUI(res.status || res);
  });

  btnDisconnectProxy.addEventListener('click', async () => {
    const status = await api.disableProxy();
    updateVpnUI(status);
    refreshBypassStatus();
  });

  // Routing Scope (Browser vs System)
  if (btnScopeBrowser && btnScopeSystem) {
    btnScopeBrowser.addEventListener('click', async () => {
      currentVpnScope = 'browser';
      btnScopeBrowser.classList.add('active');
      btnScopeSystem.classList.remove('active');
      if (vpnScopeHint) vpnScopeHint.textContent = typeof t === 'function' ? t('scope_browser_hint') : 'Прокси активен только внутри Aura Browser. Внешние программы ПК работают напрямую.';
      await api.setVpnScope('browser');
    });

    btnScopeSystem.addEventListener('click', async () => {
      currentVpnScope = 'system';
      btnScopeSystem.classList.add('active');
      btnScopeBrowser.classList.remove('active');
      if (vpnScopeHint) vpnScopeHint.textContent = typeof t === 'function' ? t('scope_system_hint') : 'Системный прокси Windows: весь трафик ПК идет через прокси.';
      await api.setVpnScope('system');
    });
  }

  // Smart Circumvention (Bypass) Handlers
  function updateBypassUI(bypassStatus) {
    if (!bypassStatus) return;
    const isEnabled = !!bypassStatus.enabled;
    if (isEnabled) {
      btnSmartBypass?.classList.add('active');
      bypassIndicatorDot?.classList.add('active');
      if (bypassPillText) bypassPillText.textContent = typeof t === 'function' ? t('smart_bypass_active') : 'Обход: ВКЛ';
      if (bypassMasterToggle) bypassMasterToggle.checked = true;
      if (bypassStatusTitle) bypassStatusTitle.textContent = typeof t === 'function' ? t('bypass_active') : 'Обход: Активен (Внутри браузера)';
    } else {
      btnSmartBypass?.classList.remove('active');
      bypassIndicatorDot?.classList.remove('active');
      if (bypassPillText) bypassPillText.textContent = typeof t === 'function' ? t('smart_bypass_inactive') : 'Обход: Выкл';
      if (bypassMasterToggle) bypassMasterToggle.checked = false;
      if (bypassStatusTitle) bypassStatusTitle.textContent = typeof t === 'function' ? t('bypass_inactive') : 'Обход: Не активен';
    }
  }

  if (btnSmartBypass) {
    btnSmartBypass.addEventListener('click', async () => {
      const status = await api.toggleSmartBypass();
      updateBypassUI(status);
    });

    btnSmartBypass.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleModal(bypassModal);
    });
  }

  if (closeBypassModal) {
    closeBypassModal.addEventListener('click', () => {
      closeAllModals();
    });
  }

  if (bypassMasterToggle) {
    bypassMasterToggle.addEventListener('change', async (e) => {
      const status = await api.toggleSmartBypass(e.target.checked);
      updateBypassUI(status);
    });
  }

  async function refreshBypassStatus() {
    try {
      const status = await api.getSmartBypassStatus();
      updateBypassUI(status);
    } catch {}
  }
  refreshBypassStatus();

  async function refreshVpnStatus() {
    try {
      const status = await api.getVpnStatus();
      updateVpnUI(status);
      updateTorBridgesStatus(status);
      if (status && status.subscriptionInfo) {
        renderSubscriptionCard(status.subscriptionInfo);
      }
    } catch {}
  }

  function updateVpnUI(status) {
    if (!status) return;
    const mode = status.mode || 'direct';

    btnVpnToggle.classList.remove('vpn-active', 'tor-active');
    vpnIndicatorDot.classList.remove('vpn-on', 'tor-on');

    if (mode === 'vpn') {
      btnVpnToggle.classList.add('vpn-active');
      vpnPillIcon.innerHTML = SVG_SHIELD;
      vpnPillText.textContent = 'VPN Active';
      vpnCurrentStatus.textContent = typeof t === 'function' ? t('vpn_active_status') : 'Protected via Built-in VPN';
      vpnIndicatorDot.classList.add('vpn-on');
      btnDisconnectProxy.style.display = 'block';
    } else if (mode === 'tor') {
      btnVpnToggle.classList.add('tor-active');
      vpnPillIcon.innerHTML = SVG_TOR;
      vpnPillText.textContent = 'Tor Active';
      vpnCurrentStatus.textContent = typeof t === 'function' ? t('tor_active_status') : 'Anonymous via Tor Onion';
      vpnIndicatorDot.classList.add('tor-on');
      btnDisconnectProxy.style.display = 'block';
    } else {
      vpnPillIcon.innerHTML = SVG_LOCK;
      vpnPillText.textContent = typeof t === 'function' ? t('vpn_tor_button') : 'VPN / Tor';
      vpnCurrentStatus.textContent = typeof t === 'function' ? t('vpn_direct_status') : 'Direct (Unprotected)';
      btnDisconnectProxy.style.display = 'none';
    }

    if (status.routingScope) {
      currentVpnScope = status.routingScope;
      if (currentVpnScope === 'system') {
        btnScopeSystem?.classList.add('active');
        btnScopeBrowser?.classList.remove('active');
        if (vpnScopeHint) vpnScopeHint.textContent = typeof t === 'function' ? t('scope_system_hint') : 'Системный прокси Windows: весь трафик ПК идет через прокси.';
      } else {
        btnScopeBrowser?.classList.add('active');
        btnScopeSystem?.classList.remove('active');
        if (vpnScopeHint) vpnScopeHint.textContent = typeof t === 'function' ? t('scope_browser_hint') : 'Прокси активен только внутри Aura Browser. Внешние программы ПК работают напрямую.';
      }
    }

    if (status.currentIpInfo) {
      vpnCurrentIp.textContent = `IP: ${status.currentIpInfo.ip || 'Detecting...'}`;
    }
  }

  // Load initial VPN state
  refreshVpnStatus();

  // ================= STARTUP TOR MODAL =================
  api.onTorStartupPrompt(() => {
    toggleModal(startupTorModal);
  });

  document.getElementById('closeStartupTorModal').addEventListener('click', () => {
    closeAllModals();
  });

  document.getElementById('btnStartupEnableTor').addEventListener('click', async () => {
    const remember = document.getElementById('chkStartupRemember').checked;
    if (remember) {
      settings.torStartupMode = 'always';
      await api.saveSettings(settings);
    }
    const status = await api.respondTorStartup(true);
    updateVpnUI(status);
    closeAllModals();
  });

  document.getElementById('btnStartupNormal').addEventListener('click', async () => {
    const remember = document.getElementById('chkStartupRemember').checked;
    if (remember) {
      settings.torStartupMode = 'never';
      await api.saveSettings(settings);
    }
    const status = await api.respondTorStartup(false);
    updateVpnUI(status);
    closeAllModals();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.flyout-modal') && !e.target.closest('#browser-header') && !e.target.closest('.password-banner')) {
      closeAllModals();
    }
  });

  // ================= PASSWORD MANAGER LOGIC =================
  btnPasswords.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal(passwordsModal);
    if (passwordsModal.classList.contains('open')) {
      renderPasswordsList();
    }
  });

  document.getElementById('closePasswordsModal').addEventListener('click', () => {
    closeAllModals();
  });

  passwordsSearchInput.addEventListener('input', () => {
    renderPasswordsList(passwordsSearchInput.value.trim().toLowerCase());
  });

  async function renderPasswordsList(searchQuery = '') {
    try {
      const allCreds = await api.getSavedPasswords();
      passwordsList.innerHTML = '';

      const filtered = searchQuery
        ? allCreds.filter(c => c.domain.toLowerCase().includes(searchQuery) || c.username.toLowerCase().includes(searchQuery))
        : allCreds;

      if (filtered.length === 0) {
        passwordsList.innerHTML = '<div style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 20px;">' + (typeof t === 'function' ? t('no_passwords') : 'No saved passwords found') + '</div>';
        return;
      }

      filtered.forEach(cred => {
        const card = document.createElement('div');
        card.className = 'password-entry-card';

        let isRevealed = false;
        card.innerHTML = `
          <div class="pwd-meta">
            <span class="pwd-domain">${escapeHtml(cred.domain)}</span>
            <span class="pwd-user">${escapeHtml(cred.username)}</span>
            <div class="pwd-pass-row">
              <span class="pwd-val-text">••••••••</span>
            </div>
          </div>
          <div class="pwd-actions">
            <button class="pwd-icon-btn btn-toggle-eye" title="Show / Hide">${SVG_EYE}</button>
            <button class="pwd-icon-btn btn-copy-user" title="Copy User">${SVG_USER}</button>
            <button class="pwd-icon-btn btn-copy-pwd" title="Copy Password">${SVG_CLIPBOARD}</button>
            <button class="pwd-icon-btn delete-btn btn-del-pwd" title="Delete">${SVG_TRASH}</button>
          </div>
        `;

        const valText = card.querySelector('.pwd-val-text');
        card.querySelector('.btn-toggle-eye').addEventListener('click', () => {
          isRevealed = !isRevealed;
          valText.textContent = isRevealed ? cred.password : '••••••••';
        });

        card.querySelector('.btn-copy-user').addEventListener('click', async (e) => {
          await navigator.clipboard.writeText(cred.username);
          const btn = card.querySelector('.btn-copy-user');
          btn.innerHTML = SVG_CHECK;
          setTimeout(() => { btn.innerHTML = SVG_USER; }, 1200);
        });

        card.querySelector('.btn-copy-pwd').addEventListener('click', async (e) => {
          await navigator.clipboard.writeText(cred.password);
          const btn = card.querySelector('.btn-copy-pwd');
          btn.innerHTML = SVG_CHECK;
          setTimeout(() => { btn.innerHTML = SVG_CLIPBOARD; }, 1200);
        });

        card.querySelector('.btn-del-pwd').addEventListener('click', async () => {
          if (confirm(`Delete saved password for ${cred.domain}?`)) {
            await api.deletePassword(cred.id);
            renderPasswordsList(searchQuery);
          }
        });

        passwordsList.appendChild(card);
      });
    } catch (err) {
      console.error('Error rendering passwords list:', err);
    }
  }

  // Password Save Prompt Handler
  api.onPasswordSavePrompt((cred) => {
    pendingSaveLogin = cred;
    pwdPromptDomain.textContent = cred.domain;
    pwdPromptUser.textContent = cred.username;
    passwordSaveBanner.classList.add('open');
  });

  btnSavePasswordConfirm.addEventListener('click', async () => {
    if (pendingSaveLogin) {
      await api.savePassword(pendingSaveLogin);
      pendingSaveLogin = null;
    }
    passwordSaveBanner.classList.remove('open');
  });

  btnSavePasswordDismiss.addEventListener('click', () => {
    pendingSaveLogin = null;
    passwordSaveBanner.classList.remove('open');
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
});
