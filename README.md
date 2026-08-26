# 🏴‍☠️ Luffy Panel

A lightweight VLESS + Trojan proxy panel built with FastAPI, deployable on [Render](https://render.com) or [Railway](https://railway.app).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/luffy-sh-op/LUFFY_PANEL)
&nbsp;&nbsp;
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/luffy-sh-op/LUFFY_PANEL)

---

## ✨ Features

- **VLESS and Trojan**, each independently enable-able **per inbound** — one inbound can serve both protocols at once, each with its own transport/fingerprint/ALPN
- **Transports:** WebSocket, XHTTP (packet-up mode), XHTTP (stream-up mode)
- Selectable **uTLS fingerprint** per protocol (chrome, firefox, safari, ios, android, edge, 360, qq, random, randomized)
- Selectable **ALPN** per protocol from a fixed set: `h3`, `h2`, `http/1.1`, `h3,h2,http/1.1`, `h3,h2`, `h2,http/1.1`
- Port is **fixed at 443** for every config (no per-link port customization)
- Multi-inbound management with per-user traffic quotas
- Connection limits per inbound (max IPs)
- Expiry date support per inbound
- Subscription link (`/sub/<uid>`) compatible with v2rayNG, Hiddify, etc. — automatically lists every enabled protocol/address combination
- Clean IP / alternative address management, with a one-click **Railway IP** bulk-import button (reads from `railway_ips.txt`)
- Real-time dashboard: CPU, memory, hourly traffic chart
- Bilingual UI (English / Persian)
- Dark & Light mode
- Session-based authentication with password change
- Keep-alive mechanism for free-tier hosting
- **Persistent SQLite storage** — inbounds, addresses, and settings survive restarts

---

## 🗂️ Project Structure

```
.
├── main.py               # FastAPI application (gateway + panel UI)
├── xhttp_transport.py    # XHTTP transport (packet-up / stream-up) router
├── railway_ips.txt       # Optional: your own list of clean IPs for the Railway IP import button
├── requirements.txt      # Python dependencies
├── render.yaml            # Render deployment config
└── Procfile               # Process entry point
```

---

## 🔐 Protocols & Transports

Each inbound (link) has two independent **variants**: `vless` and `trojan`. Either or both can be enabled at the same time. Each enabled variant has its own:

- **Transport:** `ws` (WebSocket) or `xhttp-packet-up` / `xhttp-stream-up` (XHTTP)
- **Fingerprint:** any of the supported uTLS fingerprints
- **ALPN:** one of the 6 fixed combinations listed above

When both VLESS and Trojan are enabled on the same inbound, the subscription page and `/sub/<uid>` output will contain a separate config line for **each** enabled protocol (and for each configured alternative address).

### Routing

Because a single inbound can serve two different wire protocols, the auth type is now part of the URL path so the server knows which parser to use:

- WebSocket: `/ws/{auth}/{uuid}` where `{auth}` is `vless` or `trojan`
- XHTTP downlink: `/xhttp/{auth}/{mode}/{uuid}/{session_id}`
- XHTTP packet-up uplink: `/xhttp/{auth}/packet-up/{uuid}/{session_id}/{seq}`
- XHTTP stream-up uplink: `/xhttp/{auth}/stream-up/{uuid}/{session_id}`

> ⚠️ If you're upgrading from an older version of this panel, previously-issued config links (`/ws/{uuid}` without an auth segment) will stop working. Re-copy/re-scan configs from the panel after upgrading.

---

## 🚀 Deploy on Render

### One-click via `render.yaml`

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/luffy-sh-op/LUFFY_PANEL)

1. Fork or push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo.
3. Render will auto-detect `render.yaml` and configure everything.
4. Set your `ADMIN_PASSWORD` environment variable (default: `admin`).

> 💡 **Tip:** For better speed, set the **Region** to **Frankfurt (EU)** in Render settings.

### Manual Setup

