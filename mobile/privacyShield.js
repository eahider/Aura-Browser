// Aura Browser Mobile - Privacy & Telemetry Shield
// O(1) Tracker, Telemetry & Analytics Blocker + Tracking URL Cleaner

export const TRACKING_DOMAINS = [
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
  't.co',
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

export const TRACKING_PARAMS = [
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

export class MobilePrivacyShield {
  constructor() {
    this.enabled = true;
    this.stripParamsEnabled = true;
    this.totalBlockedCount = parseInt(localStorage.getItem('aura_shield_total_blocked') || '0', 10);
    this.sessionBlocked = [];
    this.domainSet = new Set(TRACKING_DOMAINS);
  }

  isTrackingUrl(rawUrl) {
    if (!this.enabled || !rawUrl) return false;
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();
      
      const parts = host.split('.');
      for (let i = 0; i < parts.length - 1; i++) {
        if (this.domainSet.has(parts.slice(i).join('.'))) {
          return true;
        }
      }

      const path = parsed.pathname.toLowerCase();
      if (
        path.includes('/telemetry') ||
        path.includes('/collect') ||
        path.includes('/analytics.js') ||
        path.includes('/gtag/js') ||
        path.includes('/matomo.js') ||
        path.includes('/beacon') ||
        path.includes('/track.gif') ||
        path.includes('/pixel.gif')
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  recordBlocked(rawUrl) {
    this.totalBlockedCount++;
    localStorage.setItem('aura_shield_total_blocked', this.totalBlockedCount.toString());
    try {
      const parsed = new URL(rawUrl);
      const entry = {
        url: rawUrl,
        domain: parsed.hostname,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'Tracker/Telemetry'
      };
      this.sessionBlocked.unshift(entry);
      if (this.sessionBlocked.length > 50) this.sessionBlocked.pop();
    } catch {}
  }

  cleanUrl(targetUrl) {
    if (!this.stripParamsEnabled || !targetUrl) return targetUrl;
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

  getStats() {
    return {
      sessionCount: this.sessionBlocked.length,
      totalCount: this.totalBlockedCount,
      enabled: this.enabled,
      stripParamsEnabled: this.stripParamsEnabled,
      recentBlocked: this.sessionBlocked.slice(0, 15)
    };
  }

  clearSession() {
    this.sessionBlocked = [];
  }

  resetAll() {
    this.sessionBlocked = [];
    this.totalBlockedCount = 0;
    localStorage.setItem('aura_shield_total_blocked', '0');
  }
}
