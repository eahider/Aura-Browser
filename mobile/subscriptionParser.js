// Aura Browser Mobile - Subscription & Proxy Parser
// Parses VLESS, VMess, Shadowsocks, Trojan, SOCKS5, and HTTP configs

export const COUNTRY_FLAGS = [
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

export function detectFlag(name = '') {
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

function parseJsonNodes(text) {
  try {
    const trimmed = text.trim();
    if (!((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}')))) {
      return [];
    }
    const parsedJson = JSON.parse(trimmed);
    const arr = Array.isArray(parsedJson) ? parsedJson : (parsedJson.outbounds || parsedJson.proxies || parsedJson.servers || []);
    const results = [];
    const NON_PROXY = ['direct', 'block', 'dns', 'selector', 'urltest'];

    for (const item of arr) {
      if (!item) continue;
      const type = (item.type || item.protocol || 'VLESS').toLowerCase();
      if (NON_PROXY.includes(type)) continue;

      const srv = item.server || item.address || item.host;
      const port = item.server_port || item.port;
      if (srv && port && srv !== '127.0.0.1' && srv !== 'localhost' && srv !== 'None') {
        const name = item.tag || item.name || item.remarks || `${srv}:${port}`;
        results.push({
          id: `json-${srv}-${port}-${results.length}`,
          name,
          flag: detectFlag(name),
          type: type.toUpperCase(),
          proxyUrl: `socks5://${srv}:${port}`,
          ping: `${Math.floor(25 + Math.random() * 65)}ms`,
          active: false
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

export function parseSubscriptionText(rawText) {
  let text = (rawText || '').trim();
  if (!text) return [];

  // Try direct JSON
  const directJson = parseJsonNodes(text);
  if (directJson.length > 0) return directJson;

  // Base64 decode attempt
  const cleanB64 = text.replace(/[\r\n\s]/g, '');
  if (!cleanB64.includes('://') && cleanB64.length > 8 && /^[A-Za-z0-9+/=_-]+$/.test(cleanB64)) {
    try {
      let stdB64 = cleanB64.replace(/-/g, '+').replace(/_/g, '/');
      while (stdB64.length % 4) stdB64 += '=';
      const decoded = atob(stdB64);
      if (decoded && decoded.trim().length > 0) {
        const b64Json = parseJsonNodes(decoded);
        if (b64Json.length > 0) return b64Json;
        text = decoded;
      }
    } catch {}
  }

  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const servers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      if (line.startsWith('socks5://') || line.startsWith('socks://')) {
        const u = new URL(line);
        const name = decodeURIComponent(u.hash ? u.hash.slice(1) : `${u.hostname}:${u.port}`);
        servers.push({
          id: `socks-${i}`,
          name: name || `SOCKS5 ${u.hostname}`,
          flag: detectFlag(name),
          type: 'SOCKS5',
          proxyUrl: line,
          ping: `${Math.floor(30 + Math.random() * 50)}ms`
        });
      } else if (line.startsWith('http://') || line.startsWith('https://')) {
        // If it's a proxy node
        if (line.includes('@') || line.includes(':8080') || line.includes(':3128')) {
          const u = new URL(line);
          const name = decodeURIComponent(u.hash ? u.hash.slice(1) : `${u.hostname}:${u.port}`);
          servers.push({
            id: `http-${i}`,
            name: name || `HTTP ${u.hostname}`,
            flag: detectFlag(name),
            type: 'HTTP',
            proxyUrl: line,
            ping: `${Math.floor(40 + Math.random() * 60)}ms`
          });
        }
      } else if (line.startsWith('vless://')) {
        const u = new URL(line);
        const name = decodeURIComponent(u.hash ? u.hash.slice(1) : `${u.hostname}:${u.port}`);
        servers.push({
          id: `vless-${i}`,
          name: name || `VLESS ${u.hostname}`,
          flag: detectFlag(name),
          type: 'VLESS',
          proxyUrl: line,
          ping: `${Math.floor(20 + Math.random() * 45)}ms`
        });
      } else if (line.startsWith('ss://')) {
        const u = new URL(line);
        const name = decodeURIComponent(u.hash ? u.hash.slice(1) : u.hostname);
        servers.push({
          id: `ss-${i}`,
          name: name || `Shadowsocks ${u.hostname}`,
          flag: detectFlag(name),
          type: 'SHADOWSOCKS',
          proxyUrl: line,
          ping: `${Math.floor(25 + Math.random() * 50)}ms`
        });
      } else if (line.startsWith('trojan://')) {
        const u = new URL(line);
        const name = decodeURIComponent(u.hash ? u.hash.slice(1) : u.hostname);
        servers.push({
          id: `trojan-${i}`,
          name: name || `Trojan ${u.hostname}`,
          flag: detectFlag(name),
          type: 'TROJAN',
          proxyUrl: line,
          ping: `${Math.floor(35 + Math.random() * 55)}ms`
        });
      } else if (line.startsWith('vmess://')) {
        try {
          const b64 = line.slice('vmess://'.length);
          const raw = atob(b64);
          const vObj = JSON.parse(raw);
          const name = vObj.ps || `${vObj.add}:${vObj.port}`;
          servers.push({
            id: `vmess-${i}`,
            name,
            flag: detectFlag(name),
            type: 'VMESS',
            proxyUrl: line,
            ping: `${Math.floor(30 + Math.random() * 60)}ms`
          });
        } catch {}
      }
    } catch {}
  }

  return servers;
}

export async function fetchSubscriptionUrl(url) {
  let hwid = '';
  try {
    hwid = localStorage.getItem('aura_device_hwid') || '';
    if (!hwid) {
      hwid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('aura_device_hwid', hwid);
    }
  } catch {}

  const headers = {
    'User-Agent': 'Happ/3.4.0 v2rayN/6.23 ClashforWindows/0.20.39 AuraBrowser/1.0',
    'Accept': '*/*'
  };
  if (hwid) {
    headers['x-hwid'] = hwid;
    headers['x-device-os'] = 'Mobile';
    headers['x-device-model'] = 'MobileApp';
  }

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    throw new Error(`Server status ${resp.status}`);
  }
  const body = await resp.text();
  return parseSubscriptionText(body);
}
