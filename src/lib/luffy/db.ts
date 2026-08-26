/**
 * NexoVIP DB layer — mirrors LUFFY_PANEL's SQLite storage (panel.db)
 * on top of localStorage, with the same tables:
 *   links / custom_addresses / settings / sessions / auth / notifications
 *
 * The SECRET_KEY persistence trick from main.py is reproduced too: a random
 * secret is generated once and stored next to the "db" so password hashes
 * survive restarts (hashPassword = sha256(password + secret), like main.py).
 */

import {
  DEFAULT_ALPN_BY_TRANSPORT,
  DEFAULT_FINGERPRINT,
  DEFAULT_TRANSPORT,
  SESSION_TTL_SECONDS,
  defaultVariants,
  expiryIsoFromDays,
  quotaToBytes,
  variantsToLegacy,
  type LinkRow,
} from "./core";

const DB_KEY = "nexovip.panel.db";
const SECRET_KEY = "nexovip.secret.key";

export interface SessionRow {
  token: string;
  expires_at: number; // unix seconds, like main.py REAL column
}

export interface NotificationRow {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  seen: boolean;
  created_at: string;
}

interface DBShape {
  auth: { password_hash: string };
  links: LinkRow[];
  custom_addresses: string[];
  settings: Record<string, string>;
  sessions: SessionRow[];
  notifications: NotificationRow[];
}

// ── crypto helpers (Web Crypto replaces hashlib/secrets) ────────────────

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(byteLength = 32): string {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return bytesToBase64Url(arr);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** sha256(f"{pw}{secret}") — identical formula to main.py hash_password */
export async function hashPassword(pw: string, secret: string): Promise<string> {
  return sha256Hex(`${pw}${secret}`);
}

// ── SECRET_KEY persistence (mirrors _get_or_create_secret in main.py) ────

function getOrCreateSecret(): string {
  try {
    const existing = localStorage.getItem(SECRET_KEY);
    if (existing) return existing;
    const fresh = randomToken(32);
    localStorage.setItem(SECRET_KEY, fresh);
    return fresh;
  } catch {
    return randomToken(32);
  }
}

export const SECRET = getOrCreateSecret();

// ── Seed data ────────────────────────────────────────────────────────────

function makeDefaultLink(): LinkRow {
  const uuid = crypto.randomUUID();
  const variants = defaultVariants(); // vless-ws enabled, trojan off
  const [protocol, fingerprint, alpn] = variantsToLegacy(variants);
  return {
    uuid,
    label: "default",
    limit_bytes: quotaToBytes(15, "gb"),
    used_bytes: 0,
    max_connections: 0,
    created_at: new Date().toISOString(),
    active: true,
    expires_at: expiryIsoFromDays(30),
    protocol,
    fingerprint,
    alpn: DEFAULT_ALPN_BY_TRANSPORT[DEFAULT_TRANSPORT],
    port: 443,
    variants,
  };
}

function emptyDb(): DBShape {
  return {
    auth: { password_hash: "" }, // filled during init with hashed default pw
    links: [],
    custom_addresses: [],
    settings: {},
    sessions: [],
    notifications: [],
  };
}

// ── Load / save (get_db / init_db / save_db equivalents) ─────────────────

let db: DBShape = emptyDb();
let initialized = false;

export async function initDb(defaultPassword: string): Promise<void> {
  let loaded: DBShape | null = null;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) loaded = JSON.parse(raw) as DBShape;
  } catch {
    loaded = null;
  }

  db = loaded ?? emptyDb();
  db.links = Array.isArray(db.links) ? db.links : [];
  db.custom_addresses = Array.isArray(db.custom_addresses) ? db.custom_addresses : [];
  db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  db.settings = db.settings ?? {};
  db.auth = db.auth?.password_hash ? db.auth : { password_hash: "" };

  if (!db.auth.password_hash) {
    db.auth.password_hash = await hashPassword(defaultPassword, SECRET);
  }
  if (!loaded) {
    // ensure_default_link() equivalent on first run
    db.links.push(makeDefaultLink());
    createNotification(
      "system",
      "Welcome to NexoVIP",
      "Panel initialized. Default admin password is 'admin' — change it in Security.",
      null,
    );
  }
  clearExpiredSessions();
  persist();
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // storage full/unavailable — keep running in memory
  }
}

export function getDb(): DBShape {
  return db;
}

export function isInitialized(): boolean {
  return initialized;
}

/** Mirrors async save_db() from main.py */
export function saveDb(): void {
  persist();
}

// ── Sessions (create_session / is_valid_session / destroy_session) ───────

export const SESSION_COOKIE = "ren_session";

export function createSession(): SessionRow {
  const row: SessionRow = { token: randomToken(32), expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  db.sessions.push(row);
  persist();
  return row;
}

export function isValidSession(token: string | null | undefined): boolean {
  if (!token) return false;
  const row = db.sessions.find((s) => s.token === token);
  if (!row || row.expires_at < Date.now() / 1000) {
    destroySession(token ?? null);
    return false;
  }
  return true;
}

export function destroySession(token: string | null | undefined): void {
  if (!token) return;
  db.sessions = db.sessions.filter((s) => s.token !== token);
  persist();
}

export function clearExpiredSessions(): void {
  const now = Date.now() / 1000;
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.expires_at >= now);
  if (db.sessions.length !== before) persist();
}

// ── Notifications ────────────────────────────────────────────────────────

export function createNotification(
  type: string,
  title: string,
  message: string,
  link: string | null = null,
): NotificationRow {
  const row: NotificationRow = {
    id: (db.notifications[0]?.id ?? 0) + 1,
    type,
    title,
    message,
    link,
    seen: false,
    created_at: new Date().toISOString(),
  };
  db.notifications.unshift(row);
  db.notifications = db.notifications.slice(0, 50);
  return row;
}

export function listNotifications(): NotificationRow[] {
  return db.notifications;
}

export function unreadNotificationCount(): number {
  return db.notifications.filter((n) => !n.seen).length;
}

export function markAllNotificationsSeen(): void {
  for (const n of db.notifications) n.seen = true;
  persist();
}
