/**
 * NexoVIP i18n — full English / Persian (Farsi) UI translation with
 * automatic RTL/LTR switching. The selected language persists in
 * localStorage and drives <html lang dir> plus the FA font class.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "fa";

const en = {
  // Brand & common
  brand: "NexoVIP",
  brandTag: "VPN Control Center",
  langName: "English",
  otherLangName: "فارسی",
  copy: "Copy",
  copied: "Copied to clipboard",
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  delete: "Delete",
  edit: "Edit",
  view: "View",
  confirm: "Confirm",
  unlimited: "Unlimited",
  never: "Never",
  days: "days",
  dayLeft: "day left",
  daysLeft: "days left",
  loading: "Loading…",
  error: "Something went wrong",

  // Landing
  navFeatures: "Features",
  navProtocols: "Protocols",
  navDashboard: "Dashboard",
  heroBadge: "Next-Generation VPN Control Center",
  heroTitle1: "Command your network like a",
  heroTitleAccent: "pro",
  heroSubtitle:
    "NexoVIP is a premium management panel for VLESS & Trojan configurations — build, monitor, and distribute subscriptions with real-time traffic intelligence.",
  heroCta: "Enter Control Center",
  heroSecondary: "Learn more",
  liveNow: "LIVE",
  featureUsers: "Config Builder",
  featureUsersDesc:
    "Generate VLESS / Trojan inbounds with per-link quota, expiry, transport, fingerprint and ALPN — port locked to 443.",
  featureMonitor: "Live Monitoring",
  featureMonitorDesc:
    "Real-time CPU, memory, connection and bandwidth telemetry rendered as smooth animated charts.",
  featureIps: "Clean IP Pool",
  featureIpsDesc:
    "Attach alternative clean addresses to every subscription with one click, including bulk Railway import.",
  featureSubs: "Subscription Links",
  featureSubsDesc:
    "Every config exposes an instant /sub endpoint — base64 encoded, ready for any modern client.",
  featureSecure: "Hardened Security",
  featureSecureDesc:
    "Session-token authentication, hashed credentials and a private admin area keep the panel yours alone.",
  featureI18n: "English · فارسی",
  featureI18nDesc:
    "Full RTL support and complete interface translation — switch languages instantly from anywhere.",
  protocolsTitle: "Engineered for modern tunnels",
  protocolsSub: "VLESS & Trojan over WebSocket or XHTTP with uTLS fingerprints.",
  statLinks: "Managed configs",
  statUptime: "Uptime target",
  statProtocols: "Protocol variants",
  footerRights: "All rights reserved.",

  // Auth
  authWelcome: "Admin Access",
  authSubtitle: "Sign in to the NexoVIP control center",
  authPassword: "Admin password",
  authPasswordPlaceholder: "••••••••",
  authLogin: "Unlock Panel",
  authWrongPassword: "Incorrect password. Try again.",
  authHint: "Default password is “admin” — change it in Security after first login.",
  backToSite: "Back to home",
  secureFooter: "Secured session · NexoVIP",

  // Shell / nav
  navOverview: "Overview",
  navLinks: "Configs",
  navAddresses: "Clean IPs",
  navSecurity: "Security",
  logout: "Log out",
  notifications: "Notifications",
  markAllSeen: "Mark all seen",
  noNotifications: "No notifications yet",
  welcomeBack: "Welcome back",

  // Overview
  ovTitle: "System Overview",
  ovSubtitle: "Real-time telemetry of your VPN core",
  statTotal: "Total configs",
  statActive: "Active",
  statIssues: "Expired / exhausted",
  statTraffic: "Session traffic",
  cpuUsage: "CPU usage",
  memoryUsage: "Memory",
  connections: "Live connections",
  uptime: "Panel uptime",
  domain: "Serving domain",
  version: "Version",
  chart24h: "Bandwidth · last 24 hours",
  download: "Download",
  upload: "Upload",
  requests: "Requests served",
  errorsCaught: "Errors caught",
  systemHealth: "System Health",
  liveFeedNote: "Metrics refresh automatically every few seconds.",

  // Links tab
  linksTitle: "Configs & Users",
  linksSubtitle: "Create, manage and distribute VPN configurations",
  newConfig: "New Config",
  searchPlaceholder: "Search by name…",
  thName: "Name",
  thStatus: "Status",
  thQuota: "Quota",
  thExpiry: "Expiry",
  thProtocols: "Protocols",
  thActions: "Actions",
  statusActive: "Active",
  statusDisabled: "Disabled",
  statusExpired: "Expired",
  statusQuota: "Exhausted",
  emptyLinks: "No configs yet — create your first one.",
  noResults: "No matching configs.",

  // Config builder dialog
  builderNew: "Create Configuration",
  builderEdit: "Edit Configuration",
  fieldLabel: "Display name",
  labelPlaceholder: "e.g. alice-premium",
  fieldQuota: "Traffic quota",
  quotaValue: "Amount",
  quotaUnit: "Unit",
  quotaUnlimited: "Unlimited quota",
  fieldDays: "Validity (days)",
  daysPlaceholder: "Empty = never expires",
  fieldMaxConn: "Max connections",
  maxConnHint: "0 = unlimited",
  sectionVless: "VLESS inbound",
  sectionTrojan: "Trojan inbound",
  enabled: "Enabled",
  transport: "Transport",
  fingerprint: "uTLS fingerprint",
  alpn: "ALPN",
  labelRequired: "A display name is required.",
  configCreated: "Configuration created",
  configUpdated: "Configuration updated",
  deleteLinkTitle: "Delete this configuration?",
  deleteLinkBody: "This permanently removes the inbound and every generated link. This action cannot be undone.",

  // Link details
  detailsTitle: "Configuration Details",
  generatedConfigs: "Generated links",
  subscriptionUrl: "Subscription URL",
  subBase64: "Base64 subscription body",
  copyAll: "Copy all",
  resetUsage: "Reset usage",
  usageReset: "Usage counter reset",
  enable: "Enable",
  disable: "Disable",

  // Addresses tab
  ipsTitle: "Clean IPs",
  ipsSubtitle:
    "Alternative addresses appended to every subscription alongside the panel domain.",
  mainDomain: "Main domain (automatic)",
  addIpPlaceholder: "ip-or-domain.example.com",
  addIp: "Add address",
  ipInvalid: "Invalid address format.",
  ipExists: "Address already exists.",
  ipAdded: "Address added",
  importRailway: "Import Railway sample",
  clearAll: "Clear all",
  ipsCleared: "All alternative addresses removed",
  emptyIps: "No alternative addresses yet.",

  // Security tab
  secTitle: "Security",
  secSubtitle: "Manage admin credentials and active sessions",
  currentPassword: "Current password",
  newPassword: "New password",
  confirmPassword: "Confirm new password",
  changePassword: "Change password",
  passwordChanged: "Password updated successfully",
  passwordMismatch: "New passwords do not match.",
  passwordTooShort: "New password must be at least 4 characters.",
  passwordWrongCurrent: "Current password is incorrect.",
  sessionsInfo: "Sessions expire automatically after 7 days of issue.",
};

export type DictKey = keyof typeof en;

const fa: Record<DictKey, string> = {
  brand: "نکسو‌وی‌آی‌پی",
  brandTag: "مرکز کنترل وی‌پی‌ان",
  langName: "فارسی",
  otherLangName: "English",
  copy: "کپی",
  copied: "در کلیپ‌بورد کپی شد",
  save: "ذخیره",
  cancel: "انصراف",
  close: "بستن",
  delete: "حذف",
  edit: "ویرایش",
  view: "مشاهده",
  confirm: "تأیید",
  unlimited: "نامحدود",
  never: "بدون انقضا",
  days: "روز",
  dayLeft: "روز باقی‌مانده",
  daysLeft: "روز باقی‌مانده",
  loading: "در حال بارگذاری…",
  error: "خطایی رخ داد",

  navFeatures: "امکانات",
  navProtocols: "پروتکل‌ها",
  navDashboard: "داشبورد",
  heroBadge: "مرکز کنترل نسل جدید وی‌پی‌ان",
  heroTitle1: "شبکه‌ات را مثل یک ",
  heroTitleAccent: "حرفه‌ای",
  heroSubtitle:
    "نکسو‌وی‌آی‌پی یک پنل مدیریت پریمیوم برای کانفیگ‌های VLESS و تروجان است — بسازید، مانیتور کنید و اشتراک‌ها را با تحلیل ترافیک لحظه‌ای توزیع کنید.",
  heroCta: "ورود به مرکز کنترل",
  heroSecondary: "بیشتر بدانید",
  liveNow: "زنده",
  featureUsers: "سازنده کانفیگ",
  featureUsersDesc:
    "ساخت اینباند VLESS / تروجان با سهمیه، انقضا، ترنسپورت، فینگرپرنت و ALPN مستقل برای هر لینک — پورت همیشه ۴۴۳.",
  featureMonitor: "مانیتورینگ زنده",
  featureMonitorDesc:
    "تلهمتری لحظه‌ای CPU، حافظه، اتصالات و پهنای‌باند در نمودارهای متحرک و روان.",
  featureIps: "استخر آی‌پی تمیز",
  featureIpsDesc:
    "افزودن آدرس‌های تمیز جایگزین به همه اشتراک‌ها با یک کلیک، همراه با ورود گروهی Railway.",
  featureSubs: "لینک اشتراک",
  featureSubsDesc:
    "هر کانفیگ یک آدرس /sub فوری دارد — بیس۶۴ و سازگار با تمام کلاینت‌های مدرن.",
  featureSecure: "امنیت سخت‌گیرانه",
  featureSecureDesc:
    "احراز هویت با توکن نشست، هش شدن رمزها و ناحیه مدیریتی خصوصی؛ پنل فقط از آنِ شماست.",
  featureI18n: "انگلیسی · فارسی",
  featureI18nDesc:
    "پشتیبانی کامل راست‌چین و ترجمه کامل رابط کاربری — تعویض زبان در هر لحظه.",
  protocolsTitle: "مهندسی‌شده برای تونل‌های مدرن",
  protocolsSub: "VLESS و تروجان روی WebSocket یا XHTTP همراه با فینگرپرنت uTLS.",
  statLinks: "کانفیگ مدیریت‌شده",
  statUptime: "هدف آپتایم",
  statProtocols: "تنوع پروتکل",
  footerRights: "تمام حقوق محفوظ است.",

  authWelcome: "دسترسی مدیر",
  authSubtitle: "برای ورود به مرکز کنترل نکسو‌وی‌آی‌پی وارد شوید",
  authPassword: "رمز عبور مدیر",
  authPasswordPlaceholder: "••••••••",
  authLogin: "باز کردن پنل",
  authWrongPassword: "رمز عبور اشتباه است. دوباره تلاش کنید.",
  authHint: "رمز پیش‌فرض «admin» است — پس از ورود آن را در بخش امنیت تغییر دهید.",
  backToSite: "بازگشت به خانه",
  secureFooter: "نشست امن · نکسو‌وی‌آی‌پی",

  navOverview: "نمای کلی",
  navLinks: "کانفیگ‌ها",
  navAddresses: "آی‌پی تمیز",
  navSecurity: "امنیت",
  logout: "خروج",
  notifications: "اعلان‌ها",
  markAllSeen: "خواندن همه",
  noNotifications: "هنوز اعلانی وجود ندارد",
  welcomeBack: "خوش آمدید",

  ovTitle: "نمای کلی سیستم",
  ovSubtitle: "تلهمتری لحظه‌ای هسته وی‌پی‌ان شما",
  statTotal: "کل کانفیگ‌ها",
  statActive: "فعال",
  statIssues: "منقضی / تمام‌شده",
  statTraffic: "ترافیک این نشست",
  cpuUsage: "مصرف CPU",
  memoryUsage: "حافظه",
  connections: "اتصالات زنده",
  uptime: "آپتایم پنل",
  domain: "دامنه سرویس‌دهنده",
  version: "نسخه",
  chart24h: "پهنای‌باند · ۲۴ ساعت گذشته",
  download: "دانلود",
  upload: "آپلود",
  requests: "درخواست‌های پردازش‌شده",
  errorsCaught: "خطاهای ثبت‌شده",
  systemHealth: "سلامت سیستم",
  liveFeedNote: "معیارها هر چند ثانیه به‌صورت خودکار به‌روز می‌شوند.",

  linksTitle: "کانفیگ‌ها و کاربران",
  linksSubtitle: "ساخت، مدیریت و توزیع کانفیگ‌های وی‌پی‌ان",
  newConfig: "کانفیگ جدید",
  searchPlaceholder: "جستجو بر اساس نام…",
  thName: "نام",
  thStatus: "وضعیت",
  thQuota: "سهمیه",
  thExpiry: "انقضا",
  thProtocols: "پروتکل‌ها",
  thActions: "عملیات",
  statusActive: "فعال",
  statusDisabled: "غیرفعال",
  statusExpired: "منقضی",
  statusQuota: "اتمام سهمیه",
  emptyLinks: "هنوز کانفیگی نیست — اولین کانفیگ را بسازید.",
  noResults: "کانفیگ مطابقی یافت نشد.",

  builderNew: "ساخت کانفیگ",
  builderEdit: "ویرایش کانفیگ",
  fieldLabel: "نام نمایشی",
  labelPlaceholder: "مثلاً alice-premium",
  fieldQuota: "سهمیه ترافیک",
  quotaValue: "مقدار",
  quotaUnit: "واحد",
  quotaUnlimited: "سهمیه نامحدود",
  fieldDays: "اعتبار (روز)",
  daysPlaceholder: "خالی = بدون انقضا",
  fieldMaxConn: "حداکثر اتصال",
  maxConnHint: "۰ = نامحدود",
  sectionVless: "اینباند VLESS",
  sectionTrojan: "اینباند تروجان",
  enabled: "فعال",
  transport: "ترنسپورت",
  fingerprint: "فینگرپرنت uTLS",
  alpn: "ALPN",
  labelRequired: "نام نمایشی الزامی است.",
  configCreated: "کانفیگ ساخته شد",
  configUpdated: "کانفیگ به‌روزرسانی شد",
  deleteLinkTitle: "این کانفیگ حذف شود؟",
  deleteLinkBody: "این عمل اینباند و تمام لینک‌های تولیدشده را برای همیشه حذف می‌کند و قابل بازگشت نیست.",

  detailsTitle: "جزئیات کانفیگ",
  generatedConfigs: "لینک‌های تولیدشده",
  subscriptionUrl: "آدرس اشتراک",
  subBase64: "محتوای Base64 اشتراک",
  copyAll: "کپی همه",
  resetUsage: "صفر کردن مصرف",
  usageReset: "شمارنده مصرف صفر شد",
  enable: "فعال‌سازی",
  disable: "غیرفعال‌سازی",

  ipsTitle: "آی‌پی‌های تمیز",
  ipsSubtitle:
    "آدرس‌های جایگزین که در کنار دامنه اصلی به همه اشتراک‌ها اضافه می‌شوند.",
  mainDomain: "دامنه اصلی (خودکار)",
  addIpPlaceholder: "ip-or-domain.example.com",
  addIp: "افزودن آدرس",
  ipInvalid: "قالب آدرس نامعتبر است.",
  ipExists: "این آدرس قبلاً اضافه شده است.",
  ipAdded: "آدرس اضافه شد",
  importRailway: "ورود نمونه Railway",
  clearAll: "پاک کردن همه",
  ipsCleared: "همه آدرس‌های جایگزین حذف شدند",
  emptyIps: "هنوز آدرس جایگزینی وجود ندارد.",

  secTitle: "امنیت",
  secSubtitle: "مدیریت اعتبارنامه مدیر و نشست‌های فعال",
  currentPassword: "رمز عبور فعلی",
  newPassword: "رمز عبور جدید",
  confirmPassword: "تکرار رمز جدید",
  changePassword: "تغییر رمز عبور",
  passwordChanged: "رمز عبور با موفقیت به‌روزرسانی شد",
  passwordMismatch: "رمزهای جدید یکسان نیستند.",
  passwordTooShort: "رمز جدید باید حداقل ۴ کاراکتر باشد.",
  passwordWrongCurrent: "رمز عبور فعلی اشتباه است.",
  sessionsInfo: "نشست‌ها به‌طور خودکار پس از ۷ روز منقضی می‌شوند.",
};

interface I18nContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LANG_KEY = "nexovip.lang";

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "fa" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "fa" ? "rtl" : "ltr";
    root.classList.toggle("fa", lang === "fa");
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: DictKey): string => {
      if (lang === "fa") return fa[key] ?? String(key);
      return String(en[key] ?? key);
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, dir: lang === "fa" ? "rtl" : "ltr", setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
