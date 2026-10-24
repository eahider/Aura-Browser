// Privacy & Telemetry Shield for Aura Browser
// Blocks telemetry, tracking scripts, ad pixels, analytics, and strips tracking URL parameters

const TRACKING_DOMAINS = [
  // Analytics & Telemetry
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'stats.g.doubleclick.net',
  'mc.yandex.ru',
  'metrika.yandex.ru',
  'metrika.yandex.net',
  'clck.yandex.ru',
  'clarity.ms',
  'hotjar.com',
  'script.hotjar.com',
  'static.hotjar.com',
  'segment.io',
  'segment.com',
  'api.segment.io',
  'mixpanel.com',
  'api.mixpanel.com',
  'amplitude.com',
  'api.amplitude.com',
  'sentry.io',
  'app.getsentry.com',
  'browser.sentry-cdn.com',
  'newrelic.com',
  'nr-data.net',
  'bam.nr-data.net',
  'scorecardresearch.com',
  'b.scorecardresearch.com',
  'telemetry.microsoft.com',
  'vortex.data.microsoft.com',
  'vortex-win.data.microsoft.com',
  'web.vortex.data.microsoft.com',

  // Social Trackers & Pixels
  'connect.facebook.net',
  'pixel.facebook.com',
  'static.ads-twitter.com',
  'ads-twitter.com',
  'analytics.twitter.com',
  'tr.snapchat.com',
  'sc-static.net',
  'analytics.tiktok.com',
  'ads.tiktok.com',
  'analytics.pinterest.com',
  'ct.pinterest.com',
  'linkedin.com/px',
  'snap.licdn.com',
  'px.ads.linkedin.com',
  'vk.com/rtrg',
  'top-fwz1.mail.ru',

  // Ad Networks & Trackers
  'doubleclick.net',
  'adservice.google.com',
  'pagead2.googlesyndication.com',
  'googleads.g.doubleclick.net',
  'an.yandex.ru',
  'yabs.yandex.ru',
  'criteo.com',
  'static.criteo.net',
  'adnxs.com',
  'ib.adnxs.com',
  'taboola.com',
  'outbrain.com',
  'widgets.outbrain.com',
  'rubiconproject.com',
  'pubmatic.com',
  'casalemedia.com',
  'openx.net',
  'popads.net',
  'smartadserver.com',
  'bidswitch.net',
  'adform.net',
  'moatads.com',
  'iasds.com',
  'adroll.com',
  'zergnet.com'
];

// Tracking query parameters stripped from URLs
const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'gclsrc',
  'fbclid',
  'yclid',
  'ym_debug',
  '_openstat',
  'mc_eid',
  'mc_cid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'vero_id',
  'wickedid',
  'igshid',
  's_kwcid',
  'msclkid',
  'dclid',
  'zen_preview',
  'from_fb',
  'from_vk'
];

class PrivacyShield {
  constructor() {
    this.enabled = true;
    this.blockedCount = 0;
    this.sessionBlocked = new Map(); // tabId -> Array<{url, domain, time, type}>
    this.domainSet = new Set(TRACKING_DOMAINS);
  }

  isTrackingDomain(rawUrl) {
    if (!this.enabled || !rawUrl) return false;
    const protoIdx = rawUrl.indexOf('://');
    if (protoIdx === -1) return false;

    const hostStart = protoIdx + 3;
    let hostEnd = rawUrl.indexOf('/', hostStart);
    if (hostEnd === -1) {
      hostEnd = rawUrl.indexOf('?', hostStart);
      if (hostEnd === -1) hostEnd = rawUrl.length;
    }

    let host = rawUrl.slice(hostStart, hostEnd).toLowerCase();
    const colonIdx = host.indexOf(':');
    if (colonIdx !== -1) host = host.slice(0, colonIdx);

    const parts = host.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      if (this.domainSet.has(parts.slice(i).join('.'))) {
        return true;
      }
    }
    return false;
  }

  isTrackingUrl(rawUrl) {
    if (!this.enabled || !rawUrl) return false;
    const protoIdx = rawUrl.indexOf('://');
    if (protoIdx === -1) return false;

    const hostStart = protoIdx + 3;
    let hostEnd = rawUrl.indexOf('/', hostStart);
    let path = '';
    if (hostEnd === -1) {
      hostEnd = rawUrl.indexOf('?', hostStart);
      if (hostEnd === -1) hostEnd = rawUrl.length;
    } else {
      const qIdx = rawUrl.indexOf('?', hostEnd);
      path = qIdx === -1 ? rawUrl.slice(hostEnd) : rawUrl.slice(hostEnd, qIdx);
    }

    let host = rawUrl.slice(hostStart, hostEnd).toLowerCase();
    const colonIdx = host.indexOf(':');
    if (colonIdx !== -1) host = host.slice(0, colonIdx);

    // Fast O(1) domain lookup on candidate parts
    const parts = host.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      if (this.domainSet.has(parts.slice(i).join('.'))) {
        return true;
      }
    }

    // Check common telemetry/tracking URL paths (only for subresources)
    if (path) {
      const lowerPath = path.toLowerCase();
      if (
        lowerPath.includes('/telemetry') ||
        lowerPath.includes('/collect') ||
        lowerPath.includes('/analytics.js') ||
        lowerPath.includes('/gtag/js') ||
        lowerPath.includes('/matomo.js') ||
        lowerPath.includes('/beacon') ||
        lowerPath.includes('/track.gif') ||
        lowerPath.includes('/pixel.gif')
      ) {
        return true;
      }
    }
    return false;
  }

  recordBlocked(tabId, rawUrl) {
    this.blockedCount++;
    try {
      const parsed = new URL(rawUrl);
      const entry = {
        url: rawUrl,
        domain: parsed.hostname,
        time: new Date().toLocaleTimeString(),
        type: 'Tracker/Telemetry'
      };

      if (!this.sessionBlocked.has(tabId)) {
        this.sessionBlocked.set(tabId, []);
      }
      const list = this.sessionBlocked.get(tabId);
      list.unshift(entry);
      if (list.length > 50) list.pop(); // keep last 50
    } catch {}
  }

  getTabStats(tabId) {
    const list = this.sessionBlocked.get(tabId) || [];
    return {
      tabBlockedCount: list.length,
      totalBlockedCount: this.blockedCount,
      shieldEnabled: this.enabled,
      blockedList: list.slice(0, 20)
    };
  }

  clearTab(tabId) {
    this.sessionBlocked.delete(tabId);
  }

  cleanUrl(targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      let modified = false;

      for (const param of TRACKING_PARAMS) {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.delete(param);
          modified = true;
        }
      }

      return modified ? parsed.toString() : targetUrl;
    } catch {
      return targetUrl;
    }
  }

  toggle(enabled) {
    this.enabled = typeof enabled === 'boolean' ? enabled : !this.enabled;
    return this.enabled;
  }
}

module.exports = {
  PrivacyShield,
  TRACKING_DOMAINS,
  TRACKING_PARAMS
};
