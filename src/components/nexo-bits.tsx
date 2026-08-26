import { Button } from "@/components/ui/button";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Check, Copy, Globe } from "lucide-react";
import { useState, type ReactNode } from "react";

/* ── Animated SVG brand mark ─────────────────────────────────────── */

export function BrandMark({
  size = 44,
  className,
  pulse = false,
}: {
  size?: number;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {pulse && (
        <span className="absolute inset-0 rounded-2xl border border-primary/60 animate-nexo-pulse-ring" />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        role="img"
        aria-label="NexoVIP"
        className="drop-shadow-[0_0_14px_rgba(239,42,58,0.55)]"
      >
        <defs>
          <linearGradient id="nexo-g" x1="8" y1="6" x2="56" y2="58">
            <stop offset="0%" stopColor="#ff5a63" />
            <stop offset="55%" stopColor="#ef2a3a" />
            <stop offset="100%" stopColor="#8f1020" />
          </linearGradient>
          <linearGradient id="nexo-stroke" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor="#ffb3b8" />
            <stop offset="100%" stopColor="#ef2a3a" />
          </linearGradient>
        </defs>
        {/* Hexagonal shield */}
        <path
          d="M32 3 57 16v22c0 12-11 19.5-25 23C18 57.5 7 50 7 38V16L32 3Z"
          fill="url(#nexo-g)"
          fillOpacity="0.16"
          stroke="url(#nexo-stroke)"
          strokeWidth="2"
        />
        {/* Inner circuit arc */}
        <path
          d="M32 12 49 21v13c0 8.4-7.6 13.9-17 16.6C22.6 47.9 15 42.4 15 34V21l17-9Z"
          stroke="#ef2a3a"
          strokeOpacity="0.45"
          strokeWidth="1.2"
          className="animate-nexo-dash"
        />
        {/* N bolt */}
        <path
          d="M24 43V21l16 22V21"
          stroke="url(#nexo-stroke)"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Node dots */}
        <circle cx="24" cy="21" r="2.4" fill="#ff8d94" />
        <circle cx="40" cy="43" r="2.4" fill="#ff8d94" />
      </svg>
    </span>
  );
}

/* ── Language switch pill ────────────────────────────────────────── */

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const next: Lang = lang === "en" ? "fa" : "en";
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLang(next)}
      title={t("otherLangName")}
      className={cn(
        "gap-2 rounded-full border-primary/25 bg-card/70 px-3 text-xs font-semibold tracking-wide text-foreground/90 hover:border-primary/60 hover:bg-accent hover:text-foreground transition-all",
        className,
      )}
    >
      <Globe className="size-3.5 text-primary" />
      {t("otherLangName")}
    </Button>
  );
}

/* ── Copy-to-clipboard button ────────────────────────────────────── */

export function CopyButton({
  value,
  className,
  iconOnly = false,
  label,
}: {
  value: string;
  className?: string;
  iconOnly?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for restricted clipboard contexts
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  };

  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        title={done ? t("copied") : t("copy")}
        className={cn(
          "size-7 rounded-md text-muted-foreground hover:text-primary",
          className,
        )}
      >
        {done ? (
          <Check className="size-3.5 text-emerald-400" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn(
        "gap-1.5 rounded-lg border-primary/30 text-xs font-medium hover:border-primary/70 hover:bg-accent",
        className,
      )}
    >
      {done ? (
        <Check className="size-3.5 text-emerald-400" />
      ) : (
        <Copy className="size-3.5 text-primary" />
      )}
      {label ?? (done ? "✓" : t("copy"))}
    </Button>
  );
}

/* ── Link status badge ───────────────────────────────────────────── */

export type BadgeStatus =
  | "active"
  | "disabled"
  | "expired"
  | "quota";

const STATUS_STYLES: Record<BadgeStatus, string> = {
  active:
    "border-emerald-400/35 bg-emerald-400/10 text-emerald-300 shadow-[0_0_14px_-4px_rgba(52,211,153,0.55)]",
  disabled:
    "border-border bg-secondary/60 text-muted-foreground",
  expired:
    "border-amber-400/35 bg-amber-400/10 text-amber-300 shadow-[0_0_14px_-4px_rgba(251,191,36,0.5)]",
  quota:
    "border-primary/40 bg-primary/10 text-red-300 shadow-[0_0_14px_-4px_rgba(239,42,58,0.6)]",
};

const STATUS_DOTS: Record<BadgeStatus, string> = {
  active: "bg-emerald-400",
  disabled: "bg-muted-foreground",
  expired: "bg-amber-400",
  quota: "bg-primary",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: BadgeStatus;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-none",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className={cn("absolute inset-0 rounded-full", STATUS_DOTS[status])} />
        {status === "active" && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-60",
              STATUS_DOTS[status],
            )}
          />
        )}
      </span>
      {label}
    </span>
  );
}

/* ── Section heading used inside tabs ───────────────────────────── */

export function SectionHeading({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary glow-red-sm">
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
