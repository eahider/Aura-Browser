// Aura Browser - Built-in VPN & Tor Onion Routing Manager
const net = require('net');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const { fetchSubscriptionUrl, parseSubscriptionText } = require('./subscriptionParser');
const { dpiEngine } = require('./dpiEngine');
const { xrayCore } = require('./xrayCore');

const PRESET_VPN_SERVERS = [
  {
    id: 'custom',
    name: 'Custom Proxy / SOCKS5',
    flag: 'PROXY',
    type: 'CUSTOM',
    proxyUrl: '',
    ping: '--'
  }
];

class VpnManager {
  constructor(session) {
    this.session = session;
    this.mode = 'direct'; // 'direct' | 'vpn' | 'tor' | 'bypass'
    this.routingScope = 'browser'; // 'browser' | 'system'
    this.smartBypassEnabled = false;
    this.activeProxyRules = '';
    this.selectedServerId = 'custom';
    this.customProxyUrl = '';
    this.importedServers = [];
    this.subscriptionUrl = '';
    this.subscriptionInfo = null;
    this.torPort = 9050; // standard Tor daemon port (9150 for Tor Browser)
    this.torDetected = false;
    this.torBridges = '';
    this.useTorBridges = false;
    this.torBridgeType = 'obfs4'; // 'obfs4' | 'webtunnel'
    this.currentIpInfo = { ip: 'Detecting...', country: 'Local', isProtected: false };
    this.deviceHwid = '';
    this.lastError = null;
  }

  setDeviceHwid(hwid = '') {
    this.deviceHwid = (hwid || '').trim();
  }

  setImportedServers(servers = [], subUrl = '', subInfo = null) {
    this.importedServers = Array.isArray(servers) ? servers : [];
    this.subscriptionUrl = subUrl || '';
    this.subscriptionInfo = subInfo || null;
  }

  setTorBridges(bridges = '', useBridges = false, bridgeType = 'obfs4') {
    this.torBridges = bridges || '';
    this.useTorBridges = !!useBridges;
    this.torBridgeType = bridgeType || 'obfs4';
  }

  parseBridges(rawText = '') {
    const lines = (rawText || '').split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const parsed = [];
    let detectedType = this.torBridgeType || 'obfs4';

    for (const line of lines) {
      if (/^(here|these|bridge|#|\/\/|\*|-)/i.test(line) && !line.startsWith('obfs4 ') && !line.startsWith('webtunnel ') && !line.startsWith('Bridge ')) {
        continue;
      }

      let cleanLine = line.replace(/^Bridge\s+/i, '').trim();

      if (cleanLine.startsWith('obfs4 ')) {
        const parts = cleanLine.split(/\s+/);
        parsed.push({
          type: 'obfs4',
          address: parts[1] || '',
          fingerprint: parts[2] || '',
          raw: cleanLine
        });
        detectedType = 'obfs4';
      } else if (cleanLine.startsWith('webtunnel ')) {
        const parts = cleanLine.split(/\s+/);
        parsed.push({
          type: 'webtunnel',
          address: parts[1] || '',
          fingerprint: parts[2] || '',
          raw: cleanLine
        });
        detectedType = 'webtunnel';
      } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+/.test(cleanLine)) {
        parsed.push({
          type: detectedType || 'obfs4',
          address: cleanLine.split(/\s+/)[0],
          raw: `${detectedType || 'obfs4'} ${cleanLine}`
        });
      }
    }

    return {
      valid: parsed.length > 0,
      count: parsed.length,
      bridges: parsed,
      type: detectedType,
      formattedText: parsed.map(b => b.raw).join('\n')
    };
  }

