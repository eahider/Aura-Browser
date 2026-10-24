// Aura Browser - VPN Subscription Parser & Loader
// Supports Subscription URLs, Base64 bundles, VLESS, VMess, Shadowsocks, Trojan, SOCKS5, HTTP
//
// Every parsed server keeps its FULL configuration (uuid, security, sni, flow, network,
// ws path/host, reality pbk/sid/fp, ...) plus the original raw URI. The raw URI is what
// gets handed to Xray-core; the flat fields are only used for display and for the
// plain SOCKS5/HTTP case where Chromium can talk to the proxy directly.

const https = require('https');
const http = require('http');

const COUNTRY_FLAGS = [
  { match: ['nl', 'netherlands', 'нидерланды', 'амстердам', 'amsterdam'], flag: 'NL' },
  { match: ['de', 'germany', 'германия', 'франкфурт', 'frankfurt', 'berlin'], flag: 'DE' },
  { match: ['us', 'usa', 'united states', 'сша', 'america', 'ny', 'new york'], flag: 'US' },
  { match: ['fi', 'finland', 'финляндия', 'helsinki'], flag: 'FI' },
  { match: ['gb', 'uk', 'united kingdom', 'великобритания', 'лондон', 'london'], flag: 'GB' },
  { match: ['fr', 'france', 'франция', 'paris'], flag: 'FR' },
  { match: ['jp', 'japan', 'япония', 'tokyo'], flag: 'JP' },
  { match: ['tr', 'turkey', 'турция', 'istanbul'], flag: 'TR' },
  { match: ['sg', 'singapore', 'сингапур'], flag: 'SG' },
  { match: ['pl', 'poland', 'польша', 'warsaw'], flag: 'PL' },
  { match: ['kz', 'kazakhstan', 'казахстан', 'almaty', 'astana'], flag: 'KZ' },
  { match: ['se', 'sweden', 'швеция', 'stockholm'], flag: 'SE' },
  { match: ['ca', 'canada', 'канада', 'toronto'], flag: 'CA' },
  { match: ['ch', 'switzerland', 'швейцария', 'zurich'], flag: 'CH' },
  { match: ['at', 'austria', 'австрия', 'вена', 'vienna'], flag: 'AT' },
  { match: ['es', 'spain', 'испания', 'мадрид', 'madrid', 'барселона', 'barcelona'], flag: 'ES' },
  { match: ['it', 'italy', 'италия', 'рим', 'rome', 'милан', 'milan'], flag: 'IT' },
  { match: ['cz', 'czech', 'чехия', 'прага', 'prague'], flag: 'CZ' },
  { match: ['ee', 'estonia', 'эстония', 'таллин', 'tallinn'], flag: 'EE' },
  { match: ['lv', 'latvia', 'латвия', 'рига', 'riga'], flag: 'LV' },
  { match: ['lt', 'lithuania', 'литва', 'вильнюс', 'vilnius'], flag: 'LT' },
  { match: ['no', 'norway', 'норвегия', 'осло', 'oslo'], flag: 'NO' },
  { match: ['dk', 'denmark', 'дания', 'копенгаген', 'copenhagen'], flag: 'DK' },
  { match: ['ie', 'ireland', 'ирландия', 'дублин', 'dublin'], flag: 'IE' },
  { match: ['hk', 'hong kong', 'гонконг'], flag: 'HK' },
  { match: ['au', 'australia', 'австралия', 'сидней', 'sydney'], flag: 'AU' },
  { match: ['br', 'brazil', 'бразилия'], flag: 'BR' },
  { match: ['ae', 'uae', 'оаэ', 'дубай', 'dubai'], flag: 'AE' },
  { match: ['il', 'israel', 'израиль', 'тель-авив', 'tel aviv'], flag: 'IL' },
  { match: ['in', 'india', 'индия', 'мумбаи', 'mumbai'], flag: 'IN' },
  { match: ['ro', 'romania', 'румыния', 'бухарест', 'bucharest'], flag: 'RO' },
  { match: ['md', 'moldova', 'молдова', 'кишинев', 'chisinau'], flag: 'MD' },
  { match: ['bg', 'bulgaria', 'болгария', 'софия', 'sofia'], flag: 'BG' },
  { match: ['hu', 'hungary', 'венгрия', 'будапешт', 'budapest'], flag: 'HU' },
  { match: ['rs', 'serbia', 'сербия', 'белград', 'belgrade'], flag: 'RS' },
  { match: ['ge', 'georgia', 'грузия', 'тбилиси', 'tbilisi'], flag: 'GE' },
  { match: ['am', 'armenia', 'армения', 'ереван', 'yerevan'], flag: 'AM' },
  { match: ['cy', 'cyprus', 'кипр'], flag: 'CY' }
];

// Protocols that Chromium's proxy stack can speak natively. For these the proxyUrl
// is a real, directly usable proxy. Everything else must go through Xray-core.
const NATIVE_PROXY_PROTOCOLS = ['socks5', 'socks', 'http', 'https'];

// Protocols Xray-core can turn into a local SOCKS5 inbound.
const XRAY_PROTOCOLS = ['vless', 'vmess', 'trojan', 'ss', 'shadowsocks'];

