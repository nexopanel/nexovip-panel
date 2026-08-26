/**
 * GatewayTools — answers "why do my configs give TCP ping but no real ping?"
 *
 * Two tools side by side:
 *  1. LIVE DIAGNOSTICS — probes the gateway domain like a VPN client would:
 *     · HTTPS probe   → is anything alive on 443 at all (TCP/TLS)?
 *     · TUNNEL probe  → does a WebSocket upgrade succeed on the exact
 *                       /ws/{auth}/{uuid}?ed=2048 path a client dials?
 *     A normal website passes #1 and fails #2 — that IS the reported
 *     symptom: TCP ping OK, real handshake dead.
 *  2. SERVER CONFIG — generates the matching Xray backend (+ NGINX/Caddy
 *    snippets) from all active configs so the gateway can actually serve
 *    the tunnel. Deploy it on the gateway host and links start working.
 */

import { CopyButton } from "@/components/nexo-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AUTH_TYPES,
  type LinkRow,
} from "@/lib/luffy/core";
import { getDb } from "@/lib/luffy/db";
import { buildServerConfig, type GeneratedServerConfig } from "@/lib/luffy/serverconfig";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  Globe2,
  Loader2,
  RadioTower,
  Server,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Probes ────────────────────────────────────────────────────────────

/** Anything alive behind TLS on 443? (no-cors ⇒ network-level signal only) */
async function probeHttps(domain: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    await fetch(`https://${domain}/?nexo=${Date.now()}`, {
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

/** Does a WebSocket upgrade succeed on a client's exact dial path? */
function probeWsTunnel(domain: string, path: string): Promise<"live" | "dead"> {
  return new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket | null = null;
    const timer = setTimeout(() => finish("dead"), 6000);

    function finish(v: "live" | "dead") {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* noop */
      }
      resolve(v);
    }

    try {
      ws = new WebSocket(`wss://${domain}${path}`);
    } catch {
      finish("dead");
      return;
    }
    ws.onopen = () => finish("live");
    ws.onerror = () => finish("dead");
    ws.onclose = () => finish("dead");
  });
}