| Field | Value |
|---|---|
| **Environment** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python main.py` |

### 🌐 Render & Cloudflare Clean IPs

> **This panel on Render routes through Cloudflare's clean IPs exclusively.**
>
> Render's infrastructure sits behind Cloudflare's network, so all configs will automatically use **Cloudflare clean IP ranges** — which are generally unblocked and stable in restricted regions.
>
> ✅ Use the panel URL directly — Cloudflare CDN handles routing automatically.
>
> If configs don't connect, try manually adding a known Cloudflare clean IP (e.g. `104.21.x.x` or `172.67.x.x`) from the **Clean IP** page in your client instead of the hostname.

---

## 🚂 Deploy on Railway

### One-click deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/luffy-sh-op/LUFFY_PANEL)

1. Fork or push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select your repo.
3. Wait for the deployment to finish. You'll be given a URL — that's your service domain. To access the panel, just add `/login` to the end of your domain.

### ⚠️ Railway IP Addresses

> **Railway does NOT use Cloudflare. It uses its own dedicated IP ranges.**
>
> Railway's outbound IPs typically fall in the range **`69.46.46.x`**, so your configs will use Railway's own IPs — not Cloudflare's. These may or may not be accessible depending on your network restrictions.
>
> **If configs don't work on Railway:**
> 1. Check whether the `69.46.46.x` range is reachable from your network.
> 2. Add your own known-working IPs to `railway_ips.txt` (one per line, next to `main.py`) and click the **🚄 Railway IP** button on the **Clean IP** page to bulk-import them into the panel in one click.
> 3. Enable **Fragment Mode** in your v2ray / v2rayNG client (see section below).
> 4. Switch to Render for Cloudflare clean IP routing.

---

## 🌍 Clean IP Page

The **Clean IP** page lets you manage alternative addresses that get appended to every generated config (in addition to the panel's own domain), so clients can fall back to a working IP if the main hostname is blocked.

- **+ Add** — add a single address manually
- **🚄 Railway IP** — bulk-imports every line from `railway_ips.txt` (placed next to `main.py`) in a single request, skipping duplicates
- **Delete All** — clears the list

> There is no default/pre-filled address anymore — the list starts empty until you add your own.

---

## 🔧 Fragment Mode (v2rayNG / v2ray)

If your configurations are not connecting — especially on Railway — enable **Fragment Mode** in your client:

**v2rayNG (Android):**
1. Go to **Settings → Fragment**
2. Enable Fragment and set: Packets `tlshello`, Length `10-30`, Interval `10-20`
3. Reconnect

**v2ray (Desktop):** Add to your `outbound` → `streamSettings`:

```json
"sockopt": {
  "dialerProxy": "fragment",
  "tcpKeepAliveIdle": 100
}
```

Fragment mode splits the TLS ClientHello packet to bypass deep packet inspection (DPI) firewalls.

---

## ▶️ Run Locally

```bash
pip install -r requirements.txt
python main.py
```

Panel will be available at: `http://localhost:8000/login`

> After deploying on Render or Railway, access your panel at: `https://yourdomain/login`

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Panel login password | `admin` |
| `SECRET_KEY` | Session & hash secret (auto-generated) | random |
| `PORT` | Server port | `8000` |

> ⚠️ **Change `ADMIN_PASSWORD` before deploying to production.**

---

## 📦 Dependencies

```
fastapi==0.104.1
uvicorn==0.24.0
websockets==12.0
httpx==0.25.1
psutil==5.9.6
```

---

## 📌 Static IPs

| Platform | Static IP? | Notes |
|---|---|---|
| **Render** (Free) | ❌ No | Shared Cloudflare IPs; clean and stable |
| **Render** (Paid) | ✅ Yes | Available on Starter plan and above |
| **Railway** | ✅ Optional | Enable via Settings → Networking → Static IP (paid feature) |

---

## 🔌 API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/login` | Login with password |
| `POST` | `/api/logout` | Logout |
| `GET` | `/api/me` | Check session status |
| `POST` | `/api/change-password` | Change admin password |