function detectFlag(name = '') {
  const lower = name.toLowerCase();
  for (const item of COUNTRY_FLAGS) {
    for (const kw of item.match) {
      const regex = new RegExp(`(^|[^a-zа-я])${kw}([^a-zа-я]|$)`, 'i');
      if (regex.test(lower) || lower.includes(kw)) {
        return item.flag;
      }
    }
  }
  return 'VPN';
}

function parseSubscriptionHeaders(headers = {}) {
  const info = {
    title: '',
    upload: 0,
    download: 0,
    total: 0,
    expire: null,
    remainingDays: null,
    trafficText: ''
  };

  const rawTitle = headers['profile-title'] || headers['profile-web-page-url'] || '';
  if (rawTitle) {
    if (rawTitle.startsWith('base64:')) {
      try {
        info.title = Buffer.from(rawTitle.slice(7), 'base64').toString('utf8');
      } catch {
        info.title = rawTitle;
      }
    } else {
      try {
        info.title = decodeURIComponent(rawTitle);
      } catch {
        info.title = rawTitle;
      }
    }
  }

  const userinfo = headers['subscription-userinfo'] || '';
  if (userinfo) {
    const parts = userinfo.split(';');
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx !== -1) {
        const k = part.slice(0, idx).trim().toLowerCase();
        const v = part.slice(idx + 1).trim();
        const num = parseInt(v, 10);
        if (k === 'upload' && !isNaN(num)) info.upload = num;
        if (k === 'download' && !isNaN(num)) info.download = num;
        if (k === 'total' && !isNaN(num)) info.total = num;
        if (k === 'expire' && !isNaN(num)) info.expire = num;
      }
    }

    const usedBytes = info.upload + info.download;
    const usedGb = (usedBytes / (1024 ** 3)).toFixed(1);
    const totalGb = info.total > 0 ? `${(info.total / (1024 ** 3)).toFixed(1)} GB` : '∞';
    info.trafficText = `${usedGb} GB / ${totalGb}`;

    if (info.expire && info.expire > 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      const diffSec = info.expire - nowSec;
      info.remainingDays = Math.max(0, Math.ceil(diffSec / 86400));
    }
  }

  info.hwidActive = headers['x-hwid-active'] === 'true';
  info.hwidNotSupported = headers['x-hwid-not-supported'] === 'true';
  info.hwidLimitReached = headers['x-hwid-limit'] === 'true' || headers['x-hwid-max-devices-reached'] === 'true';

  return info;
}

