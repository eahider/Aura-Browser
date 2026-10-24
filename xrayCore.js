// Aura Browser - Xray-core process manager
//
// Chromium's proxy stack speaks SOCKS5/HTTP only. VLESS, VMess, Trojan and Shadowsocks
// are not protocols it can use, so those servers are run through a local Xray-core
// instance: Xray listens on 127.0.0.1:<port> as a SOCKS5 proxy and forwards to the
// real server. Chromium is then pointed at that local port like any other SOCKS5 proxy.
//
// The binary is looked up in this order:
//   1. build/xray/xray.exe next to the app (bundled with the installer)
//   2. <userData>/xray/xray.exe (downloaded on first use)
// If neither exists, download() fetches the official release into userData.

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawn, execFile } = require('child_process');

const XRAY_VERSION = 'v26.10.21';
const DOWNLOAD_HOST = 'github.com';
const DOWNLOAD_PATH = `/XTLS/Xray-core/releases/download/${XRAY_VERSION}/Xray-windows-64.zip`;

const BINARY_NAME = process.platform === 'win32' ? 'xray.exe' : 'xray';

class XrayCore {
  constructor() {
    this.process = null;
    this.port = 19878;
    this.configPath = null;
    this.isRunning = false;
    this.binaryPath = null;
    this.lastError = null;
    this.activeServerId = null;
    this.logBuffer = [];
  }

  // ---------- binary discovery ----------

