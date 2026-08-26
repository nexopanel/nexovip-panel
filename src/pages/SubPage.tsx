/**
 * Public /sub/:uid endpoint view — the browser equivalent of LUFFY_PANEL's
 * unauthenticated GET /sub/<uid>. Renders the base64 subscription body so
 * it can be copied straight into any V2Ray / Xray / sing-box client.
 */

import { CopyButton } from "@/components/nexo-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, publicSubscription, ready } from "@/lib/luffy/api";
import type { SubscriptionInfo } from "@/lib/luffy/api";
import { useI18n } from "@/lib/i18n";
import { BrandMark } from "@/components/nexo-bits";
import { FileWarning, RadioTower } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

export default function SubPage() {
  const { uid } = useParams<{ uid: string }>();
  const { t } = useI18n();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ready();
        const sub = uid ? publicSubscription(uid) : null;
        if (!alive) return;
        setInfo(sub);
        setState(sub ? "ready" : "missing");
      } catch {
        if (alive) setState("missing");
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="pointer-events-none fixed inset-0 aura-red" />

      <div className="relative z-10 w-full max-w-2xl space-y-5">
        <div className="flex items-center justify-center gap-3">
          <BrandMark size={36} />
          <p className="font-bold tracking-wide text-glow">NexoVIP</p>
        </div>

        {state === "loading" && (
          <Card className="glass rounded-2xl">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        )}

        {state === "missing" && (
          <Card className="glass rounded-2xl border-destructive/30">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <FileWarning className="size-8 text-red-400" />
              <p className="font-semibold">{t("subNotFound")}</p>
              <Button asChild variant="outline" className="rounded-xl border-primary/30 hover:bg-accent">
                <Link to="/">{t("backToSite")}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {state === "ready" && info && (
          <Card className="glass glow-red-sm rounded-2xl border-primary/20">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <RadioTower className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" dir="ltr">
                      {info.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("subBase64")} · {info.lineCount}
                    </p>
                  </div>
                </div>
                <CopyButton value={info.base64} label={t("copy")} />
              </div>

              <pre
                dir="ltr"
                className="max-h-72 overflow-auto select-all whitespace-pre-wrap break-all rounded-xl border border-border/70 bg-background/60 p-4 font-mono text-xs leading-relaxed text-muted-foreground"
              >
                {info.base64}
              </pre>

              <p className="text-[11px] leading-relaxed text-muted-foreground/80">{t("subHint")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
