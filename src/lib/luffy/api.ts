/**
 * NexoVIP API layer — 1:1 port of LUFFY_PANEL's REST surface (main.py).
 *
 * Auth:         /api/login  /api/logout  /api/me  /api/change-password
 * Inbounds:     GET|POST /api/links   PATCH|DELETE /api/links/{uid}   GET /api/links/{uid}/sub
 * Subscription: /sub/{uid}  (base64 — one line per enabled protocol × address)
 * Clean IPs:    GET|POST /api/addresses   DELETE /api/addresses[/{index}]
 *               POST /api/addresses/import/railway
 * System:       GET /stats   GET /health
 *
 * Config URIs follow LUFFY_PANEL's documented formats:
 *   ws:    path=/ws/{auth}/{uuid}                       type=ws
 *   xhttp: path=/xhttp/{auth}/{mode}/{uuid}             type=xhtml mode=packet-up|stream-up
 * Port is always forced to 443. Fragment prefix is "Nexo-" (panel brand).
 */

import {
  ALPN_OPTIONS,
  DEFAULT_PORT,
  FINGERPRINTS,
  PANEL_VERSION,
  TRANSPORTS,
  expiryIsoFromDays,
  formatBytesShort,
  linkStatus,
  quotaToBytes,
  variantsFromBody,
  variantsToLegacy,
  daysLeft,
  type AuthType,
  type LinkBody,
  type LinkRow,
  type Transport,
  type Variants,
} from "./core";
import {
  SESSION_COOKIE,
  createNotification,
  createSession,
  destroySession,
  getDb,
  hashPassword,
  initDb,
  isValidSession,
  listNotifications,
  markAllNotificationsSeen,
  saveDb,
  SECRET,
} from "./db";

// ── tiny pub/sub so React re-renders on every mutation ──────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  saveDb();
  for (const l of listeners) l();
}

export const DEFAULT_ADMIN_PASSWORD = "admin"; // ADMIN_PASSWORD default in main.py

let initPromise: Promise<void> | null = null;

/** Mirrors FastAPI startup event (init_db + load_db + ensure_default_link) */
export function ready(): Promise<void> {
  if (!initPromise) {
    initPromise = initDb(DEFAULT_ADMIN_PASSWORD);
  }
  return initPromise;
}

function currentToken(): string | null {
  try {
    return localStorage.getItem(SESSION_COOKIE);
  } catch {
    return null;
  }
}

