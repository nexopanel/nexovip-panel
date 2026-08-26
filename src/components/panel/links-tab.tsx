import {
  CopyButton,
  SectionHeading,
  StatusBadge,
  type BadgeStatus,
} from "@/components/nexo-bits";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  api,
  ALPN_OPTIONS,
  FINGERPRINTS,
  TRANSPORTS,
  type LinkView,
} from "@/lib/luffy/api";
import {
  DEFAULT_ALPN_BY_TRANSPORT,
  type AuthType,
  type Fingerprint,
  type Transport,
} from "@/lib/luffy/core";
import { useI18n, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/* ── helpers ──────────────────────────────────────────────────────── */

const STATUS_LABEL_KEY: Record<BadgeStatus, DictKey> = {
  active: "statusActive",
  disabled: "statusDisabled",
  expired: "statusExpired",
  quota: "statusQuota",
};

const TRANSPORT_LABELS: Record<Transport, string> = {
  ws: "WebSocket",
  "xhttp-packet-up": "XHTTP · packet-up",
  "xhttp-stream-up": "XHTTP · stream-up",
};

function ProtoChips({ link }: { link: LinkView }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(["vless", "trojan"] as AuthType[])
        .filter((a) => link.variants[a].enabled)
        .map((a) => (
          <span
            key={a}
            className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary"
          >
            {a}·{link.variants[a].transport.startsWith("xhttp") ? "xhttp" : "ws"}
          </span>
        ))}
    </div>
  );
}

function QuotaBar({ link }: { link: LinkView }) {
  const unlimited = link.usedPercent < 0;
  return (
    <div className="min-w-28">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] tabular-nums">
        <span className="text-muted-foreground">{link.usedText}</span>
        <span className="font-semibold">{unlimited ? "∞" : link.quotaText}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        {!unlimited && (
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              link.usedPercent >= 90
                ? "bg-gradient-to-r from-[#b91c2e] to-[#ff4d59] shadow-[0_0_10px_rgba(255,77,89,0.7)]"
                : "bg-gradient-to-r from-[#ef2a3a] to-[#ff8d94]",
            )}
            style={{ width: `${Math.max(link.usedPercent, 2)}%` }}
          />
        )}
        {unlimited && (
          <div className="h-full w-full animate-nexo-shimmer bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        )}
      </div>
    </div>
  );
}

/* ── Builder dialog ──────────────────────────────────────────────── */

interface VariantForm {
  enabled: boolean;
  transport: Transport;
  fingerprint: Fingerprint;
  alpn: string;
}

interface BuilderState {
  label: string;
  unlimitedQuota: boolean;
  quotaValue: string;
  quotaUnit: "gb" | "mb";
  daysValid: string;
  maxConnections: string;
  vless: VariantForm;
  trojan: VariantForm;
}

function stateFromLink(link?: LinkView): BuilderState {
  if (!link) {
    return {
      label: "",
      unlimitedQuota: false,
      quotaValue: "15",
      quotaUnit: "gb",
      daysValid: "30",
      maxConnections: "0",
      vless: { enabled: true, transport: "ws", fingerprint: "chrome", alpn: "http/1.1" },
      trojan: { enabled: false, transport: "ws", fingerprint: "chrome", alpn: "http/1.1" },
    };
  }
  const gb = link.limit_bytes / 1024 ** 3;
  const unlimited = link.limit_bytes <= 0;
  const useGb = !unlimited && gb >= 1;
  const variantTo = (v: LinkView["variants"][AuthType]): VariantForm => ({
    enabled: v.enabled,
    transport: v.transport,
    fingerprint: v.fingerprint,
    alpn: v.alpn,
  });
  return {
    label: link.label,
    unlimitedQuota: unlimited,
    quotaValue: unlimited
      ? "15"
      : String(Math.round((useGb ? gb : link.limit_bytes / 1024 ** 2) * 100) / 100),
    quotaUnit: useGb || unlimited ? "gb" : "mb",
    daysValid: link.daysLeft != null ? String(link.daysLeft) : "",
    maxConnections: String(link.max_connections),
    vless: variantTo(link.variants.vless),
    trojan: variantTo(link.variants.trojan),
  };
}