### Inbounds
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/links` | List all inbounds |
| `POST` | `/api/links` | Create new inbound |
| `PATCH` | `/api/links/{uid}` | Edit inbound |
| `DELETE` | `/api/links/{uid}` | Delete inbound |
| `GET` | `/api/links/{uid}/sub` | Get subscription info |

**Create/edit body fields** (protocol port is always forced to `443` server-side):

| Field | Description |
|---|---|
| `label`, `limit_value`, `limit_unit`, `max_connections`, `days_valid` | Standard quota/expiry fields |
| `vless_enabled` | `true`/`false` — enable VLESS on this inbound |
| `vless_transport` | `ws` \| `xhttp-packet-up` \| `xhttp-stream-up` |
| `vless_fingerprint` | uTLS fingerprint for the VLESS variant |
| `vless_alpn` | ALPN for the VLESS variant (one of the 6 fixed options) |
| `trojan_enabled` | `true`/`false` — enable Trojan on this inbound |
| `trojan_transport` | `ws` \| `xhttp-packet-up` \| `xhttp-stream-up` |
| `trojan_fingerprint` | uTLS fingerprint for the Trojan variant |
| `trojan_alpn` | ALPN for the Trojan variant |

At least one of `vless_enabled` / `trojan_enabled` must end up `true` (the panel defaults to VLESS if neither is set).

### Subscription
| Method | Path | Description |
|---|---|---|
| `GET` | `/sub/{uid}` | Base64 subscription (v2ray/Hiddify compatible) — includes one line per enabled protocol × address |

### Clean IPs
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/addresses` | List alternative addresses |
| `POST` | `/api/addresses` | Add address |
| `DELETE` | `/api/addresses/{index}` | Remove one address |
| `DELETE` | `/api/addresses` | Remove all addresses |
| `POST` | `/api/addresses/import/{source}` | Bulk-import addresses from a local file in one request. `{source}` currently supports `railway` (reads `railway_ips.txt`) |

### System
| Method | Path | Description |
|---|---|---|
| `GET` | `/stats` | Server stats (auth required) |
| `GET` | `/health` | Health check |

---

## 🌐 Config Formats

**VLESS:**
```
vless://<uuid>@<domain>:443?encryption=none&security=tls&type=ws&host=<domain>&path=/ws/vless/<uuid>&sni=<domain>&fp=chrome&alpn=http/1.1#Luffy-<name>
```

**Trojan:**
```
trojan://<uuid>@<domain>:443?security=tls&type=ws&host=<domain>&path=/ws/trojan/<uuid>&sni=<domain>&fp=chrome&alpn=http/1.1#Luffy-<name>
```

For XHTTP transports, `type=xhttp` and `mode=packet-up` or `mode=stream-up` are used instead, with `path=/xhttp/<auth>/<mode>/<uuid>`.

> Note: authentication is really enforced by the secret `uuid` embedded in the URL path — not by the UUID/password value inside the VLESS/Trojan wire header, which the server doesn't validate. This keeps both protocols consistent and simple to manage from one panel.

---

## 🖥️ Panel Pages

| Page | Description |
|---|---|
| **Dashboard** | Traffic, uptime, CPU/memory, hourly chart |
| **Inbounds** | Create/edit/delete users, per-protocol (VLESS/Trojan) settings, copy config, QR code |
| **Traffic** | Total stats |
| **Clean IP** | Manage alternative subscription addresses, bulk-import from Railway |
| **Security** | Change password |

---

## 📱 Client Setup (v2rayNG / Hiddify)

1. Open the panel and go to **Inbounds**.
2. Click **Sub** to copy the subscription URL.
3. In your client app, add a new subscription with that URL.
4. Update subscription — configs for every enabled protocol will appear automatically.

---

## ⚠️ Notes

- Inbounds, addresses, and settings are stored in a **local SQLite database**, so they survive restarts and redeploys (as long as the disk/volume persists).
- The keep-alive task pings `/health` every 10 minutes to prevent Render free-tier spin-down.

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to your branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

---

## 📄 License

MIT — use freely, modify as needed.

---

