/**
 * NexoVIP backend core — faithful TypeScript port of the LUFFY_PANEL
 * backend model (github.com/luffy-sh-op/LUFFY_PANEL, main.py).
 *
 * Mirrors: AUTH_TYPES / TRANSPORTS / FINGERPRINTS / ALPN_OPTIONS,
 * the per-link `variants` structure (each inbound can serve VLESS and/or
 * Trojan independently, each with its own transport/fingerprint/ALPN),
 * port forced to 443, quota/expiry byte math, and every sanitizer.
 */

// ── Protocol model (identical to LUFFY_PANEL) ───────────────────────────

export const AUTH_TYPES = ["vless", "trojan"] as const;
export type AuthType = (typeof AUTH_TYPES)[number];

export const TRANSPORTS = [
  "ws",
  "xhttp-packet-up",
  "xhttp-stream-up",
] as const;
export type Transport = (typeof TRANSPORTS)[number];

/** Stored protocol value is always "{auth}-{transport}" */
export const PROTOCOLS: readonly string[] = AUTH_TYPES.flatMap((a) =>
  TRANSPORTS.map((t) => `${a}-${t}`),
);
export const DEFAULT_AUTH: AuthType = "vless";
export const DEFAULT_TRANSPORT: Transport = "ws";
export const DEFAULT_PROTOCOL = `${DEFAULT_AUTH}-${DEFAULT_TRANSPORT}`;

export function splitProtocol(protocol: string): [AuthType, Transport] {
  const normalized = normalizeProtocol(protocol);
  const [auth, transport] = normalized.split("-") as [AuthType, Transport];
  return [auth, transport];
}

/** Legacy values ("ws" without auth prefix) are upgraded to "vless-{t}" */
export function normalizeProtocol(value: string | null | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if ((PROTOCOLS as readonly string[]).includes(v)) return v;
  if ((TRANSPORTS as readonly string[]).includes(v)) return `vless-${v}`;
  return DEFAULT_PROTOCOL;
}

// ── uTLS fingerprints & ALPN (fixed sets, identical to LUFFY_PANEL) ─────

export const FINGERPRINTS = [
  "chrome",
  "firefox",
  "safari",
  "ios",
  "android",
  "edge",
  "360",
  "qq",
  "random",
  "randomized",
] as const;
export type Fingerprint = (typeof FINGERPRINTS)[number];
export const DEFAULT_FINGERPRINT: Fingerprint = "chrome";

export const ALPN_OPTIONS = [
  "h3",
  "h2",
  "http/1.1",
  "h3,h2,http/1.1",
  "h3,h2",
  "h2,http/1.1",
] as const;
export type Alpn = (typeof ALPN_OPTIONS)[number];

/** Default ALPN by transport (independent of auth type), like main.py */
export const DEFAULT_ALPN_BY_TRANSPORT: Record<Transport, Alpn> = {
  ws: "http/1.1",
  "xhttp-packet-up": "h2,http/1.1",
  "xhttp-stream-up": "h2,http/1.1",
};

// ── Constants ────────────────────────────────────────────────────────────

/** Port is forced to 443 for every config, exactly like LUFFY_PANEL */
export const DEFAULT_PORT = 443;
export const UNLIMITED_QUOTA_BYTES = 53_687_091_200_000;
export const PANEL_VERSION = "1.0.0";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const GB_BYTES = 1024 ** 3;
export const MB_BYTES = 1024 ** 2;

// ── Variants structure — each link serves VLESS and/or Trojan ────────────

export interface Variant {
  enabled: boolean;
  transport: Transport;
  fingerprint: Fingerprint;
  alpn: string;
}

export type Variants = Record<AuthType, Variant>;

export function defaultVariants(): Variants {
  return {
    vless: {
      enabled: true,
      transport: DEFAULT_TRANSPORT,
      fingerprint: DEFAULT_FINGERPRINT,
      alpn: DEFAULT_ALPN_BY_TRANSPORT[DEFAULT_TRANSPORT],
    },
    trojan: {
      enabled: false,
      transport: DEFAULT_TRANSPORT,
      fingerprint: DEFAULT_FINGERPRINT,
      alpn: DEFAULT_ALPN_BY_TRANSPORT[DEFAULT_TRANSPORT],
    },
  };
}

export function sanitizeVariant(raw: unknown, auth: AuthType): Variant {
  const v = (raw ?? {}) as Partial<Variant>;
  let transport = String(v.transport ?? DEFAULT_TRANSPORT).trim().toLowerCase() as Transport;
  if (!(TRANSPORTS as readonly string[]).includes(transport)) transport = DEFAULT_TRANSPORT;

  let fingerprint = String(v.fingerprint ?? DEFAULT_FINGERPRINT).trim().toLowerCase() as Fingerprint;
  if (!(FINGERPRINTS as readonly string[]).includes(fingerprint)) fingerprint = DEFAULT_FINGERPRINT;

  let alpn = String(v.alpn ?? "").trim();
  if (!(ALPN_OPTIONS as readonly string[]).includes(alpn))
    alpn = DEFAULT_ALPN_BY_TRANSPORT[transport];

  return { enabled: Boolean(v.enabled), transport, fingerprint, alpn: alpn && auth ? alpn : alpn };
}

