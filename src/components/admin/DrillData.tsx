import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useMessages } from "@/i18n";
import { adminMessages } from "@/i18n/messages/admin";

/**
 * Clearing up after a rehearsal.
 *
 * A drill nobody can remove is a drill nobody runs twice — the workspace fills
 * with practice incidents that look like history. One button, admin only,
 * cascading through everything that hung off them.
 *
 * It asks first, and it says how much it is about to delete, because the one
 * way this goes badly is somebody pressing it thinking "drill" meant something
 * else.
 */
export function DrillData({ isAdmin }: { isAdmin: boolean }) {
  const t = useMessages(adminMessages).drills;
  const [counts, setCounts] = useState<{ incidents: number; mentions: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void count();
  }, []);

  async function count() {
    const [{ count: incidents }, { count: mentions }] = await Promise.all([
      supabase.from("incidents").select("id", { count: "exact", head: true }).eq("is_drill", true),
      supabase.from("social_mentions").select("id", { count: "exact", head: true }).eq("is_drill", true),
    ]);
    setCounts({ incidents: incidents ?? 0, mentions: mentions ?? 0 });
  }

  async function purge() {
    setBusy(true);
    const { error } = await supabase.rpc("purge_drills");
    setBusy(false);
    setConfirming(false);
    if (error) return toast.error(error.message);
    toast.success(t.cleared);
    void count();
  }

  if (!counts) return null;

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <Label className="text-sm font-medium">{t.title}</Label>
      <p className="text-xs text-muted-foreground">{t.intro}</p>
      <p className="text-xs text-muted-foreground">
        {counts.incidents === 0 && counts.mentions === 0
          ? t.none
          : t.holding(counts.incidents, counts.mentions)}
      </p>
      {isAdmin && (counts.incidents > 0 || counts.mentions > 0) && (
        confirming ? (
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void purge()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {t.confirm(counts.incidents, counts.mentions)}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>{t.cancel}</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 className="h-3.5 w-3.5" /> {t.clear}
          </Button>
        )
      )}
    </div>
  );
}