/** First WS dial-path across active links — what a client would actually hit. */
function firstWsPath(): { path: string } | null {
  for (const link of getDb().links.filter((l) => l.active)) {
    for (const auth of AUTH_TYPES) {
      const v = link.variants[auth];
      if (v?.enabled && v.transport === "ws") {
        return { path: `/ws/${auth}/${link.uuid}?ed=2048` };
      }
    }
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────

type Phase = "idle" | "https" | "tunnel" | "done";
interface DiagResult {
  https: boolean;
  tunnel: "live" | "dead" | null;
}

export function GatewayTools({ domain }: { domain: string }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DiagResult | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [srvOpen, setSrvOpen] = useState(false);
  const [gen, setGen] = useState<GeneratedServerConfig | null>(null);

  const running = phase === "https" || phase === "tunnel";

  const runDiagnostics = async () => {
    setResult(null);
    setSkipped(false);
    setPhase("https");
    const https = await probeHttps(domain);

    const probe = firstWsPath();
    let tunnel: "live" | "dead" | null = null;
    if (!probe) {
      setSkipped(true);
    } else {
      setPhase("tunnel");
      tunnel = await probeWsTunnel(domain, probe.path);
    }
    setResult({ https, tunnel });
    setPhase("done");
  };

  const openServerConfig = () => {
    const built = buildServerConfig(getDb().links, domain);
    setGen(built);
    setSrvOpen(true);
  };

  const download = (name: string, text: string, mime: string) => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(t("copied"));
  };

  // Verdict derivation
  let verdict: "live" | "dead-tunnel" | "down" | null = null;
  if (result && !running) {
    if (!result.https) verdict = "down";
    else if (result.tunnel === "live") verdict = "live";
    else if (result.tunnel === "dead") verdict = "dead-tunnel";
  }

  const xrayJson = gen && !gen.isEmpty ? JSON.stringify(gen.xray, null, 2) : "";

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Live diagnostics ────────────────────────────────────── */}
        <Card className="glass rounded-2xl">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Activity className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold leading-tight">{t("diagTitle")}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("diagDesc")}</p>
              </div>
            </div>

            <Button
              onClick={runDiagnostics}
              disabled={running}
              className="h-10 w-full gap-2 rounded-xl bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] font-bold text-white shadow-lg shadow-red-950/50 hover:brightness-110"
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Activity className="size-4" />
              )}
              {running ? t("diagRunning") : t("diagRun")}
            </Button>

            {(phase !== "idle" || result) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2"
              >
                <ProbeRow
                  icon={<Globe2 className="size-4" />}
                  label={t("diagHttpsRow")}
                  phase={phase === "https"}
                  state={
                    result ? (result.https ? "ok" : "fail") : phase === "https" ? "pending" : "idle"
                  }
                  okText={t("resOk")}
                  failText={t("resFail")}
                />
                <ProbeRow
                  icon={<RadioTower className="size-4" />}
                  label={t("diagTunnelRow")}
                  phase={phase === "tunnel"}
                  state={
                    skipped
                      ? "skipped"
                      : result && result.tunnel
                        ? result.tunnel === "live"
                          ? "ok"
                          : "fail"
                        : phase === "tunnel"
                          ? "pending"
                          : "idle"
                  }
                  okText={t("resLive")}
                  failText={t("resDead")}
                  skipText={t("diagSkipped")}
                />

                {verdict && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "rounded-xl border p-4 text-sm leading-relaxed",
                      verdict === "live" &&
                        "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
                      verdict === "dead-tunnel" &&
                        "border-primary/40 bg-primary/10 text-red-200",
                      verdict === "down" &&
                        "border-amber-400/35 bg-amber-400/10 text-amber-200",
                    )}
                  >
                    <p className="mb-1 flex items-center gap-2 font-bold">
                      {verdict === "live" && <CheckCircle2 className="size-4" />}
                      {(verdict === "dead-tunnel" || verdict === "down") && (
                        <AlertTriangle className="size-4" />
                      )}
                      {verdict === "live" && t("verdictLiveTitle")}
                      {verdict === "dead-tunnel" && t("verdictDeadTitle")}
                      {verdict === "down" && t("verdictDownTitle")}
                    </p>
                    <p className="text-xs opacity-90">
                      {verdict === "live" && t("verdictLiveBody")}
                      {verdict === "dead-tunnel" && t("verdictDeadBody")}
                      {verdict === "down" && t("verdictDownBody")}
                    </p>
                  </motion.div>
                )}

                <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                  {t("diagCdnNote")}
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* ── Server-side Xray config ─────────────────────────────── */}
        <Card className="glass rounded-2xl border-primary/20">
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <Server className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold leading-tight">{t("srvTitle")}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("srvDesc")}</p>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                {t("srvBulletAgg")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                {t("srvBulletEdge")}
              </li>
            </ul>

            <Button
              onClick={openServerConfig}
              variant="outline"
              className="mt-auto h-10 w-full gap-2 rounded-xl border-primary/40 font-semibold hover:border-primary/70 hover:bg-accent"
            >
              <FileJson className="size-4 text-primary" />
              {t("srvOpen")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Server config dialog ──────────────────────────────────── */}
      <Dialog open={srvOpen} onOpenChange={setSrvOpen}>
        <DialogContent className="glass max-h-[85vh] overflow-hidden rounded-2xl border-border/80 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              {t("srvTitle")}
            </DialogTitle>
            <DialogDescription>{t("srvDesc")}</DialogDescription>
          </DialogHeader>

          {!gen || gen.isEmpty ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("srvEmpty")}</p>
          ) : (
            <Tabs defaultValue="xray" className="min-h-0">
              <TabsList className="w-full justify-start rounded-xl bg-secondary/60">
                <TabsTrigger value="xray" className="gap-1.5 rounded-lg text-xs">
                  <FileJson className="size-3.5" /> {t("tabXray")}
                </TabsTrigger>
                <TabsTrigger value="nginx" className="rounded-lg text-xs">
                  NGINX
                </TabsTrigger>
                <TabsTrigger value="caddy" className="rounded-lg text-xs">
                  Caddy
                </TabsTrigger>
              </TabsList>

              <TabsContent value="xray" className="mt-3 space-y-3">
                <SnippetToolbar
                  onCopy={<CopyButton value={xrayJson} label={t("copy")} />}
                  onDownload={() =>
                    download("nexovip-xray-server.json", xrayJson, "application/json")
                  }
                  meta={`${gen.routes.length} × inbound · ${gen.clientCount} ${t("srvClients")}`}
                />
                <ScrollArea className="h-72 rounded-xl border border-border/70 bg-background/60">
                  <pre dir="ltr" className="p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {xrayJson}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="nginx" className="mt-3 space-y-3">
                <SnippetToolbar
                  onCopy={<CopyButton value={gen.nginx} label={t("copy")} />}
                  onDownload={() => download("nexovip-reverse-proxy.conf", gen.nginx, "text/plain")}
                  meta={`TLS @ edge :443 → 127.0.0.1:${gen.routes.map((r) => r.port).join(", ")}`}
                />
                <ScrollArea className="h-72 rounded-xl border border-border/70 bg-background/60">
                  <pre dir="ltr" className="p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {gen.nginx}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="caddy" className="mt-3 space-y-3">
                <SnippetToolbar
                  onCopy={<CopyButton value={gen.caddy} label={t("copy")} />}
                  onDownload={() => download("nexovip-Caddyfile", gen.caddy, "text/plain")}
                  meta={`${domain} · automatic HTTPS`}
                />
                <ScrollArea className="h-72 rounded-xl border border-border/70 bg-background/60">
                  <pre dir="ltr" className="p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {gen.caddy}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Small presentational helpers ─────────────────────────────────────

function ProbeRow({
  icon,
  label,
  phase,
  state,
  okText,
  failText,
  skipText,
}: {
  icon: React.ReactNode;
  label: string;
  phase: boolean;
  state: "idle" | "pending" | "ok" | "fail" | "skipped";
  okText: string;
  failText: string;
  skipText?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg border",
          state === "ok" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
          state === "fail" && "border-primary/40 bg-primary/10 text-red-300",
          state === "skipped" && "border-border bg-secondary/50 text-muted-foreground",
          (state === "idle" || state === "pending") &&
            "border-border/60 bg-secondary/40 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      {phase ? (
        <span className="flex items-center gap-1.5 text-xs text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          {t("loading")}
        </span>
      ) : (
        <span
          className={cn(
            "text-xs font-semibold",
            state === "ok" && "text-emerald-300",
            state === "fail" && "text-red-300",
            (state === "skipped" || state === "idle") && "text-muted-foreground",
          )}
        >
          {state === "ok" && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> {okText}
            </span>
          )}
          {state === "fail" && (
            <span className="inline-flex items-center gap-1">
              <XCircle className="size-3.5" /> {failText}
            </span>
          )}
          {state === "skipped" && skipText}
        </span>
      )}
    </div>
  );
}

function SnippetToolbar({
  onCopy,
  onDownload,
  meta,
}: {
  onCopy: React.ReactNode;
  onDownload: () => void;
  meta: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">
        {meta}
      </p>
      <div className="flex items-center gap-2">
        {onCopy}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="gap-1.5 rounded-lg border-primary/30 text-xs hover:border-primary/70 hover:bg-accent"
        >
          <Download className="size-3.5 text-primary" />
          {t("srvDownload")}
        </Button>
      </div>
    </div>
  );
}
