import { SectionHeading } from "@/components/nexo-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, getDomain } from "@/lib/luffy/api";
import { PANEL_VERSION } from "@/lib/luffy/core";
import { useI18n } from "@/lib/i18n";
import { Clock, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SecurityTab() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error(t("passwordMismatch"));
      return;
    }
    if (next.length < 4) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      toast.success(t("passwordChanged"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "wrong-password"
          ? t("passwordWrongCurrent")
          : err instanceof Error && err.message === "password-too-short"
            ? t("passwordTooShort")
            : t("error");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={<ShieldCheck className="size-5" />}
        title={t("secTitle")}
        subtitle={t("secSubtitle")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Change password */}
        <Card className="glass rounded-2xl lg:col-span-2">
          <CardContent className="p-6">
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <KeyRound className="size-5" />
                </div>
                <h3 className="font-semibold">{t("changePassword")}</h3>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cur-pw" className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("currentPassword")}
                </Label>
                <Input
                  id="cur-pw"
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-border/80 bg-background/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("newPassword")}
                  </Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    required
                    minLength={4}
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-border/80 bg-background/50 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conf-pw" className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("confirmPassword")}
                  </Label>
                  <Input
                    id="conf-pw"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={4}
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-border/80 bg-background/50 font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={busy || !current || !next}
                className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] font-bold text-white shadow-lg shadow-red-950/50 hover:brightness-110 sm:w-auto"
              >
                <Lock className="size-4" />
                {t("changePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Session info */}
        <Card className="glass rounded-2xl">
          <CardContent className="space-y-4 p-6">
            <h3 className="font-semibold">{t("secSubtitle")}</h3>
            <Separator className="bg-border/50" />
            <div className="flex items-start gap-3 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="leading-relaxed text-muted-foreground">{t("sessionsInfo")}</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="leading-relaxed text-muted-foreground">
                sha256 · SECRET_KEY
              </p>
            </div>
            <Separator className="bg-border/50" />
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("domain")}</dt>
                <dd className="max-w-40 truncate font-mono text-xs" dir="ltr">{getDomain()}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("version")}</dt>
                <dd className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                  v{PANEL_VERSION}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