  getBundledPath() {
    // When packaged in an asar archive, binaries cannot be executed from inside
    // app.asar because the OS kernel requires a real filesystem path.
    // electron-builder unpacks files in "asarUnpack" into `app.asar.unpacked`.
    const isAsar = __dirname.includes('app.asar');
    const unpackedDir = isAsar
      ? __dirname.replace('app.asar', 'app.asar.unpacked')
      : __dirname;

    const resPath = process.resourcesPath || '';
    const candidates = [
      path.join(unpackedDir, 'build', 'xray', BINARY_NAME),
      path.join(unpackedDir, 'xray', BINARY_NAME),
      path.join(resPath, 'app.asar.unpacked', 'build', 'xray', BINARY_NAME),
      path.join(resPath, 'app.asar.unpacked', 'xray', BINARY_NAME),
      path.join(resPath, 'build', 'xray', BINARY_NAME),
      path.join(resPath, 'xray', BINARY_NAME)
    ];

    // Only allow dev paths if not running from inside an asar archive
    if (!isAsar) {
      candidates.push(
        path.join(__dirname, 'build', 'xray', BINARY_NAME),
        path.join(__dirname, 'xray', BINARY_NAME)
      );
    }

    for (let candidate of candidates) {
      if (!candidate) continue;
      // Guarantee that no path inside app.asar is ever returned
      if (candidate.includes('app.asar') && !candidate.includes('app.asar.unpacked')) {
        candidate = candidate.replace('app.asar', 'app.asar.unpacked');
      }
      try {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch {}
    }
    return null;
  }

  getUserDataDir() {
    let base;
    try {
      const { app } = require('electron');
      base = app.getPath('userData');
    } catch {
      base = path.join(os.homedir(), '.aura-browser');
    }
    return path.join(base, 'xray');
  }

  getUserDataPath() {
    return path.join(this.getUserDataDir(), BINARY_NAME);
  }

  resolveBinary() {
    let bundled = this.getBundledPath();
    if (bundled) {
      if (bundled.includes('app.asar') && !bundled.includes('app.asar.unpacked')) {
        bundled = bundled.replace('app.asar', 'app.asar.unpacked');
      }
      this.binaryPath = bundled;
      return bundled;
    }
    const downloaded = this.getUserDataPath();
    if (fs.existsSync(downloaded)) {
      this.binaryPath = downloaded;
      return downloaded;
    }
    return null;
  }

  isAvailable() {
    return !!this.resolveBinary();
  }

  // ---------- download ----------

  download(onProgress) {
    return new Promise((resolve, reject) => {
      const dir = this.getUserDataDir();
      fs.mkdirSync(dir, { recursive: true });
      const zipPath = path.join(dir, 'xray.zip');

      const follow = (url, redirects = 0) => {
        if (redirects > 5) return reject(new Error('Too many redirects while downloading Xray-core'));

        https.get(url, {
          headers: { 'User-Agent': 'AuraBrowser/1.0', 'Accept': 'application/octet-stream' },
          timeout: 30000
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return follow(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`Xray-core download failed with status ${res.statusCode}`));
          }

          const total = parseInt(res.headers['content-length'] || '0', 10);
          let received = 0;
          const out = fs.createWriteStream(zipPath);

          res.on('data', chunk => {
            received += chunk.length;
            if (onProgress && total > 0) {
              onProgress(Math.round((received / total) * 100));
            }
          });
          res.pipe(out);

          out.on('finish', () => {
            out.close(() => extractZip(zipPath, dir).then(resolve).catch(reject));
          });
          out.on('error', reject);
        }).on('error', reject).on('timeout', function () {
          this.destroy();
          reject(new Error('Xray-core download timed out'));
        });
      };

      follow(`https://${DOWNLOAD_HOST}${DOWNLOAD_PATH}`);
    });
  }

  // ---------- config generation ----------

  // Builds a single Xray config with a local SOCKS5 inbound and one outbound
  // for the selected server. `tag` on the outbound lets us switch servers by
  // rewriting the config instead of restarting the process.
  buildConfig(server, socksPort = this.port) {
    if (!server) throw new Error('No server selected for Xray-core');

    if (server.fullConfig) {
      const cfg = JSON.parse(JSON.stringify(server.fullConfig));
      cfg.inbounds = [{
        tag: 'socks-in',
        listen: '127.0.0.1',
        port: socksPort,
        protocol: 'socks',
        settings: { auth: 'noauth', udp: true },
        sniffing: { enabled: true, destOverride: ['http', 'tls'] }
      }];
      return cfg;
    }

    const streamSettings = this.buildStreamSettings(server);
    const outbound = {
      tag: 'proxy',
      protocol: this.xrayProtocol(server),
      settings: this.buildOutboundSettings(server),
      streamSettings
    };

    return {
      log: { loglevel: 'warning' },
      inbounds: [{
        tag: 'socks-in',
        listen: '127.0.0.1',
        port: socksPort,
        protocol: 'socks',
        settings: { auth: 'noauth', udp: true },
        sniffing: { enabled: true, destOverride: ['http', 'tls'] }
      }],
      outbounds: [
        outbound,
        { tag: 'direct', protocol: 'freedom', settings: {} },
        { tag: 'block', protocol: 'blackhole', settings: {} }
      ],
      routing: {
        domainStrategy: 'AsIs',
        rules: [
          { type: 'field', ip: ['geoip:private'], outboundTag: 'direct' }
        ]
      }
    };
  }

  xrayProtocol(server) {
    switch ((server.protocol || '').toUpperCase()) {
      case 'VLESS': return 'vless';
      case 'VMESS': return 'vmess';
      case 'TROJAN': return 'trojan';
      case 'SHADOWSOCKS': return 'shadowsocks';
      default: throw new Error(`Protocol ${server.protocol} cannot be handled by Xray-core`);
    }
  }

  buildOutboundSettings(server) {
    const proto = this.xrayProtocol(server);

    if (proto === 'vless') {
      const enc = (server.encryption && server.encryption !== 'auto') ? server.encryption : 'none';
      const user = { id: server.uuid, encryption: enc };
      if (server.flow) user.flow = server.flow;
      return { vnext: [{ address: server.host, port: server.port, users: [user] }] };
    }

    if (proto === 'vmess') {
      return {
        vnext: [{
          address: server.host,
          port: server.port,
          users: [{
            id: server.uuid,
            alterId: 0,
            security: server.encryption || 'auto'
          }]
        }]
      };
    }

    if (proto === 'trojan') {
      return {
        servers: [{
          address: server.host,
          port: server.port,
          password: server.password
        }]
      };
    }

    if (proto === 'shadowsocks') {
      return {
        servers: [{
          address: server.host,
          port: server.port,
          method: server.encryption || 'aes-256-gcm',
          password: server.password
        }]
      };
    }

    throw new Error(`Unsupported protocol: ${server.protocol}`);
  }

  buildStreamSettings(server) {
    const security = (server.security || 'none').toLowerCase();
    const network = (server.network || 'tcp').toLowerCase();

    const stream = { network: network === 'h2' ? 'http' : network };

    // --- transport layer ---
    if (stream.network === 'ws') {
      stream.wsSettings = {
        path: server.wsPath || '/',
        headers: server.wsHost ? { Host: server.wsHost } : {}
      };
    } else if (stream.network === 'grpc') {
      stream.grpcSettings = {
        serviceName: server.grpcServiceName || '',
        multiMode: false
      };
    } else if (stream.network === 'http') {
      stream.httpSettings = {
        host: server.wsHost ? [server.wsHost] : [],
        path: server.wsPath || '/'
      };
    } else if (stream.network === 'tcp' && server.headerType === 'http') {
      stream.tcpSettings = {
        header: {
          type: 'http',
          request: {
            path: [server.wsPath || '/'],
            headers: server.wsHost ? { Host: [server.wsHost] } : {}
          }
        }
      };
    } else if (stream.network === 'kcp') {
      stream.kcpSettings = { header: { type: server.headerType || 'none' } };
    }

    // --- security layer ---
    if (security === 'tls') {
      stream.security = 'tls';
      stream.tlsSettings = {
        serverName: server.sni || server.wsHost || server.host,
        allowInsecure: false
      };
      if (server.alpn) {
        stream.tlsSettings.alpn = server.alpn.split(',').map(a => a.trim()).filter(Boolean);
      }
      if (server.fingerprint) {
        stream.tlsSettings.fingerprint = server.fingerprint;
      }
    } else if (security === 'reality') {
      stream.security = 'reality';
      stream.realitySettings = {
        serverName: server.sni || server.host,
        publicKey: server.realityPublicKey,
        shortId: server.realityShortId || '',
        spiderX: server.realitySpiderX || '/',
        fingerprint: server.fingerprint || 'chrome'
      };
    } else {
      stream.security = 'none';
    }

    return stream;
  }

  // ---------- process lifecycle ----------

  writeConfig(server, socksPort = this.port) {
    const dir = this.getUserDataDir();
    fs.mkdirSync(dir, { recursive: true });
    const configPath = path.join(dir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.buildConfig(server, socksPort), null, 2), 'utf-8');
    this.configPath = configPath;
    return configPath;
  }

  // Verifies the config is accepted by the binary before we rely on it.
  validateConfig(server) {
    return new Promise((resolve) => {
      const binary = this.resolveBinary();
      if (!binary) return resolve({ ok: false, error: 'Xray-core binary not found' });

      const dir = this.getUserDataDir();
      fs.mkdirSync(dir, { recursive: true });
      const tmpConfig = path.join(dir, 'config.check.json');
      try {
        fs.writeFileSync(tmpConfig, JSON.stringify(this.buildConfig(server, this.port), null, 2), 'utf-8');
      } catch (err) {
        return resolve({ ok: false, error: err.message });
      }

      const binaryDir = path.dirname(binary);
      execFile(binary, ['run', '-test', '-config', tmpConfig], {
        cwd: binaryDir,
        timeout: 10000,
        env: {
          ...process.env,
          xray_location_asset: binaryDir,
          XRAY_LOCATION_ASSET: binaryDir
        }
      }, (err, stdout, stderr) => {
        const output = `${stdout || ''}${stderr || ''}`.trim();
        if (err) {
          resolve({ ok: false, error: output || err.message });
        } else {
          resolve({ ok: true, output });
        }
      });
    });
  }

  async start(server, preferredPort = 19878) {
    if (this.isRunning && this.process && !this.process.killed) {
      return { success: true, port: this.port, reused: true };
    }

    const binary = this.resolveBinary();
    if (!binary) {
      this.lastError = 'Xray-core is not installed';
      return { success: false, error: this.lastError, needsDownload: true };
    }

    const port = await this.findFreePort(preferredPort);
    this.port = port;

    try {
      this.writeConfig(server, port);
    } catch (err) {
      this.lastError = err.message;
      return { success: false, error: err.message };
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const binaryDir = path.dirname(binary);
      try {
        this.process = spawn(binary, ['run', '-config', this.configPath], {
          cwd: binaryDir,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            xray_location_asset: binaryDir,
            XRAY_LOCATION_ASSET: binaryDir
          }
        });
      } catch (err) {
        this.lastError = err.message;
        return finish({ success: false, error: err.message });
      }

      this.logBuffer = [];
      const captureLog = (chunk) => {
        const text = chunk.toString();
        this.logBuffer.push(text);
        if (this.logBuffer.length > 50) this.logBuffer.shift();
      };

      this.process.stdout.on('data', captureLog);
      this.process.stderr.on('data', captureLog);

      this.process.on('error', (err) => {
        this.isRunning = false;
        this.lastError = err.message;
        finish({ success: false, error: err.message });
      });

      this.process.on('exit', (code) => {
        this.isRunning = false;
        this.process = null;
        if (code !== 0 && code !== null) {
          this.lastError = this.logBuffer.join('').trim() || `Xray-core exited with code ${code}`;
        }
      });

      // Poll the SOCKS port until Xray accepts connections.
      const deadline = Date.now() + 8000;
      const probe = () => {
        if (settled) return;
        const net = require('net');
        const socket = new net.Socket();
        socket.setTimeout(400);
        socket.on('connect', () => {
          socket.destroy();
          this.isRunning = true;
          this.activeServerId = server.id;
          this.lastError = null;
          finish({ success: true, port: this.port });
        });
        const retry = () => {
          socket.destroy();
          if (Date.now() > deadline) {
            this.lastError = this.logBuffer.join('').trim() || 'Xray-core did not open its SOCKS port in time';
            return finish({ success: false, error: this.lastError });
          }
          setTimeout(probe, 200);
        };
        socket.on('timeout', retry);
        socket.on('error', retry);
        socket.connect(this.port, '127.0.0.1');
      };
      setTimeout(probe, 250);
    });
  }

  // Switches the active server. Xray has no hot-reload for outbounds, so the
  // process is restarted with a rewritten config.
  async switchServer(server) {
    if (!this.isRunning) {
      return this.start(server);
    }
    if (this.activeServerId === server.id) {
      return { success: true, port: this.port, reused: true };
    }
    this.stop();
    return this.start(server, this.port);
  }

  stop() {
    if (this.process) {
      try {
        this.process.kill();
      } catch {}
      this.process = null;
    }
    this.isRunning = false;
    this.activeServerId = null;
  }

  findFreePort(preferred) {
    return new Promise((resolve) => {
      const net = require('net');
      const tester = net.createServer();
      tester.once('error', () => {
        // Preferred port busy - let the OS pick one.
        const fallback = net.createServer();
        fallback.once('error', () => resolve(preferred));
        fallback.listen(0, '127.0.0.1', () => {
          const port = fallback.address().port;
          fallback.close(() => resolve(port));
        });
      });
      tester.once('listening', () => {
        tester.close(() => resolve(preferred));
      });
      tester.listen(preferred, '127.0.0.1');
    });
  }

  getStatus() {
    return {
      installed: this.isAvailable(),
      running: this.isRunning,
      port: this.port,
      activeServerId: this.activeServerId,
      binaryPath: this.binaryPath,
      lastError: this.lastError
    };
  }
}

// ---------- zip extraction ----------
// Windows 10+ ships tar.exe which handles zip archives, so no extra dependency
// is needed to unpack the official Xray release.
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      return execFile('unzip', ['-o', zipPath, '-d', destDir], (err) => {
        if (err) return reject(new Error(`Failed to extract Xray-core: ${err.message}`));
        resolve();
      });
    }

    execFile('tar', ['-xf', zipPath, '-C', destDir], (err) => {
      if (err) {
        return reject(new Error(`Failed to extract Xray-core: ${err.message}`));
      }
      // The archive contains xray.exe at its root.
      const extracted = path.join(destDir, BINARY_NAME);
      if (!fs.existsSync(extracted)) {
        return reject(new Error('Xray-core archive did not contain the expected binary'));
      }
      try {
        fs.unlinkSync(zipPath);
      } catch {}
      resolve();
    });
  });
}

const xrayCore = new XrayCore();

module.exports = { XrayCore, xrayCore };
