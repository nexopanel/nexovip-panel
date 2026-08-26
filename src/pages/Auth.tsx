import { BrandMark, LangToggle } from "@/components/nexo-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Home, Loader2, ShieldCheck } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function AuthForm({ redirectAfterAuth }: AuthProps) {
  const { isLoading, isAuthenticated, signIn } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(password);
      navigate(redirect, { replace: true });
    } catch {
      setError(t("authWrongPassword"));
      setSubmitting(false);
    }
  };

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirect} replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 aura-red" />
      <div className="pointer-events-none absolute inset-0 bg-grid" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Home className="size-4" />
          {t("backToSite")}
        </Link>
        <LangToggle />
      </header>

      {/* Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Card className="glass glow-red rounded-3xl border-primary/15">
            <CardContent className="p-8 sm:p-10">
              <div className="flex flex-col items-center text-center">
                <BrandMark size={72} pulse className="animate-nexo-float" />
                <h1 className="mt-5 text-2xl font-bold tracking-tight text-glow">
                  {t("authWelcome")}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("brand")} — {t("authSubtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("authPassword")}
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder={t("authPasswordPlaceholder")}
                      autoFocus
                      disabled={submitting}
                      className="h-12 rounded-xl border-primary/20 bg-background/60 ps-9 pe-10 font-mono tracking-widest focus-visible:border-primary/60 focus-visible:ring-primary/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      tabIndex={-1}
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.p
                    key={error}
                    initial={{ x: -8 }}
                    animate={{ x: [0, -7, 7, -4, 4, 0] }}
                    transition={{ duration: 0.4 }}
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm font-medium text-red-300"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  disabled={!password || submitting}
                  className={cn(
                    "h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-[#b91c2e] via-[#ef2a3a] to-[#ff4d59]",
                    "text-base font-bold text-white shadow-lg shadow-red-950/60 transition-all",
                    "hover:brightness-110 hover:shadow-red-900/50 active:scale-[0.99]",
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("loading")}
                    </>
                  ) : (
                    t("authLogin")
                  )}
                </Button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground/80">
                  {t("authHint")}
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/70">
            <ShieldCheck className="size-3.5 text-primary/60" />
            {t("secureFooter")}
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <AuthForm {...props} />
    </Suspense>
  );
}