function fetchSingleUrl(targetUrl, timeout = 12000, hwid = '') {
  return new Promise((resolve, reject) => {
    const client = targetUrl.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'Happ/3.4.0 v2rayN/6.23 ClashforWindows/0.20.39 AuraBrowser/1.0',
      'Accept': '*/*'
    };
    if (hwid) {
      headers['x-hwid'] = hwid;
      headers['x-device-os'] = process.platform === 'win32' ? 'Windows' : (process.platform === 'darwin' ? 'macOS' : 'Linux');
      headers['x-device-model'] = 'PC';
    }

    const req = client.get(targetUrl, {
      timeout,
      headers
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectLoc = res.headers.location;
        if (!redirectLoc.startsWith('http')) {
          try {
            const u = new URL(targetUrl);
            redirectLoc = new URL(redirectLoc, u.origin).toString();
          } catch {}
        }
        return resolve(fetchSingleUrl(redirectLoc, timeout, hwid));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Subscription server responded with status: ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const headersInfo = parseSubscriptionHeaders(res.headers);
        resolve({
          rawText: data.trim(),
          headers: headersInfo
        });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Subscription download timed out (${Math.round(timeout / 1000)}s)`));
    });
  });
}

async function fetchSubscriptionUrl(url, hwid = '') {
  try {
    return await fetchSingleUrl(url, 15000, hwid);
  } catch (err) {
    // If blocked by TSPU/DPI in Russia (e.g. ru.easygosub.com), auto-fallback to Cloudflare mirror
    if (url.includes('ru.') || err.code === 'ECONNRESET' || (err.message && err.message.includes('timed out'))) {
      const mirrorUrl = url.replace('://ru.', '://');
      if (mirrorUrl !== url) {
        try {
          return await fetchSingleUrl(mirrorUrl, 18000, hwid);
        } catch {}
      }
    }
    throw err;
  }
}

// ==================== URI PARSING ====================

function safeDecode(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Splits "host:port" tolerating IPv6 literals like [::1]:443
function splitHostPort(input = '') {
  const str = input.trim();
  if (str.startsWith('[')) {
    const close = str.indexOf(']');
    if (close !== -1) {
      const host = str.slice(1, close);
      const rest = str.slice(close + 1).replace(/^:/, '');
      return { host, port: parseInt(rest, 10) || 0 };
    }
  }
  const idx = str.lastIndexOf(':');
  if (idx === -1) return { host: str, port: 0 };
  return { host: str.slice(0, idx), port: parseInt(str.slice(idx + 1), 10) || 0 };
}

function makeServer(fields) {
  const name = fields.name || 'Server';
  return {
    id: fields.id,
    name,
    flag: detectFlag(name),
    protocol: fields.protocol,
    host: fields.host,
    port: fields.port,
    // Full transport configuration - required by Xray-core
    uuid: fields.uuid || '',
    password: fields.password || '',
    security: fields.security || '',
    encryption: fields.encryption || '',
    flow: fields.flow || '',
    sni: fields.sni || '',
    alpn: fields.alpn || '',
    fingerprint: fields.fingerprint || '',
    network: fields.network || 'tcp',
    headerType: fields.headerType || '',
    wsPath: fields.wsPath || '',
    wsHost: fields.wsHost || '',
    grpcServiceName: fields.grpcServiceName || '',
    realityPublicKey: fields.realityPublicKey || '',
    realityShortId: fields.realityShortId || '',
    realitySpiderX: fields.realitySpiderX || '',
    // Original URI - passed verbatim to Xray-core
    rawUri: fields.rawUri || '',
    // Only set for protocols Chromium can use directly
    proxyUrl: fields.proxyUrl || '',
    needsXray: !!fields.needsXray,
    fullConfig: fields.fullConfig || null,
    ping: '--',
    isImported: true
  };
}

function parseVlessUri(uri, index) {
  const withoutScheme = uri.slice('vless://'.length);
  const hashIdx = withoutScheme.indexOf('#');
  const body = hashIdx === -1 ? withoutScheme : withoutScheme.slice(0, hashIdx);
  const remark = hashIdx === -1 ? '' : safeDecode(withoutScheme.slice(hashIdx + 1)).trim();

  const qIdx = body.indexOf('?');
  const authority = qIdx === -1 ? body : body.slice(0, qIdx);
  const query = new URLSearchParams(qIdx === -1 ? '' : body.slice(qIdx + 1));

  const atIdx = authority.lastIndexOf('@');
  if (atIdx === -1) return null;
  const uuid = safeDecode(authority.slice(0, atIdx));
  const { host, port } = splitHostPort(authority.slice(atIdx + 1));
  if (!host) return null;

  const security = (query.get('security') || 'none').toLowerCase();
  const network = (query.get('type') || 'tcp').toLowerCase();
  const headerType = (query.get('headerType') || '').toLowerCase();

  return makeServer({
    id: `sub_${index}_${Date.now().toString(36)}`,
    name: remark || `VLESS ${host}:${port}`,
    protocol: 'VLESS',
    host,
    port: port || 443,
    uuid,
    security,
    encryption: query.get('encryption') || 'none',
    flow: query.get('flow') || '',
    sni: query.get('sni') || query.get('peer') || '',
    alpn: query.get('alpn') || '',
    fingerprint: query.get('fp') || '',
    network,
    headerType,
    wsPath: safeDecode(query.get('path') || ''),
    wsHost: query.get('host') || '',
    grpcServiceName: query.get('serviceName') || '',
    realityPublicKey: query.get('pbk') || '',
    realityShortId: query.get('sid') || '',
    realitySpiderX: safeDecode(query.get('spx') || ''),
    rawUri: uri,
    needsXray: true
  });
}

function parseTrojanUri(uri, index) {
  const withoutScheme = uri.slice('trojan://'.length);
  const hashIdx = withoutScheme.indexOf('#');
  const body = hashIdx === -1 ? withoutScheme : withoutScheme.slice(0, hashIdx);
  const remark = hashIdx === -1 ? '' : safeDecode(withoutScheme.slice(hashIdx + 1)).trim();

  const qIdx = body.indexOf('?');
  const authority = qIdx === -1 ? body : body.slice(0, qIdx);
  const query = new URLSearchParams(qIdx === -1 ? '' : body.slice(qIdx + 1));

  const atIdx = authority.lastIndexOf('@');
  if (atIdx === -1) return null;
  const password = safeDecode(authority.slice(0, atIdx));
  const { host, port } = splitHostPort(authority.slice(atIdx + 1));
  if (!host) return null;

  return makeServer({
    id: `sub_${index}_${Date.now().toString(36)}`,
    name: remark || `Trojan ${host}:${port}`,
    protocol: 'TROJAN',
    host,
    port: port || 443,
    password,
    security: (query.get('security') || 'tls').toLowerCase(),
    sni: query.get('sni') || query.get('peer') || '',
    alpn: query.get('alpn') || '',
    fingerprint: query.get('fp') || '',
    network: (query.get('type') || 'tcp').toLowerCase(),
    headerType: (query.get('headerType') || '').toLowerCase(),
    wsPath: safeDecode(query.get('path') || ''),
    wsHost: query.get('host') || '',
    grpcServiceName: query.get('serviceName') || '',
    rawUri: uri,
    needsXray: true
  });
}

function parseVmessUri(uri, index) {
  const body = uri.slice('vmess://'.length).split('#')[0];
  let json;
  try {
    json = JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
  } catch {
    return null;
  }

  const host = json.add || json.address || '';
  const port = parseInt(json.port, 10) || 443;
  if (!host) return null;

  const network = (json.net || 'tcp').toLowerCase();
  const tls = (json.tls || '').toLowerCase();

  return makeServer({
    id: `sub_${index}_${Date.now().toString(36)}`,
    name: json.ps || json.remarks || `VMess ${host}:${port}`,
    protocol: 'VMESS',
    host,
    port,
    uuid: json.id || '',
    security: tls === 'tls' ? 'tls' : 'none',
    encryption: json.scy || 'auto',
    network,
    headerType: (json.type || '').toLowerCase(),
    wsPath: json.path || '',
    wsHost: json.host || '',
    sni: json.sni || json.host || '',
    alpn: json.alpn || '',
    fingerprint: json.fp || '',
    rawUri: uri,
    needsXray: true
  });
}

function parseShadowsocksUri(uri, index) {
  const withoutScheme = uri.slice('ss://'.length);
  const hashIdx = withoutScheme.indexOf('#');
  const body = hashIdx === -1 ? withoutScheme : withoutScheme.slice(0, hashIdx);
  const remark = hashIdx === -1 ? '' : safeDecode(withoutScheme.slice(hashIdx + 1)).trim();

  const qIdx = body.indexOf('?');
  const authority = qIdx === -1 ? body : body.slice(0, qIdx);
  const query = new URLSearchParams(qIdx === -1 ? '' : body.slice(qIdx + 1));

  let method = '';
  let password = '';
  let host = '';
  let port = 0;

  if (authority.includes('@')) {
    // ss://base64(method:password)@host:port  OR  ss://method:password@host:port
    const atIdx = authority.lastIndexOf('@');
    const userInfo = authority.slice(0, atIdx);
    const hostPart = splitHostPort(authority.slice(atIdx + 1));
    host = hostPart.host;
    port = hostPart.port;

    let decoded = safeDecode(userInfo);
    if (!decoded.includes(':')) {
      try {
        decoded = Buffer.from(userInfo, 'base64').toString('utf8');
      } catch {}
    }
    const sep = decoded.indexOf(':');
    if (sep !== -1) {
      method = decoded.slice(0, sep);
      password = decoded.slice(sep + 1);
    }
  } else {
    // Fully base64-encoded: ss://base64(method:password@host:port)
    try {
      const decoded = Buffer.from(authority, 'base64').toString('utf8');
      const atIdx = decoded.lastIndexOf('@');
      if (atIdx !== -1) {
        const creds = decoded.slice(0, atIdx);
        const hostPart = splitHostPort(decoded.slice(atIdx + 1));
        host = hostPart.host;
        port = hostPart.port;
        const sep = creds.indexOf(':');
        if (sep !== -1) {
          method = creds.slice(0, sep);
          password = creds.slice(sep + 1);
        }
      }
    } catch {}
  }

  if (!host) return null;

  return makeServer({
    id: `sub_${index}_${Date.now().toString(36)}`,
    name: remark || `Shadowsocks ${host}:${port}`,
    protocol: 'SHADOWSOCKS',
    host,
    port: port || 8388,
    password,
    encryption: method || 'aes-256-gcm',
    network: 'tcp',
    // Shadowsocks over plain TCP is not something Chromium speaks; route via Xray.
    rawUri: uri,
    needsXray: true,
    plugin: query.get('plugin') || ''
  });
}

function parseNativeProxyUri(uri, index, protocol) {
  const withoutScheme = uri.slice(protocol.length + 3);
  const hashIdx = withoutScheme.indexOf('#');
  const body = hashIdx === -1 ? withoutScheme : withoutScheme.slice(0, hashIdx);
  const remark = hashIdx === -1 ? '' : safeDecode(withoutScheme.slice(hashIdx + 1)).trim();

  const proxyUrl = `${protocol}://${body}`;
  let host = '';
  let port = 0;
  try {
    const u = new URL(proxyUrl);
    host = u.hostname;
    port = parseInt(u.port, 10) || (protocol === 'https' ? 443 : 1080);
  } catch {
    const hostPart = splitHostPort(body.split('@').pop());
    host = hostPart.host;
    port = hostPart.port || (protocol === 'https' ? 443 : 1080);
  }
  if (!host) return null;

  return makeServer({
    id: `sub_${index}_${Date.now().toString(36)}`,
    name: remark || `${protocol.toUpperCase()} ${host}:${port}`,
    protocol: protocol.toUpperCase(),
    host,
    port,
    rawUri: uri,
    proxyUrl,
    needsXray: false
  });
}

function parseSingleConfigLine(line, index) {
  if (!line.includes('://')) return null;

  const scheme = line.slice(0, line.indexOf('://')).toLowerCase();

  try {
    switch (scheme) {
      case 'vless': return parseVlessUri(line, index);
      case 'vmess': return parseVmessUri(line, index);
      case 'trojan': return parseTrojanUri(line, index);
      case 'ss': return parseShadowsocksUri(line, index);
      case 'socks5':
      case 'socks': return parseNativeProxyUri(line, index, 'socks5');
      case 'http':
      case 'https': return parseNativeProxyUri(line, index, scheme);
      default: return null;
    }
  } catch (err) {
    console.warn('Skipping unparseable config line:', line, err.message);
    return null;
  }
}

// ==================== OUTBOUND PARSERS (sing-box / Happ / v2ray / Clash) ====================

function buildSynthesizedRawUri(server) {
  try {
    const proto = (server.protocol || '').toLowerCase();
    const nameHash = server.name ? `#${encodeURIComponent(server.name)}` : '';
    if (proto === 'vless') {
      const q = new URLSearchParams();
      if (server.security) q.set('security', server.security);
      if (server.encryption && server.encryption !== 'none') q.set('encryption', server.encryption);
      if (server.flow) q.set('flow', server.flow);
      if (server.sni) q.set('sni', server.sni);
      if (server.alpn) q.set('alpn', server.alpn);
      if (server.fingerprint) q.set('fp', server.fingerprint);
      if (server.network && server.network !== 'tcp') q.set('type', server.network);
      if (server.wsPath) q.set('path', server.wsPath);
      if (server.wsHost) q.set('host', server.wsHost);
      if (server.grpcServiceName) q.set('serviceName', server.grpcServiceName);
      if (server.realityPublicKey) q.set('pbk', server.realityPublicKey);
      if (server.realityShortId) q.set('sid', server.realityShortId);
      if (server.realitySpiderX) q.set('spx', server.realitySpiderX);
      const qs = q.toString();
      return `vless://${server.uuid}@${server.host}:${server.port}${qs ? '?' + qs : ''}${nameHash}`;
    }
    if (proto === 'trojan') {
      const q = new URLSearchParams();
      if (server.security) q.set('security', server.security);
      if (server.sni) q.set('sni', server.sni);
      if (server.network && server.network !== 'tcp') q.set('type', server.network);
      const qs = q.toString();
      return `trojan://${encodeURIComponent(server.password)}@${server.host}:${server.port}${qs ? '?' + qs : ''}${nameHash}`;
    }
    if (proto === 'shadowsocks') {
      const creds = Buffer.from(`${server.encryption}:${server.password}`).toString('base64');
      return `ss://${creds}@${server.host}:${server.port}${nameHash}`;
    }
    if (proto === 'socks5' || proto === 'http' || proto === 'https') {
      return `${proto}://${server.host}:${server.port}${nameHash}`;
    }
  } catch {}
  return '';
}

// sing-box format: { type: 'vless', tag: '...', server: '...', server_port: 443, uuid: '...', tls: { ... } }
function parseSingBoxOutbound(out, index, groupRemark = '') {
  if (!out || typeof out !== 'object') return null;

  const rawType = (out.type || out.protocol || '').toLowerCase();
  let proto = rawType;
  if (proto === 'shadowsocks') proto = 'ss';
  if (proto === 'socks5') proto = 'socks';

  // Ignore non-proxy outbounds
  const NON_PROXY_TYPES = ['direct', 'block', 'dns', 'selector', 'urltest'];
  if (NON_PROXY_TYPES.includes(proto)) return null;

  const validProtos = [...XRAY_PROTOCOLS, ...NATIVE_PROXY_PROTOCOLS, 'ss'];
  if (!validProtos.includes(proto)) return null;

  const host = out.server || out.address || out.host || '';
  const port = parseInt(out.server_port ?? out.port, 10) || 443;
  if (!host || host === '127.0.0.1' || host === 'localhost' || host === 'None') return null;

  const name = out.tag || out.name || out.remarks || (groupRemark ? `${groupRemark} ${index}` : `Server ${index}`);

  const tls = out.tls || {};
  const reality = tls.reality || out.reality || {};
  const isReality = !!(reality.enabled || reality.public_key || reality.publicKey || reality.password || out.reality_opts?.['public-key'] || out['reality-opts']?.['public-key']);
  const isTls = isReality || !!tls.enabled || !!tls.server_name || !!out.tls;

  let security = 'none';
  if (isReality) security = 'reality';
  else if (isTls) security = 'tls';

  const sni = tls.server_name || out.sni || out.serverName || out.servername || reality.server_name || '';
  const alpn = Array.isArray(tls.alpn) ? tls.alpn.join(',') : (tls.alpn || '');
  const fingerprint = tls.utls?.fingerprint || tls.fingerprint || out.client_fingerprint || out['client-fingerprint'] || reality.fingerprint || '';
  const realityPublicKey = reality.public_key || reality.publicKey || reality.password || out.reality_opts?.['public-key'] || out['reality-opts']?.['public-key'] || '';
  const realityShortId = reality.short_id || reality.shortId || out.reality_opts?.['short-id'] || out['reality-opts']?.['short-id'] || '';
  const realitySpiderX = reality.spider_x || reality.spiderX || out.reality_opts?.['spider-x'] || out['reality-opts']?.['spider-x'] || '';

  const transport = out.transport || {};
  const network = (transport.type || out.network || 'tcp').toLowerCase();
  const wsOpts = out.ws_opts || out['ws-opts'] || {};
  const wsPath = transport.path || wsOpts.path || '';
  const wsHost = transport.headers?.Host || transport.headers?.host || wsOpts.headers?.Host || wsOpts.headers?.host || '';
  const grpcOpts = out.grpc_opts || out['grpc-opts'] || {};
  const grpcServiceName = transport.service_name || grpcOpts.grpc_service_name || grpcOpts['grpc-service-name'] || '';

  const uuid = out.uuid || out.id || '';
  const password = out.password || '';
  const flow = out.flow || '';
  const encryption = out.method || out.cipher || out.security || out.encryption || 'none';

  const normalizedProto = proto === 'ss' ? 'SHADOWSOCKS' : proto.toUpperCase();
  const isNative = NATIVE_PROXY_PROTOCOLS.includes(proto);

  const serverObj = makeServer({
    id: `sub_${index}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    protocol: normalizedProto,
    host,
    port,
    uuid,
    password,
    encryption,
    flow,
    security,
    sni,
    alpn,
    fingerprint,
    network,
    headerType: '',
    wsPath,
    wsHost,
    grpcServiceName,
    realityPublicKey,
    realityShortId,
    realitySpiderX,
    proxyUrl: isNative ? `${proto === 'socks' ? 'socks5' : proto}://${host}:${port}` : '',
    needsXray: !isNative
  });

  if (!serverObj.rawUri) {
    serverObj.rawUri = buildSynthesizedRawUri(serverObj);
  }

  return serverObj;
}

// v2ray format: { protocol: 'vless', tag: '...', settings: { vnext: [...] }, streamSettings: { ... } }
function parseV2rayOutbound(out, index, groupRemark = '') {
  if (!out || typeof out !== 'object') return null;
  const proto = (out.protocol || '').toLowerCase();
  if (!XRAY_PROTOCOLS.includes(proto) && !NATIVE_PROXY_PROTOCOLS.includes(proto)) return null;

  const settings = out.settings || {};
  const stream = out.streamSettings || out.stream_settings || {};
  const vnext = settings.vnext?.[0];
  const ssServer = settings.servers?.[0];

  const host = vnext?.address || ssServer?.address || out.address || out.server || out.host || '';
  const port = parseInt(vnext?.port ?? ssServer?.port ?? out.port, 10) || 443;
  if (!host || host === 'None' || host === '127.0.0.1' || host === 'localhost') return null;

  const name = groupRemark
    ? `${groupRemark} (${out.tag || proto.toUpperCase()})`
    : (out.tag || `Server ${index}`);

  const user = vnext?.users?.[0] || {};
  const tlsSettings = stream.tlsSettings || stream.tls_settings || stream.securitySettings || {};
  const wsSettings = stream.wsSettings || stream.ws_settings || {};
  const realitySettings = stream.realitySettings || stream.reality_settings || tlsSettings.realitySettings || {};

  const isNative = NATIVE_PROXY_PROTOCOLS.includes(proto);
  const normalizedProto = proto === 'socks' ? 'socks5' : proto;

  const sec = (stream.security || tlsSettings.security || '').toLowerCase();
  const isReality = sec === 'reality' || !!realitySettings.publicKey || !!realitySettings.public_key || !!realitySettings.password;
  const security = isReality ? 'reality' : (sec || (isNative ? '' : 'none'));

  const sni = realitySettings.serverName || realitySettings.server_name || tlsSettings.serverName || tlsSettings.server_name || stream.serverName || '';
  const alpn = Array.isArray(tlsSettings.alpn) ? tlsSettings.alpn.join(',') : (tlsSettings.alpn || '');
  const fingerprint = realitySettings.fingerprint || tlsSettings.fingerprint || '';
  const realityPublicKey = realitySettings.publicKey || realitySettings.public_key || realitySettings.password || '';
  const realityShortId = realitySettings.shortId || realitySettings.short_id || '';
  const realitySpiderX = realitySettings.spiderX || realitySettings.spider_x || '';

  const serverObj = makeServer({
    id: `sub_${index}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    protocol: normalizedProto.toUpperCase(),
    host,
    port,
    uuid: user.id || user.uuid || '',
    password: user.password || ssServer?.password || '',
    encryption: ssServer?.method || user.security || '',
    flow: user.flow || '',
    security,
    sni,
    alpn,
    fingerprint,
    network: (stream.network || 'tcp').toLowerCase(),
    wsPath: wsSettings.path || '',
    wsHost: wsSettings.headers?.Host || '',
    grpcServiceName: stream.grpcSettings?.serviceName || '',
    realityPublicKey,
    realityShortId,
    realitySpiderX,
    proxyUrl: isNative ? `${normalizedProto}://${host}:${port}` : '',
    needsXray: !isNative
  });

  if (!serverObj.rawUri) {
    serverObj.rawUri = buildSynthesizedRawUri(serverObj);
  }

  return serverObj;
}

// Checks if an object is an entire Xray/sing-box profile (has outbounds + routing/observatory/remarks)
function isFullConfigProfile(item) {
  if (!item || typeof item !== 'object') return false;
  if (!Array.isArray(item.outbounds) || item.outbounds.length === 0) return false;
  return !!(
    item.remarks ||
    item.observatory ||
    (item.routing && (item.routing.balancers || item.routing.rules)) ||
    (Array.isArray(item.inbounds) && item.inbounds.length > 0)
  );
}

function parseFullConfigServer(item, index) {
  let rawName = (item.remarks || item.tag || item.name || `Profile ${index}`).trim();
  // Strip leading emoji flags if present (e.g. "🇩🇪 EasyGo | Германия" -> "EasyGo | Германия")
  let cleanName = rawName.replace(/^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/, '').trim();
  cleanName = cleanName.replace(/^[\p{Extended_Pictographic}\s]+/u, '').trim() || rawName;

  // Find primary proxy outbound (first non-direct, non-block outbound)
  const proxyOutbound = item.outbounds.find(o => {
    const p = (o.protocol || o.type || '').toLowerCase();
    const tag = (o.tag || '').toLowerCase();
    return !['direct', 'block', 'freedom', 'blackhole', 'dns'].includes(p) && !['direct', 'block'].includes(tag);
  }) || item.outbounds[0];

  const parsedPrimary = parseSingBoxOutbound(proxyOutbound, index, cleanName) ||
                        parseV2rayOutbound(proxyOutbound, index, cleanName);

  const flag = detectFlag(rawName) || (parsedPrimary ? parsedPrimary.flag : 'VPN');
  const proto = parsedPrimary ? parsedPrimary.protocol : 'VLESS';
  const network = parsedPrimary ? parsedPrimary.network : 'tcp';
  const security = parsedPrimary ? parsedPrimary.security : 'reality';
  const host = parsedPrimary ? parsedPrimary.host : '';
  const port = parsedPrimary ? parsedPrimary.port : 443;

  return makeServer({
    id: `sub_${index}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    flag,
    protocol: proto,
    host,
    port,
    uuid: parsedPrimary?.uuid || '',
    password: parsedPrimary?.password || '',
    encryption: parsedPrimary?.encryption || 'auto',
    flow: parsedPrimary?.flow || '',
    security,
    sni: parsedPrimary?.sni || '',
    alpn: parsedPrimary?.alpn || '',
    fingerprint: parsedPrimary?.fingerprint || '',
    network,
    headerType: parsedPrimary?.headerType || '',
    wsPath: parsedPrimary?.wsPath || '',
    wsHost: parsedPrimary?.wsHost || '',
    grpcServiceName: parsedPrimary?.grpcServiceName || '',
    realityPublicKey: parsedPrimary?.realityPublicKey || '',
    realityShortId: parsedPrimary?.realityShortId || '',
    realitySpiderX: parsedPrimary?.realitySpiderX || '',
    proxyUrl: '',
    needsXray: true,
    fullConfig: item
  });
}

// ==================== JSON & YAML SUBSCRIPTIONS ====================

function parseJsonSubscription(parsedJson) {
  if (!parsedJson || typeof parsedJson !== 'object') return [];

  // Check if root object itself is a single full config profile
  if (!Array.isArray(parsedJson) && isFullConfigProfile(parsedJson)) {
    const s = parseFullConfigServer(parsedJson, 1);
    return s ? [s] : [];
  }

  const rawList = Array.isArray(parsedJson)
    ? parsedJson
    : (parsedJson.outbounds || parsedJson.proxies || parsedJson.configs || parsedJson.servers || [parsedJson]);

  // If items in the list are full config profiles (e.g. EasyGo / Happ bundle),
  // parse each item as one profile instead of breaking them down into dozens of raw sub-outbounds.
  if (Array.isArray(rawList) && rawList.some(item => isFullConfigProfile(item))) {
    const servers = [];
    let serverIndex = 1;
    for (const item of rawList) {
      if (!item) continue;
      if (isFullConfigProfile(item)) {
        const s = parseFullConfigServer(item, serverIndex);
        if (s) {
          servers.push(s);
          serverIndex++;
        }
      } else {
        const s = parseSingBoxOutbound(item, serverIndex) || parseV2rayOutbound(item, serverIndex);
        if (s) {
          servers.push(s);
          serverIndex++;
        }
      }
    }
    if (servers.length > 0) return servers;
  }

  const servers = [];
  let serverIndex = 1;

  for (const item of rawList) {
    if (!item) continue;

    // If item contains nested outbounds array
    if (Array.isArray(item.outbounds)) {
      for (const subOut of item.outbounds) {
        const s = parseSingBoxOutbound(subOut, serverIndex, item.tag || item.name) ||
                  parseV2rayOutbound(subOut, serverIndex, item.tag || item.name);
        if (s) {
          servers.push(s);
          serverIndex++;
        }
      }
      continue;
    }

    // Direct outbound item: try sing-box first, then v2ray
    const s = parseSingBoxOutbound(item, serverIndex) || parseV2rayOutbound(item, serverIndex);
    if (s) {
      servers.push(s);
      serverIndex++;
    }
  }

  return servers;
}

// Lightweight Clash YAML proxy parser without external dependencies
function parseClashYaml(text) {
  if (!text || !text.includes('proxies:')) return [];
  const lines = text.split(/\r?\n/);
  const proxies = [];
  let inProxies = false;
  let currentProxy = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('proxies:')) {
      inProxies = true;
      continue;
    }
    if (inProxies) {
      // If another top-level section starts, stop
      if (/^[a-zA-Z0-9_-]+:/.test(line) && !line.startsWith(' ') && !line.startsWith('\t')) {
        break;
      }
      if (trimmed.startsWith('- ')) {
        if (currentProxy) proxies.push(currentProxy);
        currentProxy = {};
        const rest = trimmed.slice(2).trim();
        // Inline format: - { name: "...", type: vless, ... }
        if (rest.startsWith('{') && rest.endsWith('}')) {
          try {
            const jsonLike = rest.replace(/([a-zA-Z0-9_-]+):/g, '"$1":');
            Object.assign(currentProxy, JSON.parse(jsonLike));
          } catch {}
          continue;
        }
        const colonIdx = rest.indexOf(':');
        if (colonIdx !== -1) {
          const k = rest.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
          const v = rest.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          currentProxy[k] = v;
        }
      } else if (currentProxy && trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':');
        const k = trimmed.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
        const v = trimmed.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (v) currentProxy[k] = v;
      }
    }
  }
  if (currentProxy) proxies.push(currentProxy);

  return parseJsonSubscription({ proxies });
}

function isNoticeServer(server) {
  if (!server) return false;
  const host = (server.host || '').trim();
  const port = parseInt(server.port, 10) || 0;
  const name = (server.name || '').toLowerCase();
  const uuid = (server.uuid || '').toLowerCase();

  // Servers bound to 0.0.0.0, dummy port <= 1 or empty/zero UUID are placeholder notices
  if (host === '0.0.0.0' || port <= 1 || uuid === '00000000-0000-0000-0000-000000000000') {
    return true;
  }
  if (
    name.includes('не поддерживается') ||
    name.includes('лимит устройств') ||
    name.includes('поддержку hwid') ||
    name.includes('используйте happ') ||
    name.includes('увеличьте лимит') ||
    name.includes('белые списки')
  ) {
    return true;
  }
  return false;
}

function parseSubscriptionText(rawText) {
  let text = (rawText || '').trim();
  if (!text) return [];

  function tryParseJson(str) {
    const trimmed = (str || '').trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const json = JSON.parse(trimmed);
        const parsed = parseJsonSubscription(json);
        if (parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Could not parse as JSON subscription:', e.message);
      }
    }
    return null;
  }

  function tryParseAllFormats(content) {
    // 1. JSON (sing-box / Happ / v2ray / Clash JSON)
    const jsonServers = tryParseJson(content);
    if (jsonServers && jsonServers.length > 0) return jsonServers;

    // 2. Clash YAML
    if (content.includes('proxies:')) {
      const clashServers = parseClashYaml(content);
      if (clashServers.length > 0) return clashServers;
    }

    // 3. Line-by-line configuration keys (vless://, vmess://, trojan://, ss://, socks5://)
    const lines = content.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const lineServers = [];
    for (let i = 0; i < lines.length; i++) {
      const parsed = parseSingleConfigLine(lines[i], i + 1);
      if (parsed) lineServers.push(parsed);
    }
    if (lineServers.length > 0) return lineServers;

    return [];
  }

  // 1. Direct try on raw text
  let rawServers = tryParseAllFormats(text);

  // 2. Base64 decode attempt (including URL-safe base64 and whitespace stripping)
  if (rawServers.length === 0) {
    const cleanB64 = text.replace(/[\r\n\s]/g, '');
    if (!cleanB64.includes('://') && /^[A-Za-z0-9+/=_-]+$/.test(cleanB64) && cleanB64.length > 8) {
      try {
        let standardB64 = cleanB64.replace(/-/g, '+').replace(/_/g, '/');
        while (standardB64.length % 4) standardB64 += '=';
        const decoded = Buffer.from(standardB64, 'base64').toString('utf8');
        if (decoded && decoded.trim().length > 0) {
          const b64Results = tryParseAllFormats(decoded.trim());
          if (b64Results.length > 0) rawServers = b64Results;
        }
      } catch {}
    }
  }

  if (rawServers.length === 0) return [];

  // Separate real working servers from informational dummy notice nodes
  const realServers = rawServers.filter(s => !isNoticeServer(s));
  const noticeServers = rawServers.filter(s => isNoticeServer(s));

  if (realServers.length > 0) {
    return realServers;
  }

  // If ONLY dummy notice servers were returned by the subscription provider:
  if (noticeServers.length > 0) {
    const combined = noticeServers.map(s => s.name).join(' | ');
    if (combined.includes('Лимит устройств') || combined.includes('лимит устройств')) {
      const err = new Error('Лимит устройств достигнут по вашей подписке. Сбросьте привязку устройств в Telegram-боте вашего VPN (команда /devices или кнопка «Сбросить устройства»), либо увеличьте лимит.');
      err.isHwidLimit = true;
      err.noticeList = noticeServers.map(s => s.name);
      throw err;
    }
    if (combined.includes('не поддерживается') || combined.includes('HWID') || combined.includes('HAPP')) {
      const err = new Error('Сервер VPN-подписки требует поддержку HWID (Happ/INCY). Браузер настроил отправку HWID, но сервер отклонил запрос. Проверьте подписку или сбросьте устройства в боте.');
      err.isHwidError = true;
      err.noticeList = noticeServers.map(s => s.name);
      throw err;
    }
    const err = new Error(`Уведомление от сервера подписки: ${noticeServers[0].name}`);
    err.noticeList = noticeServers.map(s => s.name);
    throw err;
  }

  return [];
}

module.exports = {
  fetchSubscriptionUrl,
  parseSubscriptionText,
  parseSingleConfigLine,
  parseJsonSubscription,
  parseClashYaml,
  detectFlag,
  NATIVE_PROXY_PROTOCOLS,
  XRAY_PROTOCOLS
};