function VariantSection({
  titleKey,
  auth,
  form,
  onChange,
}: {
  titleKey: DictKey;
  auth: AuthType;
  form: VariantForm;
  onChange: (next: VariantForm) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        form.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20",
      )}
    >
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className={cn("size-4", form.enabled ? "text-primary" : "text-muted-foreground")} />
          {t(titleKey)}
        </Label>
        <Switch
          checked={form.enabled}
          onCheckedChange={(enabled) => onChange({ ...form, enabled })}
        />
      </div>

      {form.enabled && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("transport")}</Label>
            <Select
              value={form.transport}
              onValueChange={(transport) =>
                onChange({
                  ...form,
                  transport: transport as Transport,
                  alpn: DEFAULT_ALPN_BY_TRANSPORT[transport as Transport],
                })
              }
            >
              <SelectTrigger className="h-9 border-border/80 bg-background/50 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORTS.map((tr) => (
                  <SelectItem key={tr} value={tr} className="text-xs">
                    {TRANSPORT_LABELS[tr]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fingerprint")}</Label>
            <Select
              value={form.fingerprint}
              onValueChange={(fp) => onChange({ ...form, fingerprint: fp as Fingerprint })}
            >
              <SelectTrigger className="h-9 border-border/80 bg-background/50 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINGERPRINTS.map((f) => (
                  <SelectItem key={f} value={f} className="font-mono text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("alpn")}</Label>
            <Select value={form.alpn} onValueChange={(alpn) => onChange({ ...form, alpn })}>
              <SelectTrigger className="h-9 border-border/80 bg-background/50 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALPN_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a} className="font-mono text-xs">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {/* auth marker keeps the section identifiable */}
      <input type="hidden" value={auth} readOnly />
    </div>
  );
}