[My Telegram channel](https://t.me/Luffy_sh_op)

---
---
---

# 🏴‍☠️ لوفی پنل

یک پنل پراکسی سبک VLESS + Trojan ساخته‌شده با FastAPI، قابل استقرار روی [Render](https://render.com) یا [Railway](https://railway.app).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/luffy-sh-op/LUFFY_PANEL)
&nbsp;&nbsp;
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/luffy-sh-op/LUFFY_PANEL)

---

## ✨ امکانات

- **VLESS و Trojan**، هرکدوم مستقل از دیگری برای هر اینباند قابل فعال‌سازی — یک اینباند می‌تونه هم‌زمان هر دو پروتکل رو داشته باشه، هرکدوم با ترابرد/فینگرپرینت/ALPN خودش
- **ترابردها:** WebSocket، XHTTP (مد packet-up)، XHTTP (مد stream-up)
- انتخاب **فینگرپرینت uTLS** جدا برای هر پروتکل (chrome، firefox، safari، ios، android، edge، 360، qq، random، randomized)
- انتخاب **ALPN** جدا برای هر پروتکل از یک لیست ثابت: `h3`، `h2`، `http/1.1`، `h3,h2,http/1.1`، `h3,h2`، `h2,http/1.1`
- پورت برای همه‌ی کانفیگ‌ها **ثابت روی 443** است (دیگه قابل تغییر نیست)
- مدیریت چند اینباند با محدودیت ترافیک برای هر کاربر
- محدودیت تعداد اتصال (IP) برای هر اینباند
- پشتیبانی از تاریخ انقضا برای هر اینباند
- لینک اشتراک (`/sub/<uid>`) سازگار با v2rayNG، Hiddify و غیره — به‌صورت خودکار برای هر ترکیب پروتکل/آدرس فعال، یک کانفیگ جدا می‌سازه
- مدیریت آی‌پی تمیز / آدرس‌های جایگزین، با دکمه‌ی **Railway IP** برای ایمپورت یکجا (از فایل `railway_ips.txt`)
- داشبورد لحظه‌ای: CPU، حافظه، نمودار ترافیک ساعتی
- رابط کاربری دو زبانه (فارسی / انگلیسی)
- حالت تاریک و روشن
- احراز هویت مبتنی بر session با امکان تغییر رمز
- مکانیزم keep-alive برای هاستینگ رایگان
- **ذخیره‌سازی دائمی با SQLite** — اینباندها، آدرس‌ها و تنظیمات با ریستارت از بین نمی‌رن

---

## 🗂️ ساختار پروژه

```
.
├── main.py               # اپلیکیشن FastAPI (گیت‌وی + رابط پنل)
├── xhttp_transport.py    # روتر ترابرد XHTTP (packet-up / stream-up)
├── railway_ips.txt       # اختیاری: لیست آی‌پی‌های تمیز خودت برای دکمه‌ی Railway IP
├── requirements.txt      # وابستگی‌های پایتون
├── render.yaml            # تنظیمات استقرار Render
└── Procfile               # نقطه ورود پروسه
```

---

## 🔐 پروتکل‌ها و ترابردها

هر اینباند (لینک) دو **variant** مستقل از هم داره: `vless` و `trojan`. هرکدوم یا هر دو می‌تونن هم‌زمان فعال باشن. هر variant فعال‌شده تنظیمات مستقل خودش رو داره:

- **ترابرد:** `ws` (وب‌سوکت) یا `xhttp-packet-up` / `xhttp-stream-up` (XHTTP)
- **فینگرپرینت:** هرکدوم از فینگرپرینت‌های uTLS پشتیبانی‌شده
- **ALPN:** یکی از ۶ ترکیب ثابت بالا

وقتی هم VLESS و هم Trojan روی یک اینباند فعال باشن، صفحه‌ی اشتراک و خروجی `/sub/<uid>` برای **هرکدوم** از پروتکل‌های فعال (و برای هر آدرس جایگزین تنظیم‌شده) یک خط کانفیگ جدا نشون می‌ده.

### مسیریابی

چون یک اینباند می‌تونه دو پروتکل سیمی متفاوت رو سرویس بده، نوع auth (vless/trojan) الان بخشی از مسیر URL هست تا سرور بفهمه با کدوم پارسر باید هدر رو بخونه:

- WebSocket: `/ws/{auth}/{uuid}` که `{auth}` یا `vless` هست یا `trojan`
- دانلینک XHTTP: `/xhttp/{auth}/{mode}/{uuid}/{session_id}`
- آپلینک XHTTP packet-up: `/xhttp/{auth}/packet-up/{uuid}/{session_id}/{seq}`
- آپلینک XHTTP stream-up: `/xhttp/{auth}/stream-up/{uuid}/{session_id}`

> ⚠️ اگه از نسخه‌ی قدیمی‌تر این پنل آپدیت می‌کنی، لینک‌های کانفیگی که قبلاً صادر شدن (`/ws/{uuid}` بدون بخش auth) دیگه کار نمی‌کنن. بعد از آپدیت، کانفیگ‌ها رو دوباره از پنل کپی/اسکن کن.

---

## 🚀 استقرار روی Render

### یک‌کلیکی با `render.yaml`

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/luffy-sh-op/LUFFY_PANEL)

