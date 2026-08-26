import { SectionHeading } from "@/components/nexo-bits";
import { Card, CardContent } from "@/components/ui/card";
import type { StatsSnapshot } from "@/lib/luffy/api";
import { formatBytesShort } from "@/lib/luffy/core";
import { useI18n } from "@/lib/i18n";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  Layers,
  MemoryStick,
  Radio,
  Wifi,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

/* ── Radial gauge ─────────────────────────────────────────────────── */

function RingGauge({
  value,
  label,
  icon,
}: {
  value: number; // 0..100
  label: string;
  icon: React.ReactNode;
}) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const color = pct > 75 ? "#ff4d59" : pct > 50 ? "#fb923c" : "#ef2a3a";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
          <circle cx="46" cy="46" r={r} fill="none" stroke="oklch(0.955 0.02 27 / 8%)" strokeWidth="8" />
          <circle
            cx="46"
            cy="46"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (pct / 100) * circ}
            style={{
              transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{pct.toFixed(0)}%</span>
          {icon}
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  tone: "red" | "green" | "amber" | "neutral";
}) {
  const tones = {
    red: "text-primary border-primary/25 bg-primary/8",
    green: "text-emerald-300 border-emerald-400/25 bg-emerald-400/8",
    amber: "text-amber-300 border-amber-400/25 bg-amber-400/8",
    neutral: "text-muted-foreground border-border bg-secondary/40",
  } as const;
  return (
    <Card className="glass card-hover rounded-2xl">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 truncate text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Chart tooltip ───────────────────────────────────────────────── */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
}) {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-1 font-semibold tabular-nums">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular-nums">
          <span className={`size-1.5 rounded-full ${p.name === "down" ? "bg-[#ff4d59]" : "bg-[#fb923c]"}`} />
          {p.name === "down" ? t("download") : t("upload")}: {p.value} MB
        </p>
      ))}
    </div>
  );
}

/* ── Main tab ─────────────────────────────────────────────────────── */

export function OverviewTab({ stats }: { stats: StatsSnapshot }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={<Activity className="size-5" />}
        title={t("ovTitle")}
        subtitle={t("ovSubtitle")}
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <Radio className="size-3.5 animate-pulse" />
            {t("liveNow")}
          </span>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Layers} label={t("statTotal")} value={String(stats.linksTotal)} tone="neutral" />
        <StatCard icon={CheckCircle2} label={t("statActive")} value={String(stats.linksActive)} tone="green" />
        <StatCard icon={AlertTriangle} label={t("statIssues")} value={String(stats.linksExpired)} tone="amber" />
        <StatCard icon={Wifi} label={t("statTraffic")} value={formatBytesShort(stats.totalBytes)} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Traffic chart */}
        <Card className="glass rounded-2xl xl:col-span-2">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{t("chart24h")}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("liveFeedNote")}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-[#ff4d59] shadow-[0_0_8px_rgba(255,77,89,0.7)]" />
                  {t("download")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-[#fb923c]" />
                  {t("upload")}
                </span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.hourly} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gDown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4d59" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#ff4d59" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb923c" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#fb923c" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="oklch(0.955 0.02 27 / 8%)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "oklch(0.7 0.02 25)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.7 0.02 25)" }}
                    axisLine={false}
                    tickLine={false}
                    unit=" MB"
                    width={62}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(239,42,58,0.35)", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="up"
                    stroke="#fb923c"
                    strokeWidth={1.6}
                    fill="url(#gUp)"
                    animationDuration={700}
                  />
                  <Area
                    type="monotone"
                    dataKey="down"
                    stroke="#ff4d59"
                    strokeWidth={2.2}
                    fill="url(#gDown)"
                    animationDuration={700}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System health */}
        <Card className="glass rounded-2xl">
          <CardContent className="p-5 sm:p-6">
            <h3 className="mb-1 font-semibold">{t("systemHealth")}</h3>
            <p className="mb-5 text-xs text-muted-foreground">{t("domain")}: <span className="font-medium text-foreground/85">{stats.domain}</span></p>

            <div className="flex items-center justify-around">
              <RingGauge value={stats.cpu} label={t("cpuUsage")} icon={<Cpu className="size-3.5 text-muted-foreground" />} />
              <RingGauge value={stats.memory} label={t("memoryUsage")} icon={<MemoryStick className="size-3.5 text-muted-foreground" />} />
            </div>

            <div className="mt-6 space-y-3 border-t border-border/60 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="size-4 text-primary" /> {t("connections")}
                </span>
                <span className="font-bold tabular-nums text-glow">{stats.activeConnections}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-4 text-primary" /> {t("uptime")}
                </span>
                <span className="font-bold tabular-nums">{formatUptime(stats.uptimeSeconds)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("requests")}</span>
                <span className="font-bold tabular-nums">{stats.totalRequests.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("errorsCaught")}</span>
                <span className="font-bold tabular-nums">{stats.totalErrors}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-muted-foreground">{t("version")}</span>
                <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                  v{stats.version}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