/** At least one variant must stay enabled (defaults to VLESS) — like main.py */
export function sanitizeVariants(variants: unknown): Variants {
  const raw = (variants ?? {}) as Partial<Record<AuthType, unknown>>;
  const result = {
    vless: sanitizeVariant(raw.vless, "vless"),
    trojan: sanitizeVariant(raw.trojan, "trojan"),
  } satisfies Variants;
  if (!result.vless.enabled && !result.trojan.enabled) result.vless.enabled = true;
  return result;
}

/** Upgrade old single-column rows (protocol/fingerprint/alpn) to variants */
export function variantsFromLegacy(
  protocol: string,
  fingerprint: string,
  alpn: string,
): Variants {
  const [auth, transport] = splitProtocol(protocol);
  const variants = defaultVariants();
  variants.vless.enabled = false;
  variants.trojan.enabled = false;
  variants[auth] = {
    enabled: true,
    transport,
    fingerprint: ((FINGERPRINTS as readonly string[]).includes(fingerprint)
      ? fingerprint
      : DEFAULT_FINGERPRINT) as Fingerprint,
    alpn: (ALPN_OPTIONS as readonly string[]).includes(alpn)
      ? alpn
      : DEFAULT_ALPN_BY_TRANSPORT[transport],
  };
  return variants;
}

/** Fill legacy columns purely for external-tool compatibility */
export function variantsToLegacy(variants: Variants): [string, string, string] {
  for (const auth of AUTH_TYPES) {
    const v = variants?.[auth];
    if (v?.enabled)
      return [`${auth}-${v.transport}`, v.fingerprint, v.alpn];
  }
  return [DEFAULT_PROTOCOL, DEFAULT_FINGERPRINT, ""];
}

// ── Link (inbound) row — identical columns to LUFFY SQLite `links` ───────

export interface LinkRow {
  uuid: string; // PRIMARY KEY
  label: string;
  limit_bytes: number; // 0 = unlimited
  used_bytes: number;
  max_connections: number; // 0 = unlimited
  created_at: string; // ISO timestamp
  active: boolean;
  expires_at: string | null; // ISO timestamp or null
  protocol: string; // "{auth}-{transport}" legacy column
  fingerprint: string; // legacy column
  alpn: string; // legacy column
  port: number; // always 443
  variants: Variants;
}

export type LimitUnit = "gb" | "mb";

/** Create/edit request body — same field names as LUFFY REST API */
export interface LinkBody {
  label?: string;
  limit_value?: number;
  limit_unit?: LimitUnit;
  max_connections?: number;
  days_valid?: number;
  active?: boolean;
  vless_enabled?: boolean;
  vless_transport?: Transport;
  vless_fingerprint?: Fingerprint;
  vless_alpn?: Alpn;
  trojan_enabled?: boolean;
  trojan_transport?: Transport;
  trojan_fingerprint?: Fingerprint;
  trojan_alpn?: Alpn;
}

export function quotaToBytes(
  limitValue: number | undefined,
  unit: LimitUnit | undefined,
): number {
  const value = Number(limitValue ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0; // unlimited
  const mult = unit === "mb" ? MB_BYTES : GB_BYTES;
  return Math.round(value * mult);
}

export function expiryIsoFromDays(days: number | undefined): string | null {
  const d = Math.floor(Number(days ?? 0));
  if (!Number.isFinite(d) || d <= 0) return null; // no expiry
  return new Date(Date.now() + d * 86_400_000).toISOString();
}

/** Merge PATCH body into existing variants (per-field), then sanitize */
export function variantsFromBody(body: LinkBody, base?: Variants): Variants {
  const cur: Variants =
    base ?? defaultVariants();
  const merged: Record<AuthType, Partial<Variant>> = {
    vless: { ...cur.vless },
    trojan: { ...cur.trojan },
  };
  for (const auth of AUTH_TYPES) {
    const m = merged[auth];
    if (`${auth}_enabled` in body) m.enabled = Boolean(body[`${auth}_enabled`]);
    if (`${auth}_transport` in body) m.transport = body[`${auth}_transport`] as Transport;
    if (`${auth}_fingerprint` in body)
      m.fingerprint = body[`${auth}_fingerprint`] as Fingerprint;
    if (`${auth}_alpn` in body) m.alpn = body[`${auth}_alpn`] as string;
  }
  return sanitizeVariants({
    vless: { ...merged.vless },
    trojan: { ...merged.trojan },
  });
}

// ── Derived status (drives badges across the UI) ─────────────────────────

export type LinkStatus = "active" | "disabled" | "expired" | "quota";

export function linkStatus(link: LinkRow, now = Date.now()): LinkStatus {
  if (!link.active) return "disabled";
  if (link.expires_at && new Date(link.expires_at).getTime() < now) return "expired";
  if (link.limit_bytes > 0 && link.used_bytes >= link.limit_bytes) return "quota";
  return "active";
}

export function formatBytesShort(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / 1024 ** i;
  return `${val >= 100 ? Math.round(val) : val.toFixed(val >= 10 ? 1 : 2)} ${units[i]}`;
}

export function daysLeft(expiresAt: string | null, now = Date.now()): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000));
}