function BuilderDialog({
  open,
  editLink,
  onClose,
}: {
  open: boolean;
  editLink: LinkView | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<BuilderState>(() => stateFromLink(editLink ?? undefined));
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState("");

  // Reset form whenever target changes
  const targetKey = editLink?.uuid ?? "new";
  if (open && key !== targetKey) {
    setKey(targetKey);
    setState(stateFromLink(editLink ?? undefined));
  }

  const patch = (p: Partial<BuilderState>) => setState((s) => ({ ...s, ...p }));

  const submit = async () => {
    const label = state.label.trim();
    if (!label) {
      toast.error(t("labelRequired"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        label,
        limit_value: state.unlimitedQuota ? 0 : Number(state.quotaValue) || 0,
        limit_unit: state.quotaUnit,
        max_connections: Math.max(0, Math.floor(Number(state.maxConnections) || 0)),
        days_valid: Math.max(0, Math.floor(Number(state.daysValid) || 0)),
        vless_enabled: state.vless.enabled,
        vless_transport: state.vless.transport,
        vless_fingerprint: state.vless.fingerprint,
        vless_alpn: state.vless.alpn as (typeof ALPN_OPTIONS)[number],
        trojan_enabled: state.trojan.enabled,
        trojan_transport: state.trojan.transport,
        trojan_fingerprint: state.trojan.fingerprint,
        trojan_alpn: state.trojan.alpn as (typeof ALPN_OPTIONS)[number],
      };
      if (editLink) {
        await api.updateLink(editLink.uuid, body);
        toast.success(t("configUpdated"));
      } else {
        await api.createLink(body);
        toast.success(t("configCreated"));
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass max-h-[88vh] overflow-y-auto rounded-2xl border-primary/20 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editLink ? t("builderEdit") : t("builderNew")}</DialogTitle>
          <DialogDescription>:443 · VLESS / Trojan</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-label" className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("fieldLabel")}
            </Label>
            <Input
              id="cfg-label"
              value={state.label}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder={t("labelPlaceholder")}
              autoFocus
              className="border-border/80 bg-background/50"
            />
          </div>

          {/* Quota */}
          <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("fieldQuota")}</Label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={state.unlimitedQuota}
                  onCheckedChange={(v) => patch({ unlimitedQuota: Boolean(v) })}
                />
                {t("quotaUnlimited")}
              </label>
            </div>
            {!state.unlimitedQuota && (
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("quotaValue")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={state.quotaValue}
                    onChange={(e) => patch({ quotaValue: e.target.value })}
                    className="border-border/80 bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("quotaUnit")}</Label>
                  <Select
                    value={state.quotaUnit}
                    onValueChange={(u) => patch({ quotaUnit: u as "gb" | "mb" })}
                  >
                    <SelectTrigger className="border-border/80 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gb">GB</SelectItem>
                      <SelectItem value="mb">MB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Expiry & connections */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("fieldDays")}
              </Label>
              <Input
                type="number"
                min="0"
                value={state.daysValid}
                onChange={(e) => patch({ daysValid: e.target.value })}
                placeholder={t("daysPlaceholder")}
                className="border-border/80 bg-background/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("fieldMaxConn")}
              </Label>
              <Input
                type="number"
                min="0"
                value={state.maxConnections}
                onChange={(e) => patch({ maxConnections: e.target.value })}
                className="border-border/80 bg-background/50"
              />
              <p className="text-[11px] text-muted-foreground">{t("maxConnHint")}</p>
            </div>
          </div>

          <Separator className="bg-border/60" />

          <VariantSection
            titleKey="sectionVless"
            auth="vless"
            form={state.vless}
            onChange={(vless) => patch({ vless })}
          />
          <VariantSection
            titleKey="sectionTrojan"
            auth="trojan"
            form={state.trojan}
            onChange={(trojan) => patch({ trojan })}
          />
        </div>

        <DialogFooter className="gap-2 pt-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] font-bold text-white shadow-lg shadow-red-950/50 hover:brightness-110"
          >
            <Plus className="size-4" />
            {editLink ? t("save") : t("newConfig")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Details dialog ──────────────────────────────────────────────── */

function DetailsDialog({
  link,
  onClose,
  onEdit,
}: {
  link: LinkView | null;
  onClose: () => void;
  onEdit: (link: LinkView) => void;
}) {
  const { t } = useI18n();
  if (!link) return null;

  return (
    <Dialog open={Boolean(link)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass max-h-[88vh] overflow-y-auto rounded-2xl border-primary/20 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            {link.label}
            <StatusBadge status={link.status} label={t(STATUS_LABEL_KEY[link.status])} />
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px]">{link.uuid}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("thQuota")}
            </p>
            <QuotaBar link={link} />
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("thExpiry")}
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {link.expiresText ?? t("never")}
            </p>
            {link.daysLeft != null && (
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  link.daysLeft <= 3 ? "text-amber-300" : "text-muted-foreground",
                )}
              >
                {link.status === "expired"
                  ? t("statusExpired")
                  : `${link.daysLeft} ${t("daysLeft")}`}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("thProtocols")}
            </p>
            <ProtoChips link={link} />
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">port {link.port}</p>
          </div>
        </div>

        {/* Generated config links */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("generatedConfigs")} · {link.configs.length}
          </p>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/40">
            {link.configs.map((c, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <span className="w-12 shrink-0 rounded bg-primary/10 px-1 py-0.5 text-center font-mono text-[10px] uppercase text-primary">
                  {c.auth}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/85" dir="ltr">
                  {c.uri}
                </code>
                <CopyButton value={c.uri} iconOnly />
              </div>
            ))}
          </div>
        </div>

        {/* Subscription */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("subscriptionUrl")}
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-primary" dir="ltr">
              {link.subscription.url}
            </code>
            <CopyButton value={link.subscription.url} iconOnly />
          </div>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              <span>{t("subBase64")}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{link.subscription.lineCount} lines</span>
                <CopyButton value={link.subscription.base64} iconOnly />
              </span>
            </summary>
            <pre
              dir="ltr"
              className="mt-2 max-h-32 overflow-auto rounded-xl border border-border bg-background/60 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground"
            >
              {link.subscription.base64}
            </pre>
          </details>
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await api.resetUsage(link.uuid);
              toast.success(t("usageReset"));
            }}
            className="gap-1.5 border-primary/30 hover:border-primary/60"
          >
            <RotateCcw className="size-3.5" />
            {t("resetUsage")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void api.updateLink(link.uuid, { active: !link.active })}
            className={cn(
              "gap-1.5",
              link.active
                ? "border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                : "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10",
            )}
          >
            <Power className="size-3.5" />
            {link.active ? t("disable") : t("enable")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onClose();
              onEdit(link);
            }}
            className="gap-1.5 border-primary/30 hover:border-primary/60"
          >
            <Pencil className="size-3.5" />
            {t("edit")}
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await api.deleteLink(link.uuid);
              onClose();
            }}
            className="ms-auto gap-1.5 bg-destructive/90 text-white hover:bg-destructive"
          >
            <Trash2 className="size-3.5" />
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main tab ─────────────────────────────────────────────────────── */

export function LinksTab({ links }: { links: LinkView[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editUid, setEditUid] = useState<string | null>(null);
  const [detailsUid, setDetailsUid] = useState<string | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter((l) => l.label.toLowerCase().includes(q));
  }, [links, query]);

  const editLink = links.find((l) => l.uuid === editUid) ?? null;
  const detailsLink = links.find((l) => l.uuid === detailsUid) ?? null;
  const deleteLink = links.find((l) => l.uuid === deleteUid) ?? null;

  const rowActions = (link: LinkView) => (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        onClick={() => setDetailsUid(link.uuid)}
        title={t("view")}
      >
        <Eye className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        onClick={() => {
          setEditUid(link.uuid);
          setBuilderOpen(true);
        }}
        title={t("edit")}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteUid(link.uuid)}
        title={t("delete")}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={<KeyRound className="size-5" />}
        title={t("linksTitle")}
        subtitle={t("linksSubtitle")}
        action={
          <Button
            onClick={() => {
              setEditUid(null);
              setBuilderOpen(true);
            }}
            className="gap-2 rounded-xl bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] font-bold text-white shadow-lg shadow-red-950/50 transition-all hover:brightness-110 hover:shadow-red-900/50"
          >
            <Plus className="size-4" />
            {t("newConfig")}
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 rounded-xl border-border/80 bg-card/60 ps-9"
        />
      </div>

      {filtered.length === 0 && (
        <Card className="glass rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <KeyRound className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {links.length === 0 ? t("emptyLinks") : t("noResults")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <>
          <Card className="glass hidden overflow-hidden rounded-2xl md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border/70 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider">{t("thName")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("thStatus")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("thQuota")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("thExpiry")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("thProtocols")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-end">{t("thActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((link) => (
                  <TableRow
                    key={link.uuid}
                    className="group border-border/50 transition-colors hover:bg-primary/5"
                  >
                    <TableCell>
                      <button
                        onClick={() => setDetailsUid(link.uuid)}
                        className="text-start font-semibold transition-colors hover:text-primary"
                      >
                        {link.label}
                      </button>
                      <p className="font-mono text-[10px] text-muted-foreground/60" dir="ltr">
                        {link.uuid.slice(0, 8)}…
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={link.status} label={t(STATUS_LABEL_KEY[link.status])} />
                    </TableCell>
                    <TableCell><QuotaBar link={link} /></TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {link.expiresText ?? t("never")}
                      {link.daysLeft != null && link.status !== "expired" && (
                        <p className={cn("text-[11px]", link.daysLeft <= 3 ? "text-amber-300" : "text-muted-foreground")}>
                          {link.daysLeft} {t("daysLeft")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell><ProtoChips link={link} /></TableCell>
                    <TableCell>{rowActions(link)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((link) => (
              <Card key={link.uuid} className="glass card-hover rounded-2xl">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setDetailsUid(link.uuid)}
                      className="truncate font-semibold transition-colors hover:text-primary"
                    >
                      {link.label}
                    </button>
                    <StatusBadge status={link.status} label={t(STATUS_LABEL_KEY[link.status])} />
                  </div>
                  <QuotaBar link={link} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <ProtoChips link={link} />
                    <span className="whitespace-nowrap tabular-nums">
                      {link.expiresText ?? t("never")}
                    </span>
                  </div>
                  <Separator className="bg-border/50" />
                  {rowActions(link)}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dialogs */}
      {builderOpen && (
        <BuilderDialog
          open={builderOpen}
          editLink={editLink}
          onClose={() => {
            setBuilderOpen(false);
            setEditUid(null);
          }}
        />
      )}
      <DetailsDialog
        link={detailsLink}
        onClose={() => setDetailsUid(null)}
        onEdit={(l) => {
          setEditUid(l.uuid);
          setBuilderOpen(true);
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteUid)} onOpenChange={(v) => !v && setDeleteUid(null)}>
        <AlertDialogContent className="glass rounded-2xl border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteLinkTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLink?.label} — {t("deleteLinkBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteUid) await api.deleteLink(deleteUid);
                setDeleteUid(null);
              }}
              className="bg-gradient-to-r from-[#b91c2e] to-[#ef2a3a] text-white hover:brightness-110"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