1. ریپو را fork کنید یا روی GitHub آپلود کنید.
2. به [render.com](https://render.com) بروید ← **New Web Service** ← ریپو را متصل کنید.
3. Render به‌صورت خودکار `render.yaml` را شناسایی و همه چیز را تنظیم می‌کند.
4. متغیر `ADMIN_PASSWORD` را تنظیم کنید (پیش‌فرض: `admin`).

> 💡 **نکته:** برای سرعت بهتر، **Region** را روی **Frankfurt (EU)** تنظیم کنید.

### تنظیم دستی

| فیلد | مقدار |
|---|---|
| **محیط** | Python |
| **دستور Build** | `pip install -r requirements.txt` |
| **دستور Start** | `python main.py` |

### 🌐 Render و آی‌پی‌های تمیز Cloudflare

> **⭐ این پنل روی Render فقط از آی‌پی‌های تمیز Cloudflare استفاده می‌کند.**
>
> زیرساخت Render پشت شبکه Cloudflare قرار دارد، بنابراین تمام کانفیگ‌ها به‌صورت خودکار از **آی‌پی‌های تمیز Cloudflare** عبور می‌کنند — که معمولاً آنبلاک و پایدار هستند.
>
> ✅ URL پنل را مستقیم استفاده کنید — Cloudflare CDN مسیریابی را خودکار انجام می‌دهد.
>
> اگر کانفیگ‌ها وصل نشدند، از صفحه‌ی **آی‌پی تمیز** یک آی‌پی تمیز شناخته‌شده‌ی Cloudflare (مثل `104.21.x.x` یا `172.67.x.x`) اضافه کنید و به جای hostname در کلاینت خود استفاده کنید.

---

## 🚂 استقرار روی Railway

### استقرار یک‌کلیکی

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/luffy-sh-op/LUFFY_PANEL)

