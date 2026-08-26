import { BrandMark, LangToggle } from "@/components/nexo-bits";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { NotificationRow } from "@/lib/luffy/db";
import { api } from "@/lib/luffy/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Bell,
  Globe2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export type PanelTab = "overview" | "links" | "ips" | "security";

const NAV: { key: PanelTab; icon: LucideIcon; labelKey: DictKey }[] = [
  { key: "overview", icon: LayoutDashboard, labelKey: "navOverview" },
  { key: "links", icon: Users, labelKey: "navLinks" },
  { key: "ips", icon: Globe2, labelKey: "navAddresses" },
  { key: "security", icon: ShieldCheck, labelKey: "navSecurity" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function PanelShell({
  active,
  onNavigate,
  onLogout,
  notifications,
  unreadCount,
  children,
}: {
  active: PanelTab;
  onNavigate: (tab: PanelTab) => void;
  onLogout: () => void;
  notifications: NotificationRow[];
  unreadCount: number;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navButton = (item: (typeof NAV)[number], mobile = false) => (
    <button
      key={item.key}
      onClick={() => {
        onNavigate(item.key);
        setMobileNavOpen(false);
      }}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        mobile
          ? active === item.key
            ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_rgba(239,42,58,0.35)]"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
          : [
              "w-full",
              active === item.key
                ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_rgba(239,42,58,0.35),0_0_18px_-8px_rgba(239,42,58,0.7)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            ],
      )}
    >
      <item.icon
        className={cn(
          "size-4 transition-colors",
          active === item.key ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {t(item.labelKey)}
      {active === item.key && (
        <span className="absolute inset-y-2 -start-[3px] w-[3px] rounded-full bg-gradient-to-b from-[#ff5a63] to-[#8f1020]" />
      )}
    </button>
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Backdrop */}
      <div className="pointer-events-none fixed inset-0 aura-red" />

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-e border-border/70 bg-sidebar/80 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-7">
          <BrandMark size={40} />
          <div>
            <p className="font-bold tracking-wide text-glow">NexoVIP</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Control Center
            </p>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {NAV.map((item) => navButton(item))}
        </nav>

        <div className="p-4 pt-0">
          <Separator className="mb-4 bg-border/50" />
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-red-300"
          >
            <LogOut className="size-4" />
            {t("logout")}
          </button>
          <p className="mt-3 px-3 text-[11px] text-muted-foreground/60">
            NexoVIP · v1.0
          </p>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/75 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            {/* Mobile brand + menu */}
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <BrandMark size={32} />
              <span className="truncate font-bold tracking-wide">NexoVIP</span>
            </div>

            <div className="hidden lg:block" />

            {/* Controls */}
            <div className="flex items-center gap-2">
              <LangToggle />

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative rounded-full border-primary/25 bg-card/70 hover:border-primary/60 hover:bg-accent"
                  >
                    <Bell className="size-4 text-foreground/85" />
                    {unreadCount > 0 && (
                      <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4d59] to-[#b91c2e] px-1 text-[10px] font-bold leading-none text-white shadow-md shadow-red-950">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-xl border-border/80 bg-popover/95 p-0 backdrop-blur-xl">
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-semibold">{t("notifications")}</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => api.markNotificationsSeen()}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t("markAllSeen")}
                      </button>
                    )}
                  </div>
                  <Separator />
                  <ScrollArea className="max-h-80">
                    <div className="divide-y divide-border/50">
                      {notifications.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                          {t("noNotifications")}
                        </p>
                      )}
                      {notifications.map((n) => (
                        <div key={n.id} className="flex gap-3 px-4 py-3">
                          <span
                            className={cn(
                              "mt-1.5 size-1.5 shrink-0 rounded-full",
                              n.seen ? "bg-muted-foreground/40" : "bg-primary shadow-[0_0_8px_rgba(239,42,58,0.9)]",
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Logout (mobile) */}
              <Button
                variant="outline"
                size="icon"
                onClick={onLogout}
                title={t("logout")}
                className="rounded-full border-primary/25 bg-card/70 hover:border-destructive/60 hover:bg-destructive/10 lg:hidden"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>

          {/* Mobile nav pills */}
          <div className="flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
            {NAV.map((item) => navButton(item, true))}
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
