import { CopyButton, SectionHeading } from "@/components/nexo-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, getDomain } from "@/lib/luffy/api";
import { useI18n } from "@/lib/i18n";
import {
  DownloadCloud,
  Globe2,
  Plus,
  Server,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AddressesTab({ addresses }: { addresses: string[] }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const handleAdd = () => {
    const value = draft.trim();
    if (!value) return;
    const result = api.addAddress(value);
    if (!result.ok) {
      toast.error(t(result.error === "exists" ? "ipExists" : "ipInvalid"));
      return;
    }
    toast.success(t("ipAdded"));
    setDraft("");
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={<Globe2 className="size-5" />}
        title={t("ipsTitle")}
        subtitle={t("ipsSubtitle")}
      />

      {/* Main domain */}
      <Card className="glass glow-red-sm rounded-2xl border-primary/20">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <Server className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("mainDomain")}
            </p>
            <code className="mt-0.5 block truncate font-mono text-sm font-semibold" dir="ltr">
              {getDomain()}
            </code>
          </div>
          <CopyButton value={getDomain()} />
        </CardContent>
      </Card>

      {/* Add form */}
      <Card className="glass rounded-2xl">
        <CardContent className="p-5">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={t("addIpPlaceholder")}
              dir="ltr"
              className="h-11 rounded-xl border-border/80 bg-background/50 font-mono"
            />
            <Button
              onClick={handleAdd}
              className="h-11 shrink-0 gap-2 rounded-xl bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] font-bold text-white shadow-lg shadow-red-950/50 hover:brightness-110"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t("addIp")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Address list */}
      <Card className="glass rounded-2xl">
        <CardContent className="p-0">
          {addresses.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">{t("emptyIps")}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {addresses.map((addr, index) => (
                <li
                  key={addr}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5 sm:px-5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 font-mono text-[11px] text-primary">
                    {index + 1}
                  </span>
                  <code className="min-w-0 flex-1 truncate font-mono text-sm" dir="ltr">
                    {addr}
                  </code>
                  <CopyButton value={addr} iconOnly />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => api.deleteAddress(index)}
                    className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => {
            const res = api.importAddresses("railway");
            if (res.added === 0) toast.info(`${res.skipped} skipped`);
          }}
          className="gap-2 rounded-xl border-primary/30 hover:border-primary/60 hover:bg-accent"
        >
          <DownloadCloud className="size-4 text-primary" />
          {t("importRailway")}
        </Button>
        <Button
          variant="outline"
          disabled={addresses.length === 0}
          onClick={() => setConfirmClear(true)}
          className="gap-2 rounded-xl border-destructive/40 text-red-300 hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          {t("clearAll")}
        </Button>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="glass rounded-2xl border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearAll")}?</AlertDialogTitle>
            <AlertDialogDescription>{t("ipsCleared")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                api.clearAddresses();
                setConfirmClear(false);
              }}
              className="bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] text-white hover:brightness-110"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
