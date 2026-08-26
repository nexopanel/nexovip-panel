/**
 * NexoVIP server-side config generator.
 *
 * The panel generates CLIENT links; this module generates the missing half —
 * the SERVER configuration that must run on the gateway host so those links
 * actually tunnel. Without it, any domain answers TCP ping (it's just a live
 * HTTPS endpoint) but the VLESS/Trojan handshake dies → "pings but never
 * connects".
 *
 * Model (matches LUFFY_PANEL deployments on Railway):
 *   - TLS is terminated by the edge (platform proxy / NGINX / Caddy).
 *   - Xray listens PLAINTEXT on internal ports, one inbound per
 *     (protocol × transport) group, aggregating every active link as a client.
 *   - WS inbounds accept ANY path (clients dial /ws/{auth}/{uuid}?ed=2048);
 *     the /ws/vless/… vs /ws/trojan/… prefix routes at the proxy.
 *   - XHTTP inbounds serve both packet-up and stream-up modes.
 */

import { AUTH_TYPES, TRANSPORTS, type AuthType, type LinkRow, type Transport } from "./core";

export interface ServerRoute {
  tag: string;
  auth: AuthType;
  transport: Transport;
  port: number;
  pathPrefix: string;
}

export interface GeneratedServerConfig {
  xray: object;
  nginx: string;
  caddy: string;
  routes: ServerRoute[];
  clientCount: number;
  isEmpty: boolean;
}

const BASE_PORT = 10500;

function pathPrefix(auth: AuthType, transport: Transport): string {
  return transport === "ws" ? `/ws/${auth}/` : `/xhttp/${auth}/`;
}

/** Aggregate every active link into protocol×transport groups. */
export function buildServerConfig(links: LinkRow[], domain: string): GeneratedServerConfig {
  const active = links.filter((l) => l.active);

  const groups = new Map<string, { auth: AuthType; transport: Transport; clients: object[] }>();
  let clientCount = 0;

  for (const link of active) {
    for (const auth of AUTH_TYPES) {
      const variant = link.variants[auth];
      if (!variant?.enabled) continue;
      const key = `${auth}-${variant.transport}`;
      if (!groups.has(key)) {
        groups.set(key, { auth, transport: variant.transport, clients: [] });
      }
      const group = groups.get(key)!;
      if (!group.clients.some((c) => (c as { id?: string }).id === link.uuid)) {
        group.clients.push(
          auth === "vless"
            ? { id: link.uuid, email: `${link.label || "user"}@nexovip`, level: 0 }
            : { password: link.uuid, email: `${link.label || "user"}@nexovip`, level: 0 },
        );
        clientCount += 1;
      }
    }
  }

  const routes: ServerRoute[] = [...groups.values()].map((g, i) => ({
    tag: `in-${g.auth}-${g.transport}`,
    auth: g.auth,
    transport: g.transport,
    port: BASE_PORT + i,
    pathPrefix: pathPrefix(g.auth, g.transport),
  }));

  if (routes.length === 0) {
    return { xray: {}, nginx: "", caddy: "", routes, clientCount: 0, isEmpty: true };
  }

  // ── Xray core config ────────────────────────────────────────────────
  const inbounds = [...groups.values()].map((g, i) => {
    const port = BASE_PORT + i;
    const network = g.transport === "ws" ? "ws" : "xhttp";
    return {
      tag: `in-${g.auth}-${network}`,
      listen: "0.0.0.0",
      port,
      protocol: g.auth,
      settings:
        g.auth === "vless"
          ? { clients: g.clients, decryption: "none" }
          : { clients: g.clients },
      streamSettings: {
        network,
        security: "none", // TLS terminates at the edge — do NOT enable here
        ...(network === "ws" ? { wsSettings: { acceptProxyProtocol: false } } : {}),
        ...(network === "xhttp" ? { xhttpSettings: {} } : {}),
      },
      sniffing: { enabled: true, destOverride: ["http", "tls", "quic"] },
    };
  });

  const xray = {
    log: { loglevel: "warning" },
    inbounds: [...inbounds],
    outbounds: [
      { tag: "direct", protocol: "freedom", settings: {} },
      { tag: "block", protocol: "blackhole", settings: { response: { type: "http" } } },
    ],
    routing: {
      domainStrategy: "AsIs",
      rules: [
        { type: "field", ip: ["geoip:private"], outboundTag: "block" },
      ],
    },
  };

  // ── Reverse-proxy snippets ─────────────────────────────────────────
  const wsHeaders = [
    "    proxy_http_version 1.1;",
    "    proxy_set_header Upgrade $http_upgrade;",
    '    proxy_set_header Connection "upgrade";',
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Real-IP $remote_addr;",
    "    proxy_read_timeout 300s;",
  ].join("\n");

  const nginxBlocks = routes
    .map((r) =>
      r.transport === "ws"
        ? [
            `  # ${r.auth.toUpperCase()} · WebSocket`,
            `  location ${r.pathPrefix} {`,
            `    proxy_pass http://127.0.0.1:${r.port};`,
            wsHeaders,
            `  }`,
          ].join("\n")
        : [
            `  # ${r.auth.toUpperCase()} · XHTTP`,
            `  location ${r.pathPrefix} {`,
            `    proxy_pass http://127.0.0.1:${r.port};`,
            "    proxy_http_version 1.1;",
            "    proxy_set_header Host $host;",
            "    proxy_buffering off;",
            "    proxy_read_timeout 300s;",
            `  }`,
          ].join("\n"),
    )
    .join("\n\n");

  const nginx = [
    `# NexoVIP reverse proxy for ${domain}`,
    `# TLS terminates here (443) — Xray runs plaintext behind it.`,
    `server {`,
    `  listen 443 ssl http2;`,
    `  server_name ${domain};`,
    ``,
    `  ssl_certificate     /etc/letsencrypt/live/${domain}/fullchain.pem;`,
    `  ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;`,
    ``,
    `  # Your panel / landing page`,
    `  location / {`,
    `    proxy_pass http://127.0.0.1:8080;   # ← change to your web app`,
    `    proxy_set_header Host $host;`,
    `  }`,
    ``,
    nginxBlocks,
    `\n}`,
  ].join("\n");

  const caddyHandles = routes
    .map((r) =>
      [
        `  handle ${r.pathPrefix}* {`,
        `    reverse_proxy 127.0.0.1:${r.port}`,
        `  }`,
      ].join("\n"),
    )
    .join("\n\n");

  const caddy = [
    `# NexoVIP reverse proxy for ${domain} — automatic HTTPS`,
    `${domain} {`,
    `  # Panel / landing page first`,
    `  handle {`,
    `    reverse_proxy 127.0.0.1:8080   # ← change to your web app`,
    `  }`,
    ``,
    caddyHandles,
    `}`,
  ].join("\n");

  return { xray, nginx, caddy, routes, clientCount, isEmpty: false };
}

