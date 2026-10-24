<div align="center">

# 🌐 Aura Browser (v1.0.0)

**Ultra-minimalist, high-performance privacy desktop browser with zero telemetry, zero background RAM bloat, and built-in VPN & Tor routing.**

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg?style=for-the-badge)](https://github.com)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078d7.svg?style=for-the-badge&logo=windows)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-10b981.svg?style=for-the-badge)](LICENSE)
[![Zero Telemetry](https://img.shields.io/badge/telemetry-ZERO-ef4444.svg?style=for-the-badge)](https://github.com)
[![VPN & Tor](https://img.shields.io/badge/vpn-Xray--core%20%2B%20HWID-8b5cf6.svg?style=for-the-badge)](https://github.com)

**[🇬🇧 English](README_EN.md)** • **[🇷🇺 Русский](README.md)**

<p align="center">
  <a href="#-quick-download">Download v1.0.0</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-hotkeys">Hotkeys</a> •
  <a href="#-building-from-source">Building</a> •
  <a href="#-donations--support">Donations</a>
</p>

---

</div>

## 🚀 Quick Download

Official release binaries for Windows (x64):

| Release | Package | Download Link |
|---|---|---|
| **v1.0.0** | **Windows Installer (.exe)** | [Download Aura Browser Setup 1.0.0.exe](dist/Aura%20Browser%20Setup%201.0.0.exe) |
| **v1.0.0** | **Portable Unpacked** | Folder `dist/win-unpacked/Aura Browser.exe` |

> [!TIP]
> The standalone installer bundles an optimized Xray-core binary and all core runtime dependencies.

---

## ⚡ Key Features

### 🛡️ 1. Zero Telemetry & Privacy Shield
* **Hardened Chromium Stack**: Google metrics collection completely stripped (`disable-metrics`, `disable-breakpad`, `disable-domain-reliability`, `disable-sync`).
* **O(1) In-Memory Tracker Blocker**: Real-time interception and blocking of Google Analytics, Yandex Metrika, tracking beacons, and invasive advertising pixels.
* **Tracking Stripper**: Automatically purges surveillance query parameters (`utm_source`, `fbclid`, `gclid`, `yclid`) from all navigated URLs.
* **Forced Privacy Headers**: Always dispatches strict `DNT: 1` and `Sec-GPC: 1` to destination servers.
* **100% Local Data Vault**: Browsing history, encrypted credentials, bookmarks, and configuration parameters reside strictly on your local drive with zero cloud telemetry.

### 🧠 2. Tab Hibernation & RAM Optimizer
* **Intelligent Tab Suspension**: Inactive tabs idle for more than 5 minutes are put into a deep hibernate state, releasing up to 150–250 MB of RAM per tab.
* **Instant Wake-Up**: Instantaneous resumption upon tab click without resetting form contents or scroll offsets.
* **Real-time Memory Monitor**: Top bar displays reclaimed RAM metrics live.

### 🌐 3. Native VPN with HWID Support & Ping Monitor
* **Multi-Protocol Outbounds**: Supports `VLESS REALITY`, `VMess`, `Trojan`, `Shadowsocks`, `SOCKS5`, `HTTP`, as well as `sing-box JSON`, `Happ`, `INCY`, `v2ray`, and `Clash` subscription formats.
* **HWID Fingerprinting Support**: Built-in persistent hardware identity headers for strict panels (*Remnawave*, *Marzban*, *Happ/INCY*) eliminating "Application Not Supported" rejections.
* **Live Latency Benchmarking (⚡)**: Parallel multi-threaded server ping with visual health cues (green/yellow/red).
* **Subscription Dashboard**: Real-time traffic remaining, expiration counters, 1-click update, and 1-click HWID copy.

### 🧅 4. Tor Onion Routing & Bridges (@GetBridgesBot)
* **Direct .onion Accessibility**: Native SOCKS5 routing through Tor for onion hidden services.
* **Anti-Censorship Pluggable Transports**: Built-in support for `obfs4` and `webtunnel` bridges with direct compatibility for Telegram's official `@GetBridgesBot`.
* **Configurable Startup Modes**: Select between automatic Tor enforcement, clean direct mode, or interactive prompt at launch.

### 🌙 5. True Dark Mode Engine
* Kernel-level Chromium Force Dark algorithm with automated dark palette negotiation for search engines.
* **Zero White Flash**: Guaranteed dark backdrop initialization eliminating white flash transitions between web contents.

### 🔑 6. Password Vault (AES-256-GCM)
* Strong local credential encryption with automatic password saving prompts and autofill.

---

## ⌨️ Hotkeys

| Shortcut | Description |
|---|---|
| `Ctrl + T` | Open new tab |
| `Ctrl + W` | Close active tab |
| `Ctrl + L` | Focus URL address bar |
| `Ctrl + R` | Reload current page |
| `Ctrl + H` | Open browsing history |
| `Ctrl + D` | Bookmark active page |
| `Ctrl + F` | Search on page |
| `Alt + ←` / `Alt + →` | Back / Forward |
| `Escape` | Dismiss modal / search bar |

---

## 🛠️ Building from Source

Prerequisites: [Node.js](https://nodejs.org/) (version 18 or newer):

```bash
# Clone the repository
git clone https://github.com/eahider/aura-browser.git
cd aura-browser

# Install dependencies
npm install

# Run in development mode
npm start

# Compile Windows x64 production installer (v1.0.0)
npm run dist
```

Convenience batch scripts in repository root:
* `run.bat` — Run browser instantly.
* `build_desktop.bat` — One-click compilation of Windows installer into `dist/`.

---

## 💖 Donations & Support

Aura Browser is 100% free and open-source software with no trackers, no paywalls, and no sponsored telemetry. If you appreciate the project, you can help fund independent development via cryptocurrency:

| Cryptocurrency | Network | Wallet Address |
|---|---|---|
| **Bitcoin (BTC)** | Bitcoin Native / SegWit | `INSERT_YOUR_BTC_ADDRESS_HERE` |
| **Ethereum (ETH)** | Ethereum (ERC-20) / Arbitrum | `INSERT_YOUR_ETH_ADDRESS_HERE` |
| **USDT (Tether)** | TRON (TRC-20) | `INSERT_YOUR_USDT_TRC20_ADDRESS_HERE` |
| **USDT (Tether)** | BNB Smart Chain (BEP-20) | `INSERT_YOUR_USDT_BEP20_ADDRESS_HERE` |
| **TON (Toncoin)** | The Open Network (TON) | `INSERT_YOUR_TON_ADDRESS_HERE` |
| **Monero (XMR)** | Monero Network | `INSERT_YOUR_XMR_ADDRESS_HERE` |

> [!NOTE]
> All contributions directly support censorship-circumvention R&D and core infrastructure. Thank you for your support! 🙌

---

## 📄 License

Licensed under the [MIT License](LICENSE).