1. ریپو را fork کنید یا روی GitHub آپلود کنید.
2. به [railway.app](https://railway.app) بروید ← **New Project** ← **Deploy from GitHub repo** ← ریپو را انتخاب کنید.
3. صبر کنید تا deploy شود؛ بعد از deploy یک url به شما داده می‌شود که آن دامنه سرویس شماست. برای ورود به پنل کافیست به آخر دامنه‌تان `/login` اضافه کنید.

### ⚠️ آی‌پی‌های Railway

> **⭐ Railway از Cloudflare استفاده نمی‌کند و از آی‌پی‌های اختصاصی خودش استفاده می‌کند.**
>
> آی‌پی‌های خروجی Railway معمولاً در رنج **`69.46.46.x`** هستند، بنابراین کانفیگ‌های شما از آی‌پی‌های خود Railway عبور می‌کنند — نه از Cloudflare. این آی‌پی‌ها ممکن است بسته به محدودیت‌های شبکه شما در دسترس باشند یا نباشند.
>
> **اگر کانفیگ‌ها روی Railway کار نکرد:**
> 1. بررسی کنید که رنج `69.46.46.x` از شبکه شما در دسترس است.
> 2. آی‌پی‌های تست‌شده و سالم خودتون رو داخل `railway_ips.txt` (کنار `main.py`) بریزید و از صفحه‌ی **آی‌پی تمیز** روی دکمه‌ی **🚄 Railway IP** بزنید تا همه‌شون یکجا به پنل اضافه بشن.
> 3. **حالت Fragment را در کلاینت v2ray / v2rayNG فعال کنید** (بخش زیر را ببینید).
> 4. برای استفاده از آی‌پی‌های تمیز Cloudflare، به Render بروید.

---

## 🌍 صفحه‌ی آی‌پی تمیز

صفحه‌ی **آی‌پی تمیز** بهت اجازه می‌ده آدرس‌های جایگزینی رو مدیریت کنی که به هر کانفیگ ساخته‌شده اضافه می‌شن (علاوه بر دامنه‌ی خودِ پنل)، تا اگه hostname اصلی بلاک بود، کلاینت بتونه از یه آی‌پی سالم استفاده کنه.

- **+ افزودن** — افزودن دستی یک آدرس
- **🚄 Railway IP** — همه‌ی خط‌های فایل `railway_ips.txt` (کنار `main.py`) رو در یک درخواست، یکجا و بدون تکراری import می‌کنه
- **پاک کردن همه** — کل لیست رو خالی می‌کنه

> دیگه هیچ آدرس پیش‌فرضی از قبل تو لیست نیست — لیست خالی شروع می‌شه تا خودت آدرس‌هات رو اضافه کنی.

---

## 🔧 فعال‌کردن Fragment Mode (در v2rayNG / v2ray)

اگر کانفیگ‌ها وصل نمی‌شوند — به‌خصوص روی Railway — **حالت Fragment را فعال کنید:**

**v2rayNG (اندروید):**
1. به **Settings → Fragment** بروید
2. Fragment را فعال کنید و تنظیم کنید: Packets روی `tlshello`، Length روی `10-30`، Interval روی `10-20`
3. مجدداً وصل شوید

**v2ray (دسکتاپ):** به `outbound` → `streamSettings` اضافه کنید:

```json
"sockopt": {
  "dialerProxy": "fragment",
  "tcpKeepAliveIdle": 100
}
```

حالت Fragment بسته TLS ClientHello را تقسیم می‌کند تا از فایروال‌های DPI عبور کند.

---

## ▶️ اجرای محلی

```bash
pip install -r requirements.txt
python main.py
```

پنل در این آدرس در دسترس است: `http://localhost:8000/login`

> بعد از استقرار روی Render یا Railway، از این آدرس وارد پنل شوید: `https://yourdomain/login`

---

## ⚙️ متغیرهای محیطی

| متغیر | توضیح | پیش‌فرض |
|---|---|---|
| `ADMIN_PASSWORD` | رمز ورود به پنل | `admin` |
| `SECRET_KEY` | مخفی session و هش (خودکار تولید می‌شود) | تصادفی |
| `PORT` | پورت سرور | `8000` |

> ⚠️ **بعد از استقرار در محیط عمومی، `ADMIN_PASSWORD` را تغییر دهید.**

---

## 📦 وابستگی‌ها

```
fastapi==0.104.1
uvicorn==0.24.0
websockets==12.0
httpx==0.25.1
psutil==5.9.6
```

---

## 📌 آی‌پی استاتیک

| پلتفرم | آی‌پی استاتیک؟ | توضیحات |
|---|---|---|
| **Render** (رایگان) | ❌ خیر | آی‌پی‌های مشترک Cloudflare؛ تمیز و پایدار |
| **Render** (پولی) | ✅ بله | از پلان Starter به بالا در دسترس |
| **Railway** | ✅ اختیاری | از طریق Settings → Networking → Static IP فعال شود (ویژگی پولی) |

---

## 🔌 مسیرهای API

### احراز هویت
| متد | مسیر | توضیح |
|---|---|---|
| `POST` | `/api/login` | ورود با رمز |
| `POST` | `/api/logout` | خروج |
| `GET` | `/api/me` | بررسی وضعیت session |
| `POST` | `/api/change-password` | تغییر رمز ادمین |

### اینباندها
| متد | مسیر | توضیح |
|---|---|---|
| `GET` | `/api/links` | لیست همه اینباندها |
| `POST` | `/api/links` | ایجاد اینباند جدید |
| `PATCH` | `/api/links/{uid}` | ویرایش اینباند |
| `DELETE` | `/api/links/{uid}` | حذف اینباند |
| `GET` | `/api/links/{uid}/sub` | دریافت اطلاعات اشتراک |

**فیلدهای بدنه‌ی ایجاد/ویرایش** (پورت همیشه سمت سرور روی `443` ثابت می‌شه):

| فیلد | توضیح |
|---|---|
| `label`, `limit_value`, `limit_unit`, `max_connections`, `days_valid` | فیلدهای استاندارد محدودیت/انقضا |
| `vless_enabled` | `true`/`false` — فعال کردن VLESS روی این اینباند |
| `vless_transport` | `ws` \| `xhttp-packet-up` \| `xhttp-stream-up` |
| `vless_fingerprint` | فینگرپرینت uTLS برای بخش VLESS |
| `vless_alpn` | ALPN برای بخش VLESS (یکی از ۶ گزینه‌ی ثابت) |
| `trojan_enabled` | `true`/`false` — فعال کردن Trojan روی این اینباند |
| `trojan_transport` | `ws` \| `xhttp-packet-up` \| `xhttp-stream-up` |
| `trojan_fingerprint` | فینگرپرینت uTLS برای بخش Trojan |
| `trojan_alpn` | ALPN برای بخش Trojan |

حداقل یکی از `vless_enabled` / `trojan_enabled` باید `true` باشه (اگه هیچ‌کدوم ست نشه، پنل به‌صورت پیش‌فرض VLESS رو فعال می‌کنه).

### اشتراک
| متد | مسیر | توضیح |
|---|---|---|
| `GET` | `/sub/{uid}` | اشتراک Base64 (سازگار با v2ray/Hiddify) — شامل یک خط برای هر ترکیب پروتکل فعال × آدرس |

### آی‌پی تمیز
| متد | مسیر | توضیح |
|---|---|---|
| `GET` | `/api/addresses` | لیست آدرس‌های جایگزین |
| `POST` | `/api/addresses` | افزودن آدرس |
| `DELETE` | `/api/addresses/{index}` | حذف یک آدرس |
| `DELETE` | `/api/addresses` | حذف همه‌ی آدرس‌ها |
| `POST` | `/api/addresses/import/{source}` | ایمپورت یکجای آدرس‌ها از یک فایل محلی، در یک درخواست. `{source}` فعلاً `railway` رو پشتیبانی می‌کنه (از `railway_ips.txt` می‌خونه) |

### سیستم
| متد | مسیر | توضیح |
|---|---|---|
| `GET` | `/stats` | آمار سرور (نیاز به احراز هویت) |
| `GET` | `/health` | بررسی سلامت سرور |

---

## 🌐 فرمت کانفیگ‌ها

**VLESS:**
```
vless://<uuid>@<domain>:443?encryption=none&security=tls&type=ws&host=<domain>&path=/ws/vless/<uuid>&sni=<domain>&fp=chrome&alpn=http/1.1#Luffy-<name>
```

**Trojan:**
```
trojan://<uuid>@<domain>:443?security=tls&type=ws&host=<domain>&path=/ws/trojan/<uuid>&sni=<domain>&fp=chrome&alpn=http/1.1#Luffy-<name>
```

برای ترابرد XHTTP به‌جای این، از `type=xhttp` و `mode=packet-up` یا `mode=stream-up` استفاده می‌شه، با `path=/xhttp/<auth>/<mode>/<uuid>`.

> نکته: احراز هویت واقعی توسط همون `uuid` مخفیِ داخل مسیر URL انجام می‌شه — نه مقدار UUID/پسورد داخل هدر VLESS/Trojan که سمت سرور اصلاً چک نمی‌شه. این باعث می‌شه هر دو پروتکل یکسان و از یک پنل قابل مدیریت باشن.

---

## 🖥️ صفحات پنل

| صفحه | توضیح |
|---|---|
| **داشبورد** | ترافیک، آپتایم، CPU/حافظه، نمودار ساعتی |
| **اینباندها** | ایجاد/ویرایش/حذف کاربر، تنظیمات جدا برای هر پروتکل (VLESS/Trojan)، کپی کانفیگ، کد QR |
| **ترافیک** | آمار کلی |
| **آی‌پی تمیز** | مدیریت آدرس‌های جایگزین اشتراک، ایمپورت یکجا از Railway |
| **امنیت** | تغییر رمز |

---

## 📱 راه‌اندازی کلاینت (v2rayNG / Hiddify)

1. پنل را باز کنید و به **اینباندها** بروید.
2. روی **Sub** کلیک کنید تا لینک اشتراک کپی شود.
3. در اپ کلاینت، یک اشتراک جدید با آن لینک اضافه کنید.
4. اشتراک را آپدیت کنید — کانفیگ‌های هر پروتکل فعال به‌صورت خودکار نمایش داده می‌شوند.

---

## ⚠️ نکات مهم

- اینباندها، آدرس‌ها و تنظیمات در یک **دیتابیس SQLite محلی** ذخیره می‌شن، پس با ریستارت یا دیپلوی مجدد از بین نمی‌رن (تا وقتی دیسک/ولوم سرویس باقی بمونه).
- تسک keep-alive هر ۱۰ دقیقه به `/health` پینگ می‌زند تا از خواب رفتن سرویس رایگان Render جلوگیری کند.

---

## 📄 لایسنس

MIT — آزادانه استفاده و ویرایش کنید.

---

[چنل تلگراممون](https://t.me/Luffy_sh_op)