  generateTorrc() {
    let content = `# Aura Browser - Tor Configuration\nSocksPort ${this.torPort}\nAvoidDiskWrites 1\n`;
    if (this.useTorBridges && this.torBridges) {
      const parsed = this.parseBridges(this.torBridges);
      if (parsed.valid) {
        content += `UseBridges 1\n`;
        if (parsed.type === 'obfs4') {
          content += `ClientTransportPlugin obfs4 exec obfs4proxy\n`;
        } else if (parsed.type === 'webtunnel') {
          content += `ClientTransportPlugin webtunnel exec webtunnel\n`;
        }
        for (const b of parsed.bridges) {
          content += `Bridge ${b.raw}\n`;
        }
      }
    }
    return content;
  }

  async importSubscription(urlOrConfig, customTitle = '') {
    this.lastError = null;
    const input = (urlOrConfig || '').trim();
    if (!input) {
      throw new Error('Please enter a subscription link or config keys');
    }

    let servers = [];
    let headersInfo = null;

    if (input.startsWith('http://') || input.startsWith('https://')) {
      this.subscriptionUrl = input;
      const res = await fetchSubscriptionUrl(input, this.deviceHwid);
      const rawText = typeof res === 'string' ? res : (res.rawText || '');
      headersInfo = typeof res === 'object' ? res.headers : null;

      if (headersInfo && headersInfo.hwidNotSupported) {
        throw new Error('Сервер VPN-подписки требует поддержку привязки по HWID (Happ/INCY). Браузер настроил отправку HWID, но сервер отклонил запрос.');
      }
      if (headersInfo && headersInfo.hwidLimitReached) {
        throw new Error('Достигнут лимит устройств по вашей подписке. Сбросьте привязку устройств в Telegram-боте вашего VPN (команда /devices или кнопка «Сбросить устройства»), либо увеличьте лимит.');
      }

      servers = parseSubscriptionText(rawText);
    } else {
      servers = parseSubscriptionText(input);
    }

    if (servers.length === 0) {
      throw new Error('No valid proxy servers found in this subscription');
    }

    this.importedServers = servers;
    if (servers[0]) {
      this.selectedServerId = servers[0].id;
    }

    // Determine clean subscription title
    let subTitle = (customTitle || '').trim();
    if (!subTitle && headersInfo && headersInfo.title) {
      subTitle = headersInfo.title;
    }
    if (!subTitle && servers[0] && servers[0].name) {
      const parts = servers[0].name.split(/[\s|]+/);
      if (parts[0] && parts[0].length > 2) subTitle = `${parts[0]} VPN`;
    }
    if (!subTitle) subTitle = 'VPN Subscription';

    this.subscriptionInfo = {
      url: this.subscriptionUrl,
      title: subTitle,
      serverCount: servers.length,
      lastUpdated: Date.now(),
      upload: headersInfo?.upload || 0,
      download: headersInfo?.download || 0,
      total: headersInfo?.total || 0,
      expire: headersInfo?.expire || null,
      remainingDays: headersInfo?.remainingDays ?? null,
      trafficText: headersInfo?.trafficText || ''
    };

    return {
      success: true,
      count: servers.length,
      subscriptionUrl: this.subscriptionUrl,
      subscriptionInfo: this.subscriptionInfo,
      servers,
      needsXrayCount: servers.filter(s => s.needsXray).length,
      xrayInstalled: xrayCore.isAvailable()
    };
  }

  async updateSubscription() {
    if (!this.subscriptionUrl) {
      throw new Error('No saved subscription URL to update');
    }
    const currentTitle = this.subscriptionInfo?.title || '';
    return this.importSubscription(this.subscriptionUrl, currentTitle);
  }

  deleteSubscription() {
    this.importedServers = [];
    this.subscriptionUrl = '';
    this.subscriptionInfo = null;
    this.selectedServerId = 'custom';
    return { success: true };
  }

