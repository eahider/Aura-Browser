// Memory Manager & Tab Hibernation for Aura Browser
// Automatically suspends inactive background tabs to save RAM

class MemoryManager {
  constructor(options = {}) {
    this.timeoutMs = (options.timeoutMinutes || 5) * 60 * 1000;
    this.tabStates = new Map(); // tabId -> { lastActiveTime, isHibernated, savedUrl, savedTitle, savedFavicon, view }
    this.onHibernateCallback = null;
  }

  setTimeoutMinutes(minutes) {
    this.timeoutMs = Math.max(1, minutes) * 60 * 1000;
  }

  registerTab(tabId, info = {}) {
    this.tabStates.set(tabId, {
      id: tabId,
      lastActiveTime: Date.now(),
      isHibernated: false,
      url: info.url || 'about:blank',
      title: info.title || 'New Tab',
      favicon: info.favicon || '',
      view: info.view || null,
      hibernateCount: 0
    });
  }

  touchTab(tabId) {
    const tab = this.tabStates.get(tabId);
    if (tab) {
      tab.lastActiveTime = Date.now();
    }
  }

  updateTabInfo(tabId, updates = {}) {
    const tab = this.tabStates.get(tabId);
    if (tab) {
      Object.assign(tab, updates);
    }
  }

  unregisterTab(tabId) {
    this.tabStates.delete(tabId);
  }

  setHibernateCallback(cb) {
    this.onHibernateCallback = cb;
  }

  checkHibernation(activeTabId) {
    const now = Date.now();
    for (const [tabId, tab] of this.tabStates.entries()) {
      // Never hibernate currently active tab
      if (tabId === activeTabId) {
        tab.lastActiveTime = now;
        continue;
      }

      // If already hibernated, skip
      if (tab.isHibernated) continue;

      // Don't hibernate internal empty new tabs if nothing loaded
      if (tab.url.startsWith('file://') && tab.url.includes('newtab.html')) continue;

      // Check inactivity threshold
      const idleTime = now - tab.lastActiveTime;
      if (idleTime >= this.timeoutMs) {
        this.hibernateTab(tabId);
      }
    }
  }

  hibernateTab(tabId) {
    const tab = this.tabStates.get(tabId);
    if (!tab || tab.isHibernated) return false;

    tab.isHibernated = true;
    tab.hibernateCount++;

    if (this.onHibernateCallback) {
      this.onHibernateCallback(tabId, tab);
    }
    return true;
  }

  wakeTab(tabId) {
    const tab = this.tabStates.get(tabId);
    if (!tab) return false;

    const wasHibernated = tab.isHibernated;
    tab.isHibernated = false;
    tab.lastActiveTime = Date.now();
    return wasHibernated;
  }

  getStats() {
    let hibernatedCount = 0;
    let totalTabs = this.tabStates.size;

    for (const tab of this.tabStates.values()) {
      if (tab.isHibernated) hibernatedCount++;
    }

    // Average modern web page takes ~90-140MB of RAM
    const estimatedSavedMb = hibernatedCount * 115;

    return {
      totalTabs,
      hibernatedCount,
      activeCount: totalTabs - hibernatedCount,
      estimatedSavedMb
    };
  }
}

module.exports = { MemoryManager };
