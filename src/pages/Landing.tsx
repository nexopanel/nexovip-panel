import { BrandMark, LangToggle } from "@/components/nexo-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Fingerprint,
  Globe2,
  KeyRound,
  Languages,
  Radio,
  ShieldCheck,
  Signal,
} from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

/* ── Hero visual: orbital VPN core ───────────────────────────────── */

function HeroOrb() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {/* halo */}
      <div className="absolute inset-8 rounded-full bg-primary/10 blur-3xl" />
      {/* outer dashed ring */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 animate-nexo-spin-slow">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#ef2a3a" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 10" />
        <circle cx="100" cy="8" r="3.5" fill="#ff5a63">
          <animate attributeName="opacity" values="1;0.3;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>
      {/* middle ring */}
      <svg viewBox="0 0 200 200" className="absolute inset-6 animate-nexo-spin-slow [animation-direction:reverse] [animation-duration:38s]">
        <circle cx="100" cy="100" r="78" fill="none" stroke="#ef2a3a" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 14" />
        <rect x="96" y="14" width="8" height="8" rx="2" fill="#fb923c" transform="rotate(45 100 18)" />
      </svg>
      {/* inner pulse rings */}
      <div className="absolute inset-16 rounded-full border border-primary/30" />
      <div className="absolute inset-16 rounded-full border border-primary/50 animate-nexo-pulse-ring" />
      {/* core mark */}
      <div className="absolute inset-0 flex items-center justify-center">
        <BrandMark size={128} pulse className="animate-nexo-float" />
      </div>
      {/* floating chips */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="glass absolute start-0 top-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg"
      >
        <Signal className="size-3.5 text-emerald-300" />
        VLESS · Trojan
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.75, duration: 0.7 }}
        className="glass absolute bottom-12 end-0 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg"
      >
        <Activity className="size-3.5 text-primary" />
        :443 · TLS
      </motion.div>
    </div>
  );
}

const PROTOCOL_CHIPS = [
  "vless-ws",
  "vless-xhttp",
  "trojan-ws",
  "trojan-xhttp",
] as const;

const FINGERPRINT_CHIPS = [
  "chrome",
  "firefox",
  "safari",
  "ios",
  "android",
  "edge",
  "randomized",
] as const;

export default function Landing() {
  const { t } = useI18n();

  const features = [
    { icon: KeyRound, titleKey: "featureUsers", descKey: "featureUsersDesc" },
    { icon: Activity, titleKey: "featureMonitor", descKey: "featureMonitorDesc" },
    { icon: Globe2, titleKey: "featureIps", descKey: "featureIpsDesc" },
    { icon: Radio, titleKey: "featureSubs", descKey: "featureSubsDesc" },
    { icon: ShieldCheck, titleKey: "featureSecure", descKey: "featureSecureDesc" },
    { icon: Languages, titleKey: "featureI18n", descKey: "featureI18nDesc" },
  ] as const;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Backdrop */}
      <div className="pointer-events-none fixed inset-0 aura-red" />
      <div className="pointer-events-none fixed inset-0 bg-grid" />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={34} />
            <span className="text-lg font-bold tracking-wide">
              Nexo<span className="text-primary text-glow">VIP</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              {t("navFeatures")}
            </a>
            <a href="#protocols" className="transition-colors hover:text-foreground">
              {t("navProtocols")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Button
              asChild
              className="gap-1.5 rounded-full bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] font-bold text-white shadow-lg shadow-red-950/50 transition-all hover:brightness-110"
            >
              <Link to="/auth">
                {t("navDashboard")}
                <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
        <div className="text-center lg:text-start">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-2 rounded-full bg-primary opacity-70 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {t("heroBadge")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-6 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl xl:text-6xl"
          >
            {t("heroTitle1")}
            <span className="bg-gradient-to-r from-[#ff8d94] via-[#ef2a3a] to-[#8f1020] bg-clip-text text-transparent text-glow">
              {" "}
              NexoVIP{" "}
            </span>
            {t("heroTitleAccent")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0"
          >
            {t("heroSubtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <Button
              asChild
              size="lg"
              className="glow-red h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-[#b91c2e] via-[#ef2a3a] to-[#ff4d59] text-base font-bold text-white shadow-xl shadow-red-950/60 transition-all hover:scale-[1.02] hover:brightness-110 sm:w-auto"
            >
              <Link to="/auth">
                {t("heroCta")}
                <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-2xl border-border/80 bg-card/40 backdrop-blur transition-colors hover:border-primary/50 hover:bg-accent sm:w-auto"
            >
              <a href="#features">{t("heroSecondary")}</a>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroOrb />
        </motion.div>
      </section>

      {/* ── Stats band ──────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.55 }}
          className="glass grid grid-cols-1 divide-y divide-border/50 rounded-3xl px-6 py-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse"
        >
          {[
            { value: "6", label: t("statProtocols") },
            { value: "99.9%", label: t("statUptime") },
            { value: "EN / FA", label: t("featureI18n") },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 py-4 text-center sm:py-0">
              <span className="bg-gradient-to-b from-[#ffb3b8] to-[#ef2a3a] bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                {s.value}
              </span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
        <motion.div {...fadeUp} transition={{ duration: 0.55 }} className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("brandTag")} · <span className="text-primary text-glow">NexoVIP</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.titleKey} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.07 }}>
              <div className="glass card-hover group h-full rounded-2xl p-6">
                <div className="flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:shadow-[0_0_22px_-4px_rgba(239,42,58,0.7)]">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{t(f.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(f.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Protocols ───────────────────────────────────────────── */}
      <section id="protocols" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6">
        <motion.div {...fadeUp} transition={{ duration: 0.55 }} className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("protocolsTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("protocolsSub")}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {(["vless", "trojan"] as const).map((auth) => (
            <motion.div key={auth} {...fadeUp} transition={{ duration: 0.55 }}>
              <Card className="glass card-hover h-full rounded-2xl">
                <CardContent className="p-7">
                  <div className="flex items-center justify-between">
                    <code className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-lg font-bold uppercase tracking-wide text-primary">
                      {auth}
                    </code>
                    <Signal className="size-5 text-emerald-300" />
                  </div>
                  <div className="mt-5 space-y-2 font-mono text-sm" dir="ltr">
                    {PROTOCOL_CHIPS.filter((c) => c.startsWith(auth)).map((chip) => (
                      <div
                        key={chip}
                        className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-xs"
                      >
                        <span>{chip}</span>
                        <span className="text-muted-foreground">:443 · tls</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-1.5">
                    <Fingerprint className="size-3.5 text-primary/70" />
                    {FINGERPRINT_CHIPS.map((fp) => (
                      <span
                        key={fp}
                        className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {fp}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <motion.div {...fadeUp} transition={{ duration: 0.55 }}>
          <div className="glass glow-red relative overflow-hidden rounded-3xl px-8 py-14 text-center">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
            <BrandMark size={56} pulse className="animate-nexo-float" />
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("heroCta")} →
            </h2>
            <Button
              asChild
              size="lg"
              className="mt-7 h-12 gap-2 rounded-2xl bg-gradient-to-r from-[#b91c2e] via-[#ef2a3a] to-[#ff4d59] px-8 text-base font-bold text-white shadow-xl shadow-red-950/60 transition-all hover:scale-[1.03] hover:brightness-110"
            >
              <Link to="/auth">
                {t("authLogin")}
                <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="font-semibold text-foreground">NexoVIP</span>
            <span>© 2026 — {t("footerRights")}</span>
          </div>
          <LangToggle />
        </div>
      </footer>
    </div>
  );
}
