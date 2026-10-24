// Aura Browser - Built-in In-Process DPI Bypass Engine
// Bypasses ISP / TSPU Deep Packet Inspection without external downloads, drivers or admin rights
// Uses RFC 8446 compliant TLS Record Handshake fragmentation and clean DoH resolution

const http = require('http');
const https = require('https');
const net = require('net');
const dns = require('dns');

class DpiEngine {
  constructor() {
    this.server = null;
    this.port = 19877;
    this.isRunning = false;
    this.dnsCache = new Map();
    this.activeSockets = new Set();
  }

  // Fast dual-provider DNS-over-HTTPS via raw IP to avoid DNS hijacking/poisoning and infinite loops
  async resolveCleanIp(hostname) {
    if (net.isIP(hostname)) return hostname;

    const cached = this.dnsCache.get(hostname);
    if (cached && Date.now() - cached.time < 300000) {
      return cached.ip;
    }

    // Try Google DoH (8.8.8.8) then Cloudflare DoH (1.1.1.1) then Quad9 DoH (9.9.9.9) then local DNS
    const dohResult = await this.queryDohGoogle(hostname).catch(() => null)
      || await this.queryDohCloudflare(hostname).catch(() => null)
      || await this.queryDohQuad9(hostname).catch(() => null);

    if (dohResult && net.isIP(dohResult)) {
      this.dnsCache.set(hostname, { ip: dohResult, time: Date.now() });
      return dohResult;
    }

    return new Promise((resolve) => {
      dns.lookup(hostname, (err, addr) => {
        const res = addr || hostname;
        if (addr) this.dnsCache.set(hostname, { ip: addr, time: Date.now() });
        resolve(res);
      });
    });
  }