export const SUPPORTED_TRANSPORTS = TRANSPORTS;

// ── One-command gateway installer ────────────────────────────────────
/**
 * Self-contained bash installer that turns ANY fresh Ubuntu 20.04+ /
 * Debian 11+ VPS into this panel's gateway in one command:
 *
 *     sudo bash nexovip-install.sh
 *
 * It embeds the user's exact Xray JSON and Caddyfile (domain baked in),
 * installs Xray-core + Caddy, registers systemd services, opens the
 * firewall and health-checks both daemons.
 */
export function buildInstallScript(domain: string, gen: GeneratedServerConfig): string {
  if (gen.isEmpty) return "";
  const d = domain.trim().toLowerCase() || "vpn.example.com";

  const caddyBody = [
    `${d} {`,
    ...gen.routes.map(
      (r) => `  handle ${r.pathPrefix}* {\n    reverse_proxy 127.0.0.1:${r.port}\n  }`,
    ),
    `  handle {`,
    `    respond "NexoVIP gateway online" 200`,
    `  }`,
    `}`,
  ].join("\n");

  const json = JSON.stringify(gen.xray, null, 2);

  return [
    `#!/usr/bin/env bash`,
    `# ============================================================`,
    `#  NexoVIP gateway — one-command installer (Xray + Caddy)`,
    `#  Target: fresh Ubuntu 20.04+ / Debian 11+. Run as root:`,
    `#      sudo bash nexovip-install.sh`,
    `#  Gateway domain baked into this build: ${d}`,
    `# ============================================================`,
    `set -euo pipefail`,
    ``,
    `if [ "$(id -u)" -ne 0 ]; then`,
    `  echo "✖ Run as root:  sudo bash $0"; exit 1`,
    `fi`,
    `command -v curl >/dev/null 2>&1 || { apt-get update -y && apt-get install -y curl; }`,
    ``,
    `echo "==> [1/5] Installing Xray-core"`,
    `bash -c "$(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install`,
    ``,
    `echo "==> [2/5] Writing Xray config (${gen.routes.length} inbounds · ${gen.clientCount} clients)"`,
    `mkdir -p /usr/local/etc/xray`,
    `cat > /usr/local/etc/xray/config.json <<'NEXO_JSON'`,
    json,
    `NEXO_JSON`,
    ``,
    `echo "==> [3/5] Installing Caddy web server (automatic HTTPS)"`,
    `if ! command -v caddy >/dev/null 2>&1; then`,
    `  apt-get update -y`,
    `  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https ca-certificates curl gnupg`,
    `  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg`,
    `  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null`,
    `  apt-get update -y && apt-get install -y caddy`,
    `fi`,
    ``,
    `echo "==> [4/5] Writing Caddyfile for ${d}"`,
    `cat > /etc/caddy/Caddyfile <<'NEXO_CADDY'`,
    caddyBody,
    `NEXO_CADDY`,
    ``,
    `echo "==> [5/5] Starting services + firewall"`,
    `systemctl enable --now xray caddy`,
    `systemctl restart xray caddy`,
    `if command -v ufw >/dev/null 2>&1; then`,
    `  ufw allow 80/tcp  >/dev/null 2>&1 || true`,
    `  ufw allow 443/tcp >/dev/null 2>&1 || true`,
    `fi`,
    ``,
    `sleep 2`,
    `echo`,
    `if systemctl is-active --quiet xray; then echo "✔ xray: running"; else echo "✖ xray failed:"; journalctl -u xray -n 20 --no-pager; fi`,
    `if systemctl is-active --quiet caddy; then echo "✔ caddy: running"; else echo "✖ caddy failed:"; journalctl -u caddy -n 20 --no-pager; fi`,
    ``,
    `cat <<'NEXO_DONE'`,
    ``,
    `============================================================`,
    ` ✅ Gateway deployed!`,
    ` Next: open NexoVIP → Clean IPs → set "${d}" as the`,
    ` Gateway domain, save, then press "Run diagnostics".`,
    `============================================================`,
    `NEXO_DONE`,
  ].join("\n") + "\n";
}