function requireAuth(): void {
  if (!isValidSession(currentToken())) {
    const err = new Error("unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
}

/** get_domain() equivalent — the panel's own host is used as host/sni */
export function getDomain(): string {
  if (typeof window === "undefined") return "localhost";
  return window.location.host || "localhost";
}

// ── Config URI generation (build_config_uri equivalents) ────────────────

function buildPath(auth: AuthType, transport: Transport, uuid: string): string {
  if (transport === "ws") return `/ws/${auth}/${uuid}`;
  const mode = transport === "xhttp-packet-up" ? "packet-up" : "stream-up";
  return `/xhttp/${auth}/${mode}/${uuid}`;
}

function buildUri(
  auth: AuthType,
  variant: { transport: Transport; fingerprint: string; alpn: string },
  uuid: string,
  address: string,
  fragment: string,
): string {
  const scheme = auth; // vless:// or trojan://
  const params = new URLSearchParams();
  if (auth === "vless") params.set("encryption", "none");
  params.set("security", "tls");
  if (variant.transport === "ws") {
    params.set("type", "ws");
  } else {
    params.set("type", "xhttp");
    params.set("mode", variant.transport === "xhttp-packet-up" ? "packet-up" : "stream-up");
  }
  params.set("host", address);
  params.set("path", buildPath(auth, variant.transport, uuid));
  params.set("sni", address);
  params.set("fp", variant.fingerprint);
  params.set("alpn", variant.alpn);
  return `${scheme}://${uuid}@${address}:${DEFAULT_PORT}?${params.toString()}#${encodeURIComponent(fragment)}`;
}

export interface ConfigLine {
  auth: AuthType;
  transport: Transport;
  address: string;
  uri: string;
}

/** One line per enabled protocol × configured address, like /sub/<uid> */
export function configLinesFor(link: LinkRow): ConfigLine[] {
  const addresses = [getDomain(), ...getDb().custom_addresses];
  const lines: ConfigLine[] = [];
  for (const auth of ["vless", "trojan"] as AuthType[]) {
    const variant = link.variants[auth];
    if (!variant?.enabled) continue;
    for (const address of addresses) {
      const suffix =
        address === getDomain() ? "" : `-${address.replace(/[^\w.-]/g, "")}`;
      const protoTag = link.variants.vless.enabled && link.variants.trojan.enabled ? `-${auth}` : "";
      lines.push({
        auth,
        transport: variant.transport,
        address,
        uri: buildUri(auth, variant, link.uuid, address, `Nexo-${link.label}${protoTag}${suffix}`),
      });
    }
  }
  return lines;
}

function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export interface SubscriptionInfo {
  uid: string;
  label: string;
  url: string;
  base64: string;
  lineCount: number;
  lines: string[];
}

// ── Views returned to the UI ────────────────────────────────────────────

export interface LinkView extends LinkRow {
  status: ReturnType<typeof linkStatus>;
  quotaText: string;
  usedText: string;
  usedPercent: number; // -1 when unlimited
  daysLeft: number | null;
  expiresText: string | null;
  configs: ConfigLine[];
  subscription: SubscriptionInfo;
}

function toView(link: LinkRow): LinkView {
  const now = Date.now();
  const unlimited = link.limit_bytes <= 0;
  const usedPercent = unlimited
    ? -1
    : Math.min(100, Math.round((link.used_bytes / link.limit_bytes) * 100));
  const lines = configLinesFor(link).map((c) => c.uri);
  return {
    ...link,
    variants: link.variants as Variants,
    status: linkStatus(link, now),
    quotaText: unlimited ? "∞" : formatBytesShort(link.limit_bytes),
    usedText: formatBytesShort(link.used_bytes),
    usedPercent,
    daysLeft: daysLeft(link.expires_at, now),
    expiresText: link.expires_at
      ? new Date(link.expires_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null,
    configs: configLinesFor(link),
    subscription: {
      uid: link.uuid,
      label: link.label,
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/sub/${link.uuid}`
          : `/sub/${link.uuid}`,
      base64: base64Encode(lines.join("\n")),
      lineCount: lines.length,
      lines,
    },
  };
}

// ── The api object — one method per REST endpoint ────────────────────────

async function findLink(uid: string): Promise<LinkRow> {
  const link = getDb().links.find((l) => l.uuid === uid);
  if (!link) {
    const err = new Error("link not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  return link;
}

export const api = {
  // ── POST /api/login ───────────────────────────────────────────────────
  async login(password: string): Promise<void> {
    await ready();
    const hash = await hashPassword(password, SECRET);
    if (hash !== getDb().auth.password_hash) {
      throw new Error("wrong-password");
    }
    const session = createSession();
    try {
      localStorage.setItem(SESSION_COOKIE, session.token);
    } catch {
      /* ignore */
    }
  },

  // ── POST /api/logout ─────────────────────────────────────────────────
  async logout(): Promise<void> {
    destroySession(currentToken());
    try {
      localStorage.removeItem(SESSION_COOKIE);
    } catch {
      /* ignore */
    }
  },

  // ── GET /api/me ──────────────────────────────────────────────────────
  me(): boolean {
    return isValidSession(currentToken());
  },

  // ── POST /api/change-password ────────────────────────────────────────
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    requireAuth();
    if (newPassword.length < 4) throw new Error("password-too-short");
    const db = getDb();
    const curHash = await hashPassword(currentPassword, SECRET);
    if (curHash !== db.auth.password_hash) throw new Error("wrong-password");
    db.auth.password_hash = await hashPassword(newPassword, SECRET);
    createNotification("security", "Password changed", "Admin password was updated.");
    emit();
  },

  // ── GET /api/links ───────────────────────────────────────────────────
  listLinks(): LinkView[] {
    requireAuth();
    return [...getDb().links]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toView);
  },

  async getLinkView(uid: string): Promise<LinkView> {
    requireAuth();
    return toView(await findLink(uid));
  },

  // ── GET /api/links/{uid}/sub ─────────────────────────────────────────
  async getSubscription(uid: string): Promise<SubscriptionInfo> {
    return (await this.getLinkView(uid)).subscription;
  },

  // ── POST /api/links ──────────────────────────────────────────────────
  async createLink(body: LinkBody): Promise<LinkView> {
    requireAuth();
    const label = String(body.label ?? "").trim();
    if (!label) throw new Error("label-required");

    const uuid = crypto.randomUUID();
    const variants = variantsFromBody(body); // sanitizes; defaults to VLESS on
    const [protocol, fingerprint, alpn] = variantsToLegacy(variants);

    const row: LinkRow = {
      uuid,
      label,
      limit_bytes: quotaToBytes(body.limit_value, body.limit_unit),
      used_bytes: 0,
      max_connections: Math.max(0, Math.floor(Number(body.max_connections ?? 0)) || 0),
      created_at: new Date().toISOString(),
      active: body.active !== false,
      expires_at: expiryIsoFromDays(body.days_valid),
      protocol,
      fingerprint,
      alpn,
      port: DEFAULT_PORT, // forced server-side, exactly like main.py
      variants,
    };
    getDb().links.push(row);
    createNotification("user", `User created: ${label}`, buildCreatedMessage(row));
    emit();
    return toView(row);
  },

  // ── PATCH /api/links/{uid} ───────────────────────────────────────────
  async updateLink(uid: string, body: LinkBody): Promise<LinkView> {
    requireAuth();
    const link = await findLink(uid);
    const db = getDb();

    if ("label" in body) {
      const label = String(body.label ?? "").trim();
      if (!label) throw new Error("label-required");
      link.label = label;
    }
    if ("limit_value" in body || "limit_unit" in body) {
      link.limit_bytes = quotaToBytes(body.limit_value, body.limit_unit);
      if (link.limit_bytes > 0 && link.used_bytes > link.limit_bytes) {
        link.used_bytes = link.limit_bytes;
      }
    }
    if ("max_connections" in body) {
      link.max_connections = Math.max(0, Math.floor(Number(body.max_connections ?? 0)) || 0);
    }
    if ("active" in body) link.active = Boolean(body.active);
    if ("days_valid" in body) link.expires_at = expiryIsoFromDays(body.days_valid);

    // Merge variant fields individually then sanitize (variants_from_body)
    const hadVariantFields = Object.keys(body).some((k) =>
      /^(vless|trojan)_/.test(k),
    );
    if (hadVariantFields) {
      link.variants = variantsFromBody(body, link.variants);
      const [protocol, fingerprint, alpn] = variantsToLegacy(link.variants);
      link.protocol = protocol;
      link.fingerprint = fingerprint;
      link.alpn = alpn;
    }

    void db; // db handle kept for parity with main.py save_db flow
    emit();
    return toView(link);
  },

  // ── DELETE /api/links/{uid} ──────────────────────────────────────────
  async deleteLink(uid: string): Promise<void> {
    requireAuth();
    const link = await findLink(uid);
    const db = getDb();
    db.links = db.links.filter((l) => l.uuid !== uid);
    createNotification("user", `User deleted: ${link.label}`, "The inbound and its configs were removed.");
    emit();
  },

  /** Panel convenience actions (PATCH under the hood) */
  async resetUsage(uid: string): Promise<LinkView> {
    requireAuth();
    const link = await findLink(uid);
    link.used_bytes = 0;
    emit();
    return toView(link);
  },

  async toggleActive(uid: string, active: boolean): Promise<LinkView> {
    return this.updateLink(uid, { active });
  },

  // ── GET /api/addresses ───────────────────────────────────────────────
  listAddresses(): string[] {
    requireAuth();
    return [...getDb().custom_addresses];
  },

  // ── POST /api/addresses ──────────────────────────────────────────────
  addAddress(address: string): { ok: boolean; error?: "invalid" | "exists" } {
    requireAuth();
    const addr = address.trim();
    if (!/^[\w.:-]+$/.test(addr) || addr.length < 3) return { ok: false, error: "invalid" };
    const db = getDb();
    if (db.custom_addresses.includes(addr)) return { ok: false, error: "exists" };
    db.custom_addresses.push(addr);
    createNotification("ip", "Clean IP added", `${addr} will be appended to all subscriptions.`);
    emit();
    return { ok: true };
  },

  // ── DELETE /api/addresses/{index} ────────────────────────────────────
  deleteAddress(index: number): void {
    requireAuth();
    const db = getDb();
    if (index >= 0 && index < db.custom_addresses.length) {
      db.custom_addresses.splice(index, 1);
      emit();
    }
  },

  // ── DELETE /api/addresses (all) ──────────────────────────────────────
  clearAddresses(): void {
    requireAuth();
    getDb().custom_addresses = [];
    createNotification("ip", "Clean IPs cleared", "All alternative addresses were removed.");
    emit();
  },

  // ── POST /api/addresses/import/railway ───────────────────────────────
  importAddresses(source: "railway"): { added: number; skipped: number } {
    requireAuth();
    if (source !== "railway") return { added: 0, skipped: 0 };
    const db = getDb();
    let added = 0;
    let skipped = 0;
    for (const ip of RAILWAY_IP_SAMPLE) {
      if (!db.custom_addresses.includes(ip)) {
        db.custom_addresses.push(ip);
        added += 1;
      } else {
        skipped += 1;
      }
    }
    if (added > 0)
      createNotification("ip", "Railway IPs imported", `${added} addresses imported from railway_ips.txt.`);
    emit();
    return { added, skipped };
  },

  // ── GET /stats ───────────────────────────────────────────────────────
  getStats(): StatsSnapshot {
    return snapshot();
  },

  // ── GET /health ──────────────────────────────────────────────────────
  health(): { status: "ok"; version: string } {
    return { status: "ok", version: PANEL_VERSION };
  },

  // Notifications helpers (notifications table)
  notifications: listNotifications,
  unreadCount: () => {
    requireAuth();
    return listNotifications().filter((n) => !n.seen).length;
  },
  markNotificationsSeen: () => {
    markAllNotificationsSeen();
    emit();
  },
};

function buildCreatedMessage(row: LinkRow): string {
  const quota = row.limit_bytes > 0 ? formatBytesShort(row.limit_bytes) : "Unlimited";
  const expiry = row.expires_at ? new Date(row.expires_at).toLocaleDateString() : "No expiry";
  const protos = [
    row.variants.vless.enabled ? "VLESS" : null,
    row.variants.trojan.enabled ? "Trojan" : null,
  ]
    .filter(Boolean)
    .join(" + ");
  return `Quota ${quota} · Expiry ${expiry} · ${protos}`;
}

/** Built-in railway_ips.txt sample used by the bulk-import button */
export const RAILWAY_IP_SAMPLE = [
  "69.46.46.10",
  "69.46.46.11",
  "69.46.46.12",
  "69.46.46.24",
  "69.46.46.35",
  "69.46.46.42",
  "69.46.46.57",
  "69.46.46.71",
];

// ══════════════════════════════════════════════════════════════════════
//  Live stats engine — mirrors GET /stats (psutil fields simulated in-browser)
// ══════════════════════════════════════════════════════════════════════

export interface HourlyPoint {
  label: string; // "14:00"
  down: number; // MB
  up: number; // MB
}

export interface StatsSnapshot {
  uptimeSeconds: number;
  cpu: number; // percent 0..100
  memory: number; // percent 0..100
  totalBytes: number;
  totalRequests: number;
  totalErrors: number;
  activeConnections: number;
  linksTotal: number;
  linksActive: number;
  linksExpired: number;
  hourly: HourlyPoint[];
  domain: string;
  version: string;
}

const startedAt = Date.now();
let cpu = 18;
let mem = 41;
let totalBytes = 0;
let totalRequests = 0;
let totalErrors = 0;
let activeConnections = 0;

/** Deterministic pseudo-noise so charts look organic but stay stable */
function noise(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}

function seedHourly(): HourlyPoint[] {
  const points: HourlyPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3_600_000);
    const hour = d.getHours();
    const seed = d.getDate() * 31 + hour;
    // busier during evening hours
    const eveningBoost = hour >= 17 && hour <= 24 ? 2.1 : 1;
    const base = noise(seed, 8, 60) * eveningBoost;
    points.push({
      label: `${String(hour).padStart(2, "0")}:00`,
      down: Math.round(base),
      up: Math.round(base * noise(seed + 7, 0.25, 0.55)),
    });
  }
  return points;
}

let hourly: HourlyPoint[] | null = null;

function tickInternal(): void {
  // smooth random walk bounded like a healthy server
  cpu = clamp(cpu + (Math.random() - 0.5) * 6, 4, 82);
  mem = clamp(mem + (Math.random() - 0.5) * 2.5, 28, 88);

  const db = getDb();
  let connections = 0;
  let grew = false;
  for (const link of db.links) {
    if (link.active && linkStatus(link) === "active") {
      connections += Math.max(1, Math.round(noise(Date.now() % 97_000 + link.uuid.charCodeAt(0), 1, 8)));
      // simulate live traffic consumption for demo realism (gateway traffic)
      if (link.limit_bytes <= 0 || link.used_bytes < link.limit_bytes) {
        const inc = Math.floor(Math.random() * 180_000); // ~up to 180 KB / tick
        link.used_bytes += inc;
        totalBytes += inc;
        grew = true;
      }
    }
  }
  activeConnections = connections;
  totalRequests += Math.floor(Math.random() * 40);
  if (Math.random() < 0.06) totalErrors += 1;

  if (!hourly) hourly = seedHourly();
  const bucket = hourly[hourly.length - 1];
  bucket.down += Math.random() * 1.5;
  bucket.up += Math.random() * 0.7;

  if (grew) saveDb();
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Called by the UI poller (~every 4s) to advance live metrics */
export function tickStats(): void {
  tickInternal();
}

function snapshot(): StatsSnapshot {
  if (!hourly) hourly = seedHourly();
  const db = getDb();
  const links = db.links;
  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    cpu: round1(cpu),
    memory: round1(mem),
    totalBytes,
    totalRequests,
    totalErrors,
    activeConnections,
    linksTotal: links.length,
    linksActive: links.filter((l) => linkStatus(l) === "active").length,
    linksExpired: links.filter((l) => ["expired", "quota"].includes(linkStatus(l))).length,
    hourly: hourly.map((h) => ({ label: h.label, down: Math.round(h.down), up: Math.round(h.up) })),
    domain: getDomain(),
    version: PANEL_VERSION,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// Re-export option lists for form selects
export { ALPN_OPTIONS, FINGERPRINTS, TRANSPORTS };