  async pingAllServers(concurrency = 6) {
    if (!this.importedServers || this.importedServers.length === 0) {
      return { success: true, servers: [] };
    }

    const pingSingle = (server, timeout = 2500) => {
      return new Promise((resolve) => {
        if (!server || !server.host || !server.port) {
          return resolve({ id: server?.id, ping: '--', pingValue: 9999 });
        }
        const start = Date.now();
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        let settled = false;
        const done = (ms, str) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          server.ping = str;
          server.pingValue = ms;
          resolve({ id: server.id, ping: str, pingValue: ms });
        };

        socket.connect(server.port, server.host, () => {
          const ms = Date.now() - start;
          done(ms, `${ms}ms`);
        });

        socket.on('error', () => done(9999, 'timeout'));
        socket.on('timeout', () => done(9999, 'timeout'));
      });
    };

    const results = [];
    const queue = [...this.importedServers];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        const res = await pingSingle(item);
        results.push(res);
      }
    });

    await Promise.all(workers);
    return { success: true, servers: this.importedServers, results };
  }

  getServers() {
    const list = [];
    // Add imported subscription servers first
    this.importedServers.forEach(s => {
      list.push(s);
    });

    // Add preset fallbacks
    PRESET_VPN_SERVERS.forEach(s => {
      if (s.id === 'custom') {
        list.push({ ...s, proxyUrl: this.customProxyUrl });
      } else {
        list.push(s);
      }
    });

    return list;
  }

  getStatus() {
    const parsed = this.parseBridges(this.torBridges);
    return {
      mode: this.mode,
      routingScope: this.routingScope,
      smartBypassEnabled: this.smartBypassEnabled,
      selectedServerId: this.selectedServerId,
      customProxyUrl: this.customProxyUrl,
      subscriptionUrl: this.subscriptionUrl,
      subscriptionInfo: this.subscriptionInfo,
      importedCount: this.importedServers.length,
      torPort: this.torPort,
      torDetected: this.torDetected,
      torBridges: this.torBridges,
      useTorBridges: this.useTorBridges,
      torBridgeType: this.torBridgeType,
      bridgesCount: parsed.count,
      currentIpInfo: this.currentIpInfo,
      xray: xrayCore.getStatus(),
      lastError: this.lastError
    };
  }

  setRoutingScope(scope) {
    if (scope === 'system' || scope === 'browser') {
      this.routingScope = scope;
      if (this.mode === 'vpn' && this.activeProxyRules) {
        if (scope === 'system') {
          this.applySystemProxy(this.activeProxyRules);
        } else {
          this.removeSystemProxy();
        }
      } else if (this.mode === 'tor') {
        if (scope === 'system') {
          this.applySystemProxy(`socks5://127.0.0.1:${this.torPort || 9050}`);
        } else {
          this.removeSystemProxy();
        }
      } else if (this.mode === 'bypass') {
        if (scope === 'system') {
          this.applySystemProxy(`http://127.0.0.1:${dpiEngine.port || 19877}`);
        } else {
          this.removeSystemProxy();
        }
      }
    }
    return this.routingScope;
  }

  applySystemProxy(proxyUrl) {
    if (process.platform !== 'win32' || !proxyUrl) return false;
    try {
      let formatted = proxyUrl.replace(/^(socks5?:\/\/|https?:\/\/)/i, '');
      if (proxyUrl.startsWith('socks')) {
        formatted = `socks=${formatted}`;
      }
      const psCmd = `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 1 -Type DWord; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyServer -Value '${formatted}' -Type String; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyOverride -Value '<local>;localhost;127.0.0.1' -Type String;`;
      exec(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, () => {});
      return true;
    } catch (e) {
      console.warn('Could not apply system proxy:', e);
      return false;
    }
  }

  removeSystemProxy() {
    if (process.platform !== 'win32') return false;
    try {
      const psCmd = `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 0 -Type DWord;`;
      exec(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, () => {});
      return true;
    } catch {
      return false;
    }
  }

  generateSmartBypassPac() {
    let chainParts = [];

    // 1. Built-in In-Process DPI Bypass Engine (zero downloads, instant unthrottled bypass)
    const dpiPort = (dpiEngine && dpiEngine.isRunning && dpiEngine.port) ? dpiEngine.port : 19877;
    chainParts.push(`PROXY 127.0.0.1:${dpiPort}`);

    // 2. Try selected server or imported servers
    const allServers = this.getServers();
    let preferred = null;
    if (this.selectedServerId && this.selectedServerId !== 'custom') {
      preferred = allServers.find(s => s.id === this.selectedServerId);
    }
    if (!preferred && this.importedServers.length > 0) {
      preferred = this.importedServers[0];
    }

    if (preferred && preferred.proxyUrl) {
      const formatted = preferred.proxyUrl.replace(/^(socks5?:\/\/|https?:\/\/)/i, '');
      if (preferred.proxyUrl.startsWith('socks')) {
        chainParts.push(`SOCKS5 ${formatted}`);
      } else {
        chainParts.push(`PROXY ${formatted}`);
      }
    }

    if (this.customProxyUrl) {
      const formatted = this.customProxyUrl.replace(/^(socks5?:\/\/|https?:\/\/)/i, '');
      if (this.customProxyUrl.startsWith('socks')) {
        chainParts.push(`SOCKS5 ${formatted}`);
      } else {
        chainParts.push(`PROXY ${formatted}`);
      }
    }

    // 3. Fallbacks: Tor (9050, 9150), then DIRECT
    chainParts.push(`SOCKS5 127.0.0.1:${this.torPort || 9050}`);
    chainParts.push(`SOCKS5 127.0.0.1:9150`);
    chainParts.push('DIRECT');

    const proxyChain = chainParts.join('; ');

    return `
      function FindProxyForURL(url, host) {
        // 1. Direct Telegram DC IP ranges check (AS44907 / AS62041)
        if (
          isInNet(host, "149.154.160.0", "255.255.240.0") ||
          isInNet(host, "91.108.4.0", "255.255.252.0") ||
          isInNet(host, "91.108.8.0", "255.255.252.0") ||
          isInNet(host, "91.108.12.0", "255.255.252.0") ||
          isInNet(host, "91.108.16.0", "255.255.252.0") ||
          isInNet(host, "91.108.56.0", "255.255.252.0")
        ) {
          return "${proxyChain}";
        }

        var bypassList = [
          // YouTube & Google Video CDN
          "googlevideo.com", "youtube.com", "youtu.be", "ytimg.com", "ggpht.com",
          "gvt1.com", "gvt2.com", "youtube-nocookie.com", "youtubekids.com",
          "youtubei.googleapis.com", "yt3.ggpht.com", "yt4.ggpht.com", "wide-youtube.l.google.com",
          "jnn-pa.googleapis.com", "play.google.com", "googleusercontent.com", "video.google.com",

          // Discord Web, Gateway, CDN & Voice
          "discord.com", "discord.gg", "discordapp.com", "discordapp.net", "discord.media",
          "discordstatus.com", "gateway.discord.gg", "discord.co", "discordapp.io",
          "cdn.discordapp.com", "media.discordapp.net",

          // Telegram Web, CDNs, WebSockets & Shortlinks
          "telegram.org", "t.me", "web.telegram.org", "webk.telegram.org", "weba.telegram.org",
          "telesco.pe", "stel.com", "telegram.me", "telegram.dog", "telegra.ph", "graph.org",
          "quiz.directory", "telegram-cdn.org", "cdn-telegram.org", "tdesktop.com",

          // Social & other blocked resources
          "x.com", "twitter.com", "t.co", "twimg.com", "instagram.com", "cdninstagram.com",
          "facebook.com", "fbcdn.net", "notion.so", "rutracker.org", "nnmclub.to"
        ];

        for (var i = 0; i < bypassList.length; i++) {
          var domain = bypassList[i];
          if (host === domain || dnsDomainIs(host, "." + domain) || shExpMatch(host, "*." + domain)) {
            return "${proxyChain}";
          }
        }
        return "DIRECT";
      }
    `;
  }

  async applySmartBypassPac() {
    try {
      if (this.smartBypassEnabled && (!dpiEngine.isRunning || !dpiEngine.server)) {
        await dpiEngine.start().catch(err => console.warn('DPI engine startup error:', err));
      }
      const pac = this.generateSmartBypassPac();
      const pacDataUrl = `data:application/x-ns-proxy-autoconfig;base64,${Buffer.from(pac, 'utf-8').toString('base64')}`;
      await this.session.setProxy({
        pacScript: pacDataUrl
      });
      return true;
    } catch (err) {
      console.warn('Failed to apply Smart Bypass PAC:', err);
      return false;
    }
  }

  async toggleSmartBypass(enabled) {
    this.smartBypassEnabled = typeof enabled === 'boolean' ? enabled : !this.smartBypassEnabled;

    if (this.smartBypassEnabled) {
      try {
        await dpiEngine.start();
      } catch (e) {
        console.warn('DpiEngine start error:', e);
      }
      await this.applySmartBypassPac();
      this.mode = 'bypass';
      if (this.routingScope === 'system') {
        this.applySystemProxy(`http://127.0.0.1:${dpiEngine.port || 19877}`);
      }
    } else {
      dpiEngine.stop();
      this.removeSystemProxy();
      if (this.mode === 'bypass') {
        await this.session.setProxy({ mode: 'direct' });
        this.mode = 'direct';
      }
    }

    return this.getBypassStatus();
  }

  getBypassStatus() {
    return {
      enabled: this.smartBypassEnabled,
      mode: this.mode,
      services: ['YouTube', 'Discord', 'Telegram', 'X / Twitter', 'Instagram'],
      hasProxyTarget: true,
      dpiRunning: dpiEngine.isRunning,
      dpiPort: dpiEngine.port
    };
  }

  async checkTorPort(port = this.torPort) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(800);
      socket.on('connect', () => {
        socket.destroy();
        this.torDetected = true;
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  async enableVpn(serverId = 'custom', customUrl = '', scope = this.routingScope) {
    this.lastError = null;
    let targetProxy = '';
    let server = null;

    if (serverId === 'custom') {
      targetProxy = customUrl.trim();
      this.customProxyUrl = targetProxy;
    } else {
      // Look in imported servers first, then presets
      const allServers = this.getServers();
      server = allServers.find(s => s.id === serverId);
      if (server) {
        targetProxy = server.proxyUrl;
      }
    }

    // VLESS / VMess / Trojan / Shadowsocks cannot be spoken by Chromium directly.
    // They are tunnelled through a local Xray-core SOCKS5 inbound instead.
    if (server && server.needsXray) {
      return this.enableViaXray(server, scope);
    }

    if (!targetProxy) {
      this.lastError = 'No proxy URL specified';
      return false;
    }

    try {
      this.selectedServerId = serverId;
      this.activeProxyRules = targetProxy;
      if (scope) this.routingScope = scope;

      // A direct proxy replaces any running Xray tunnel.
      if (xrayCore.isRunning) {
        xrayCore.stop();
      }

      await this.session.setProxy({
        proxyRules: targetProxy,
        proxyBypassRules: '<local>'
      });

      if (this.routingScope === 'system') {
        this.applySystemProxy(targetProxy);
      } else {
        this.removeSystemProxy();
      }

      // Prevent WebRTC IP leaks when VPN is active
      if (typeof this.session.setWebRTCIPHandlingPolicy === 'function') {
        this.session.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }

      this.mode = 'vpn';
      this.currentIpInfo.isProtected = true;
      this.refreshIpAsync();
      return true;
    } catch (err) {
      this.lastError = err.message;
      return false;
    }
  }

  // Starts (or reuses) Xray-core for the given server and points the session at
  // its local SOCKS5 port.
  async enableViaXray(server, scope = this.routingScope) {
    try {
      if (scope) this.routingScope = scope;

      const started = xrayCore.isRunning && xrayCore.activeServerId === server.id
        ? { success: true, port: xrayCore.port }
        : await xrayCore.switchServer(server);

      if (!started.success) {
        this.lastError = started.error || 'Could not start Xray-core';
        return false;
      }

      const targetProxy = `socks5://127.0.0.1:${started.port}`;
      this.selectedServerId = server.id;
      this.activeProxyRules = targetProxy;

      await this.session.setProxy({
        proxyRules: targetProxy,
        proxyBypassRules: '<local>'
      });

      if (this.routingScope === 'system') {
        this.applySystemProxy(targetProxy);
      } else {
        this.removeSystemProxy();
      }

      if (typeof this.session.setWebRTCIPHandlingPolicy === 'function') {
        this.session.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }

      this.mode = 'vpn';
      this.currentIpInfo.isProtected = true;
      this.refreshIpAsync();
      return true;
    } catch (err) {
      this.lastError = err.message;
      return false;
    }
  }

  async enableTor(port = 9050, scope = this.routingScope) {
    this.lastError = null;
    this.torPort = port;
    if (scope) this.routingScope = scope;

    // Check if port 9050 or 9150 is open
    let isPortOpen = await this.checkTorPort(port);
    let activePort = port;
    if (!isPortOpen) {
      // Try Tor Browser bundle port 9150
      const is9150Open = await this.checkTorPort(9150);
      if (is9150Open) {
        activePort = 9150;
        this.torPort = 9150;
        isPortOpen = true;
      }
    }

    if (!isPortOpen) {
      this.lastError = 'Служба Tor не запущена на порту 9050/9150. Запустите Tor Browser или системную службу Tor.';
      return { success: false, error: this.lastError, torRunning: false };
    }

    try {
      const torProxy = `socks5://127.0.0.1:${activePort}`;
      this.activeProxyRules = torProxy;

      // Configure SOCKS5 with remote DNS resolution to support .onion domains natively!
      await this.session.setProxy({
        proxyRules: torProxy,
        proxyBypassRules: '<local>'
      });

      if (this.routingScope === 'system') {
        this.applySystemProxy(torProxy);
      } else {
        this.removeSystemProxy();
      }

      // Strict leak prevention
      if (typeof this.session.setWebRTCIPHandlingPolicy === 'function') {
        this.session.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }

      this.mode = 'tor';
      this.currentIpInfo.isProtected = true;
      this.refreshIpAsync();
      return { success: true, port: activePort, torRunning: true };
    } catch (err) {
      this.lastError = err.message;
      return { success: false, error: err.message, torRunning: false };
    }
  }

  async disableProxy() {
    try {
      this.removeSystemProxy();
      this.activeProxyRules = '';

      // Tear down the tunnel process as well, otherwise it keeps the port bound.
      if (xrayCore.isRunning) {
        xrayCore.stop();
      }

      if (this.smartBypassEnabled) {
        await this.applySmartBypassPac();
        this.mode = 'bypass';
      } else {
        await this.session.setProxy({ mode: 'direct' });
        this.mode = 'direct';
      }

      if (typeof this.session.setWebRTCIPHandlingPolicy === 'function') {
        this.session.setWebRTCIPHandlingPolicy('default');
      }

      this.currentIpInfo.isProtected = false;
      this.refreshIpAsync();
      return true;
    } catch (err) {
      this.lastError = err.message;
      return false;
    }
  }

  refreshIpAsync() {
    // Fetch IP asynchronously without blocking
    const req = https.get('https://api.ipify.org?format=json', { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.ip) {
            this.currentIpInfo.ip = json.ip;
          }
        } catch {}
      });
    });
    req.on('timeout', () => {
      req.destroy();
    });
    req.on('error', () => {
      // Fallback
    });
  }
}

module.exports = { VpnManager, PRESET_VPN_SERVERS };
