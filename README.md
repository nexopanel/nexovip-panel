# 🔴 NexoVIP — Premium VPN Management & Config Builder Panel

> **The next-generation VPN control center.** Black · Deep Red · Neon Red.
> Built for the dark side of the internet — beautifully.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Xray](https://img.shields.io/badge/Xray-Core-00add8?logo=v2ray&logoColor=white)](https://github.com/XTLS/Xray-core)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Railway](https://img.shields.io/badge/Deploy-Railway-0b0d0e?logo=railway&logoColor=white)](https://railway.app)
[![License](https://img.shields.io/badge/License-MIT-ef2a3a)](LICENSE)

**NexoVIP** is a fully functional, production-ready VPN management & configuration panel: a real **Xray relay gateway** with a premium admin dashboard for managing servers, nodes, subscriptions, traffic, IPs, protocols and VPN configurations — wrapped in a dark, luxurious, futuristic UI with full **English / فارسی (RTL)** support.

---

## ✨ Features

### 🎛️ Admin Dashboard
- 📊 **Live system statistics** — CPU, RAM, uptime, active connections
- 🟢 **Node / Server monitoring** — online / offline status at a glance
- 📈 **Traffic & bandwidth charts** — real usage, not guesses
- 🗂️ **Full CRUD** for servers, nodes, IPs and subscriptions

### 🔑 User & Subscription Management
- 👥 Create, edit, delete, search & view users
- 📦 **Subscription manager** — quota (GB), expiry (days), used traffic
- 📅 **Expiry tracking** with auto-expire enforcement
- 🔗 **Live usage in client apps** — `subscription-userinfo` header + body headers
  so v2RayTun / v2rayNG / Hiddify / Streisand show `Used / Total / Expiry` right in the app
- 📱 **QR codes** & one-tap copy for every config

### 🛠️ Config Builder
- ⚡ **VLESS + Trojan**, transports: **WS**, **XHTTP** (gRPC ready)
- 🧩 Per-protocol fingerprints, ALPN, headers, paths
- 🖥️ **Server-side Xray config generator** — one inbound per protocol×transport
- 🔄 **NGINX / Caddy reverse-proxy snippets** (TLS at the edge)
- 🚀 **One-command auto-installer** — `nexovip-install.sh` sets up Xray + Caddy
  with automatic Let's Encrypt HTTPS on any Ubuntu/Debian VPS
- 🩺 **Live gateway diagnostics** — probes TLS on 443 *and* the real tunnel
  WebSocket handshake, so you know a config will actually connect

### 🤖 Automation & Analytics *(new)*
- 🔮 **Usage forecast** — real-speed ETA per user (`≈3.2d left`) right in the table
- 📅 **Persistent traffic history** — hourly (48h) + daily (30d) charts survive restarts
- ⚙️ **Auto lifecycle** — auto-disable expired subs, auto-delete after N days,
  monthly / 30-day usage reset cycles
- ⚡ **Quick actions** — `+30d` and `↺ reset` directly on every row
- 🧰 **Batch operations** — multi-select → activate / deactivate / reset / delete / **CSV export**,
  plus one-click **batch create** (`Ali-1 … Ali-50`)
- 🔐 **Telegram 2FA login** — 6-digit code on every sign-in (auto-fallback if the bot is offline)
- 🖥️ **Session manager** — list active sessions + *logout everywhere* + new-IP login alerts

### 🌍 i18n & Design
- 🇺🇸 **English** (LTR) ⇄ 🇮🇷 **فارسی** (RTL) — one-tap switch, fully translated
- 🖤 **Black / Deep Red / Neon Red** theme with glassmorphism, glow effects,
  smooth micro-interactions and elegant animations
- 📱 **Fully responsive** — mobile, tablet, desktop

---

## 🧱 Architecture

```
┌────────────┐   /sub/:uid   ┌───────────────────────────────────┐
│  VPN app   │ ────────────▶ │  NexoVIP Panel (FastAPI + Xray)   │
│ v2RayTun   │               │                                   │
│ v2rayNG    │   vless://    │  ┌───────────┐   ┌──────────────┐  │
│ Hiddify    │ ────────────▶ │  │ Panel/API │──▶│  Xray relay  │  │
│ Streisand  │               │  └───────────┘   │ (inbound ↔   │  │
└────────────┘               │                  │  outbound)   │  │
                             │  ┌───────────┐   └──────────────┘  │
                             │  │ SQLite DB │                     │
                             │  └───────────┘                     │
                             └───────────────────────────────────┘
```

The panel itself **is** the gateway: Xray runs inside the same service and
relays real traffic, so generated configs actually connect — not just TCP-ping.

---

## 🚀 Quick Deploy (Railway)

1. **Fork / push** this repo to GitHub
2. On **Railway** → *New Project* → *Deploy from GitHub repo*
3. Set environment variables (see below)
4. Add a **Volume** mounted at `/data` (SQLite lives there)
5. Open the generated domain → **login** → start building configs 🎉

> The `Procfile` and `render.yaml` are already configured — Render works too.

### ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PASSWORD` | `admin` | Panel admin password ⚠️ *change it!* |
| `PORT` | `8000` | HTTP port (Railway/Render inject this) |
| `DATA_DIR` | `/data` | Where SQLite + certs are stored |

---

## 🖥️ Local Run

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` → sign in with `ADMIN_PASSWORD` → done.

---

## 📱 Using the Subscription

Every config link is also a **subscription**: point any client at
`https://your-domain/sub/<UUID>`.

| Client | Status display (`Used / Total / Expiry`) |
|---|---|
| 📱 **v2RayTun / Victory** | ✅ header + body `subscription-userinfo` |
| 📱 **v2rayNG** | ✅ HTTP header |
| 📱 **Hiddify** | ✅ native sing-box export |
| 📱 **Streisand / V2Box / Karing** | ✅ HTTP header |

> 💡 The status badge (`NexoVIP-Name [📊 0 B / ∞ 📅 ∞]`) is attached to the
> **first config only**, so every client shows it without spamming the list.

---

## 🗂️ Project Structure

```
├── main.py               🔥 The whole panel — FastAPI app + Xray relay + UI
├── xhttp_transport.py    🚀 XHTTP (packet-up / stream-up) transport
├── requirements.txt      📦 Dependencies
├── Procfile              ⚙️ Railway start command
├── railway_ips.txt       🌐 Clean Railway IP pool
└── client/               📸 Client screenshots
```

---

## 🛡️ Security Notes

- 🔒 All admin routes require `ADMIN_PASSWORD`
- 🚫 Disabled / expired subscriptions are rejected at the API
- 📊 Per-subscription traffic counters update in real time
- ⏰ Auto-cleanup keeps the DB tidy

---

## 📖 راهنمای فارسی

> 🆕 **نسخهٔ ۳:** پیش‌بینی هوشمند پایان حجم، تاریخچهٔ دائمی ترافیک، چرخهٔ عمر خودکار
> (غیرفعال‌سازی/حذف خودکار + ریست ماهانه)، عملیات گروهی با خروجی CSV، دکمه‌های سریع
> `+30d` و `↺` روی هر ردیف، ورود دومرحله‌ای با کد تلگرام و مدیریت نشست‌های فعال.

**نکسووی‌آی‌پی** یک پنل مدیریت و ساخت کانفیگ VPN حرفه‌ای است:

- 🖤 تم لوکس مشکی با لهجه‌های قرمز نئونی، کاملاً دوزبانه (فارسی/انگلیسی) با پشتیبانی کامل **RTL**
- 📡 مدیریت کامل کاربران، ساب‌ها، سرورها، آی‌پی‌ها و ساخت کانفیگ **VLESS/Trojan**
- 🔗 اشتراک‌ها حجم و زمان انقضا را داخل خود اپ (v2RayTun، v2rayNG و…) نمایش می‌دهند
- 🚀 دیپلوی یک‌دستوری روی Railway و نصب خودکار سرور با `nexovip-install.sh`
- 🩺 ابزار عیب‌یابی زنده تا مطمئن شوی کانفیگ واقعاً وصل می‌شود، نه فقط TCP پینگ

---

## 🙏 Credits

Built on top of the brilliant **LUFFY_PANEL** architecture — rebranded, re-themed
and extended into **NexoVIP**.

> ⚠️ For education & personal use only. You are responsible for how you use this software.