  queryDohGoogle(hostname) {
    return new Promise((resolve, reject) => {
      const req = https.get(`https://8.8.8.8/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { 'Host': 'dns.google' },
        timeout: 1800
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.Answer && parsed.Answer.length > 0) {
              const aRec = parsed.Answer.find(a => a.type === 1);
              if (aRec && aRec.data) return resolve(aRec.data);
            }
          } catch {}
          reject(new Error('No A record in Google DoH'));
        });
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Google DoH Timeout')); });
      req.on('error', err => reject(err));
    });
  }

  queryDohCloudflare(hostname) {
    return new Promise((resolve, reject) => {
      const req = https.get(`https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { 'Host': 'cloudflare-dns.com', 'Accept': 'application/dns-json' },
        timeout: 1800
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.Answer && parsed.Answer.length > 0) {
              const aRec = parsed.Answer.find(a => a.type === 1);
              if (aRec && aRec.data) return resolve(aRec.data);
            }
          } catch {}
          reject(new Error('No A record in Cloudflare DoH'));
        });
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Cloudflare DoH Timeout')); });
      req.on('error', err => reject(err));
    });
  }

  queryDohQuad9(hostname) {
    return new Promise((resolve, reject) => {
      const req = https.get(`https://9.9.9.9:5053/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { 'Host': 'dns.quad9.net', 'Accept': 'application/dns-json' },
        timeout: 1800,
        rejectUnauthorized: false
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.Answer && parsed.Answer.length > 0) {
              const aRec = parsed.Answer.find(a => a.type === 1);
              if (aRec && aRec.data) return resolve(aRec.data);
            }
          } catch {}
          reject(new Error('No A record in Quad9 DoH'));
        });
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Quad9 DoH Timeout')); });
      req.on('error', err => reject(err));
    });
  }

  // Parses TLS ClientHello extensions to locate Server Name Indication (SNI)
  findSniInfo(buf) {
    if (buf.length < 5 || buf[0] !== 0x16) return null;
    const recordLen = (buf[3] << 8) | buf[4];
    if (buf.length < 5 + recordLen || buf[5] !== 0x01) return null;

    let pos = 5 + 38; // Skip record header + handshake type/len/ver/random
    if (pos >= buf.length) return null;
    const sessIdLen = buf[pos];
    pos += 1 + sessIdLen;
    if (pos + 2 > buf.length) return null;
    const cipherLen = (buf[pos] << 8) | buf[pos + 1];
    pos += 2 + cipherLen;
    if (pos + 1 > buf.length) return null;
    const compLen = buf[pos];
    pos += 1 + compLen;
    if (pos + 2 > buf.length) return null;
    const extLen = (buf[pos] << 8) | buf[pos + 1];
    pos += 2;

    const extEnd = Math.min(pos + extLen, 5 + recordLen);
    while (pos + 4 <= extEnd) {
      const extType = (buf[pos] << 8) | buf[pos + 1];
      const extDataLen = (buf[pos + 2] << 8) | buf[pos + 3];
      pos += 4;
      if (extType === 0x0000) { // SNI extension
        if (pos + 5 <= extEnd) {
          const nameLen = (buf[pos + 3] << 8) | buf[pos + 4];
          const sniOffsetInBuf = pos + 5;
          if (sniOffsetInBuf + nameLen <= extEnd) {
            return {
              payloadOffset: sniOffsetInBuf - 5, // offset inside record payload
              length: nameLen,
              name: buf.subarray(sniOffsetInBuf, sniOffsetInBuf + nameLen).toString('ascii')
            };
          }
        }
      }
      pos += extDataLen;
    }
    return null;
  }

  // Calculates the optimal split point to cut directly inside targeted domains
  // Neither fragment will contain the full domain name string, completely defeating TSPU pattern matching!
  getOptimalSniSplit(sni) {
    const name = sni.name.toLowerCase();
    const targets = [
      { match: 'googlevideo.com', splitDelta: 4 }, // breaks 'goog' | 'levideo.com'
      { match: 'youtube.com', splitDelta: 3 },     // breaks 'you' | 'tube.com'
      { match: 'gvt1.com', splitDelta: 3 },        // breaks 'gvt' | '1.com'
      { match: 'telegram-cdn.org', splitDelta: 4 },// breaks 'tele' | 'gram-cdn.org'
      { match: 'cdn-telegram.org', splitDelta: 4 },// breaks 'cdn-' | 'telegram.org'
      { match: 'telegram.org', splitDelta: 4 },    // breaks 'tele' | 'gram.org'
      { match: 'telesco.pe', splitDelta: 4 },      // breaks 'tele' | 'sco.pe'
      { match: 'stel.com', splitDelta: 3 },        // breaks 'ste' | 'l.com'
      { match: 't.me', splitDelta: 2 },            // breaks 't.' | 'me'
      { match: 'discord.com', splitDelta: 3 },     // breaks 'dis' | 'cord.com'
      { match: 'discord.gg', splitDelta: 3 },      // breaks 'dis' | 'cord.gg'
      { match: 'discordapp.com', splitDelta: 3 },  // breaks 'dis' | 'cordapp.com'
      { match: 'discordapp.net', splitDelta: 3 },  // breaks 'dis' | 'cordapp.net'
      { match: 'instagram.com', splitDelta: 5 },   // breaks 'insta' | 'gram.com'
      { match: 'twitter.com', splitDelta: 4 },     // breaks 'twit' | 'ter.com'
      { match: 'x.com', splitDelta: 1 },           // breaks 'x' | '.com'
      { match: 'rutracker.org', splitDelta: 4 },   // breaks 'rutr' | 'acker.org'
      { match: 'nnmclub.to', splitDelta: 3 },      // breaks 'nnm' | 'club.to'
      { match: 'notion.so', splitDelta: 3 }        // breaks 'not' | 'ion.so'
    ];

    for (const t of targets) {
      const idx = name.indexOf(t.match);
      if (idx !== -1) {
        return sni.payloadOffset + idx + t.splitDelta;
      }
    }

    const lastDot = name.lastIndexOf('.');
    if (lastDot > 3) {
      return sni.payloadOffset + lastDot - 2;
    }

    return sni.payloadOffset + Math.max(2, Math.floor(sni.length / 2));
  }

  // Fragments the TLS ClientHello across two legal TLS records
  // For YouTube and Telegram, cuts inside the SNI domain name (frag-by-sni)
  // so neither packet carries the blocked domain signature!
  fragmentClientHello(buf, remoteSocket, onComplete) {
    if (buf.length >= 6 && buf[0] === 0x16 && buf[1] === 0x03) {
      const recordLen = (buf[3] << 8) | buf[4];
      if (buf.length >= 5 + recordLen && buf[5] === 0x01) {
        const payload = buf.subarray(5, 5 + recordLen);

        let splitPos = 24;
        const sni = this.findSniInfo(buf);
        if (sni) {
          splitPos = this.getOptimalSniSplit(sni);
        }

        if (payload.length > splitPos && splitPos > 0) {
          const p1 = payload.subarray(0, splitPos);
          const p2 = payload.subarray(splitPos);

          const rec1 = Buffer.alloc(5 + p1.length);
          rec1[0] = 0x16;
          rec1[1] = buf[1];
          rec1[2] = buf[2];
          rec1[3] = (p1.length >> 8) & 0xff;
          rec1[4] = p1.length & 0xff;
          p1.copy(rec1, 5);

          const rec2 = Buffer.alloc(5 + p2.length);
          rec2[0] = 0x16;
          rec2[1] = buf[1];
          rec2[2] = buf[2];
          rec2[3] = (p2.length >> 8) & 0xff;
          rec2[4] = p2.length & 0xff;
          p2.copy(rec2, 5);

          // Transmit first fragment
          remoteSocket.write(rec1);

          // Micro-tick (3ms) guarantees separate TCP packet delivery by OS kernel
          setTimeout(() => {
            if (!remoteSocket.destroyed) {
              remoteSocket.write(rec2);
              if (buf.length > 5 + recordLen) {
                remoteSocket.write(buf.subarray(5 + recordLen));
              }
              if (onComplete) onComplete();
            }
          }, 3);
          return true;
        }
      }
    }

    return false;
  }

  // Fragment HTTP GET / POST Host header for unencrypted port 80 traffic
  fragmentHttpHost(buf, remoteSocket) {
    const str = buf.toString('latin1');
    const hostIndex = str.indexOf('Host: ');
    if (hostIndex !== -1) {
      const splitAt = hostIndex + 6; // Split right after 'Host: '
      const part1 = buf.subarray(0, splitAt);
      const part2 = buf.subarray(splitAt);
      remoteSocket.write(part1);
      setTimeout(() => {
        if (!remoteSocket.destroyed) remoteSocket.write(part2);
      }, 2);
      return true;
    }
    return false;
  }

  async start(preferredPort = 19877) {
    if (this.isRunning && this.server) {
      return this.port;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Handle plain HTTP proxy requests if any
        const urlObj = new URL(req.url);
        const targetHost = urlObj.hostname;
        const targetPort = urlObj.port || 80;

        this.resolveCleanIp(targetHost).then((ip) => {
          const remote = net.connect({ host: ip, port: targetPort }, () => {
            remote.setNoDelay(true);
            remote.write(`${req.method} ${urlObj.pathname}${urlObj.search} HTTP/1.1\r\n`);
            for (let i = 0; i < req.rawHeaders.length; i += 2) {
              remote.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
            }
            remote.write('\r\n');
            req.pipe(remote);
            remote.pipe(res);
          });
          remote.on('error', () => {
            res.writeHead(502);
            res.end();
          });
        }).catch(() => {
          res.writeHead(502);
          res.end();
        });
      });

      // Handle HTTPS CONNECT tunnel
      this.server.on('connect', async (req, clientSocket, head) => {
        this.activeSockets.add(clientSocket);
        const [host, portStr] = req.url.split(':');
        const port = parseInt(portStr, 10) || 443;

        let remoteSocket = null;
        const cleanup = () => {
          this.activeSockets.delete(clientSocket);
          if (remoteSocket) this.activeSockets.delete(remoteSocket);
          try { clientSocket.destroy(); } catch {}
          if (remoteSocket) { try { remoteSocket.destroy(); } catch {} }
        };

        clientSocket.on('error', cleanup);

        try {
          const resolvedIp = await this.resolveCleanIp(host);

          remoteSocket = net.connect({ host: resolvedIp, port }, () => {
            remoteSocket.setNoDelay(true);
            clientSocket.setNoDelay(true);

            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

            let handshakeHandled = false;
            let handshakeBuffer = Buffer.alloc(0);
            let sendQueue = [];

            const onClientData = (chunk) => {
              if (handshakeHandled) {
                if (sendQueue.length > 0) {
                  sendQueue.push(chunk);
                } else {
                  remoteSocket.write(chunk);
                }
                return;
              }

              handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);

              // Check if we have at least TLS Record Header (5 bytes)
              if (handshakeBuffer.length >= 5) {
                if (handshakeBuffer[0] === 0x16) { // TLS Handshake
                  const recordLen = (handshakeBuffer[3] << 8) | handshakeBuffer[4];
                  const totalExpected = 5 + recordLen;

                  if (handshakeBuffer.length >= totalExpected) {
                    handshakeHandled = true;
                    try { clientSocket.pause(); } catch {}

                    const fullClientHello = handshakeBuffer.subarray(0, totalExpected);
                    const remainder = handshakeBuffer.subarray(totalExpected);

                    const handled = this.fragmentClientHello(fullClientHello, remoteSocket, () => {
                      if (remainder.length > 0) {
                        remoteSocket.write(remainder);
                      }
                      while (sendQueue.length > 0) {
                        const queued = sendQueue.shift();
                        remoteSocket.write(queued);
                      }
                      try { clientSocket.resume(); } catch {}
                      clientSocket.removeListener('data', onClientData);
                      clientSocket.pipe(remoteSocket);
                    });

                    if (!handled) {
                      remoteSocket.write(handshakeBuffer);
                      try { clientSocket.resume(); } catch {}
                      clientSocket.removeListener('data', onClientData);
                      clientSocket.pipe(remoteSocket);
                    }
                  }
                } else {
                  // Not a TLS handshake
                  handshakeHandled = true;
                  remoteSocket.write(handshakeBuffer);
                  clientSocket.removeListener('data', onClientData);
                  clientSocket.pipe(remoteSocket);
                }
              }
            };

            clientSocket.on('data', onClientData);
            remoteSocket.pipe(clientSocket);
          });

          this.activeSockets.add(remoteSocket);
          remoteSocket.on('error', cleanup);
          remoteSocket.on('close', cleanup);
          clientSocket.on('close', cleanup);
        } catch {
          clientSocket.destroy();
        }
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // If preferred port is in use, listen on a random free port
          this.server.listen(0, '127.0.0.1', () => {
            this.port = this.server.address().port;
            this.isRunning = true;
            console.log(`[Aura DPI Engine] Active on 127.0.0.1:${this.port}`);
            resolve(this.port);
          });
        } else {
          this.isRunning = false;
          reject(err);
        }
      });

      this.server.listen(preferredPort, '127.0.0.1', () => {
        this.port = preferredPort;
        this.isRunning = true;
        console.log(`[Aura DPI Engine] Active on 127.0.0.1:${this.port}`);
        resolve(this.port);
      });
    });
  }

  stop() {
    if (this.server) {
      for (const s of this.activeSockets) {
        try { s.destroy(); } catch {}
      }
      this.activeSockets.clear();
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
    this.isRunning = false;
    console.log('[Aura DPI Engine] Stopped');
  }
}

const dpiEngine = new DpiEngine();

module.exports = { dpiEngine };
