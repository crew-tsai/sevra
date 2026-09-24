import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserX } from "lucide-react";
import { useMessages } from "@/i18n";
import { adminMessages } from "@/i18n/messages/admin";

/**
 * Retention, and acting on an erasure request.
 *
 * Monitoring collects the name, handle, avatar and words of people who never
 * signed up to anything. The privacy policy already told them they could ask
 * for that to be deleted and that Sevra would help this workspace answer —
 * and until now there was no way to find them, no way to delete them, and no
 * limit on how long they were kept.
 *
 * A mention attached to an incident is redacted rather than deleted: the
 * incident is a record of something that happened, and quietly changing how
 * many mentions it had would damage the thing a regulator may one day read.
 */
export function PersonalData({ isAdmin }: { isAdmin: boolean }) {
  const t = useMessages(adminMessages).personalData;
  const [days, setDays] = useState<number | null>(365);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("id, mention_retention_days")
        .maybeSingle();
      setSettingsId(data?.id ?? null);
      setDays(data?.mention_retention_days ?? null);
    })();
  }, []);

  async function saveDays(value: number | null) {
    setDays(value);
    if (!settingsId) return;
    const { data, error } = await supabase
      .from("company_settings")
      .update({ mention_retention_days: value })
      .eq("id", settingsId)
      .select();
    if (error || !data?.length) return toast.error(error?.message ?? t.notAllowed);
    toast.success(t.saved);
  }

  async function erase() {
    const clean = handle.trim().replace(/^@/, "");
    if (!clean) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("erase_author", { _handle: clean });
    setBusy(false);
    setConfirming(false);
    if (error) return toast.error(error.message);
    const row = (data as Array<{ deleted: number; redacted: number }> | null)?.[0];
    const deleted = row?.deleted ?? 0;
    const redacted = row?.redacted ?? 0;
    if (!deleted && !redacted) return toast.info(t.nothingFound(clean));
    setHandle("");
    toast.success(t.erased(deleted, redacted));
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{t.title}</Label>
        <p className="text-xs text-muted-foreground">{t.intro}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t.retentionLabel}</Label>
        <Select
          value={days === null ? "forever" : String(days)}
          onValueChange={(v) => void saveDays(v === "forever" ? null : Number(v))}
          disabled={!isAdmin}
        >
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[90, 180, 365, 730].map((d) => (
              <SelectItem key={d} value={String(d)}>{t.months(Math.round(d / 30))}</SelectItem>
            ))}
            <SelectItem value="forever">{t.forever}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t.retentionHint}</p>
      </div>

      {isAdmin && (
        <div className="space-y-1.5">
          <Label htmlFor="erase-handle" className="text-xs text-muted-foreground">{t.eraseLabel}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="erase-handle"
              value={handle}
              onChange={(e) => { setHandle(e.target.value); setConfirming(false); }}
              placeholder="@handle"
              maxLength={80}
              className="max-w-xs"
            />
            {confirming ? (
              <>
                <Button variant="destructive" size="sm" disabled={busy} onClick={() => void erase()}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                  {t.eraseConfirm(handle.trim().replace(/^@/, ""))}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>{t.cancel}</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" disabled={!handle.trim()} onClick={() => setConfirming(true)}>
                <UserX className="h-3.5 w-3.5" /> {t.erase}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t.eraseHint}</p>
        </div>
      )}
    </div>
  );
}
