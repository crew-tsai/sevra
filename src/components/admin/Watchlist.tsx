import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AtSign, Hash, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useMessages } from "@/i18n";
import { adminMessages } from "@/i18n/messages/admin";

type Network = "x" | "facebook" | "instagram";

type Entry = {
  id: string;
  network: Network;
  kind: "account" | "hashtag" | "keyword";
  value: string;
  label: string | null;
  amplifies: boolean;
  active: boolean;
};

// TikTok is absent on purpose: nothing is collected there at all, so an entry
// would sit in the list doing nothing. The column accepts it for the day that
// changes.
const NETWORKS: Network[] = ["x", "facebook", "instagram"];

/**
 * Accounts and hashtags to watch, beyond the company's own name.
 *
 * Two things are worth saying plainly in the UI, because getting either wrong
 * wastes a client's time:
 *
 *  - It works on X. Facebook and TikTok cannot be searched at all, and
 *    Instagram's hashtag search needs permissions Sevra does not hold yet.
 *  - An account marked as amplifying raises the crisis level of what it posts.
 *    That is the real reason to keep the list short and deliberate.
 */
export function Watchlist({ isAdmin }: { isAdmin: boolean }) {
  const t = useMessages(adminMessages).watchlist;
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [network, setNetwork] = useState<Network>("x");
  const [kind, setKind] = useState<Entry["kind"]>("account");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("monitor_watchlist")
      .select("id, network, kind, value, label, amplifies, active")
      .in("network", NETWORKS)
      .order("created_at");
    setRows((data ?? []) as Entry[]);
  }

  async function add() {
    const clean = value.trim().replace(/^[@#]/, "");
    if (!clean) return;
    setBusy(true);
    const { error } = await supabase.from("monitor_watchlist").insert({
      network,
      kind,
      value: clean,
      label: label.trim() || null,
      // A hashtag is used by anyone, so it says nothing about reach. An
      // account is watched precisely because of who it is.
      amplifies: kind === "account",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setValue("");
    setLabel("");
    void load();
  }

  async function toggle(row: Entry, field: "active" | "amplifies") {
    // Spelled out rather than built from a variable key: the generated types
    // reject a computed property, and two lines are cheaper than a cast that
    // would also accept a column that does not exist.
    const patch = field === "active" ? { active: !row.active } : { amplifies: !row.amplifies };
    const { error } = await supabase
      .from("monitor_watchlist")
      .update(patch)
      .eq("id", row.id)
      .select("id");
    if (error) return toast.error(error.message);
    void load();
  }

  async function remove(row: Entry) {
    const { error } = await supabase.from("monitor_watchlist").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    void load();
  }

  const icon = (k: Entry["kind"]) =>
    k === "account" ? <AtSign className="h-3.5 w-3.5" />
      : k === "hashtag" ? <Hash className="h-3.5 w-3.5" />
      : <Search className="h-3.5 w-3.5" />;

  const prefix = (k: Entry["kind"]) => (k === "account" ? "@" : k === "hashtag" ? "#" : "");

  // What an entry actually does differs by network, and saying so is the whole
  // reason the selector is safe to offer. On X it is a search; on Facebook and
  // Instagram nothing can be searched, so it marks what the client's own
  // accounts already receive.
  const behaviour = (n: Network) => (n === "x" ? t.behaviourSearch : t.behaviourFlag);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{t.title}</Label>
        <p className="text-xs text-muted-foreground">{t.intro}</p>
      </div>

      {rows === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-3 py-2">
              <Badge variant="outline" className="shrink-0 text-[10px] uppercase">{t.networks[row.network]}</Badge>
              <span className="text-muted-foreground">{icon(row.kind)}</span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${row.active ? "" : "text-muted-foreground line-through"}`}>
                  {prefix(row.kind)}{row.value}
                </p>
                {row.label && <p className="truncate text-xs text-muted-foreground">{row.label}</p>}
              </div>

              {row.kind === "account" && (
                <Badge
                  variant={row.amplifies ? "default" : "outline"}
                  className={`cursor-pointer text-[10px] ${isAdmin ? "" : "pointer-events-none"}`}
                  title={t.amplifiesHint}
                  onClick={() => isAdmin && void toggle(row, "amplifies")}
                >
                  {row.amplifies ? t.amplifies : t.amplifiesOff}
                </Badge>
              )}

              <Switch
                checked={row.active}
                disabled={!isAdmin}
                onCheckedChange={() => void toggle(row, "active")}
                aria-label={t.active}
              />

              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void remove(row)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div className="grid gap-2 sm:grid-cols-[120px_120px_1fr_1fr_auto]">
          <Select
            value={network}
            onValueChange={(v) => {
              setNetwork(v as Network);
              // Only X can be searched for words, so a keyword entry means
              // nothing there; fall back to the kind every network supports.
              if (v !== "x" && kind === "keyword") setKind("account");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NETWORKS.map((n) => (
                <SelectItem key={n} value={n}>{t.networks[n]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={(v) => setKind(v as Entry["kind"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="account">{t.kindAccount}</SelectItem>
              <SelectItem value="hashtag">{t.kindHashtag}</SelectItem>
              {network === "x" && <SelectItem value="keyword">{t.kindKeyword}</SelectItem>}
            </SelectContent>
          </Select>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "account" ? "@handle" : kind === "hashtag" ? "#hashtag" : t.keywordPlaceholder}
            maxLength={80}
            onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t.labelPlaceholder}
            maxLength={80}
          />
          <Button type="button" variant="outline" disabled={busy || !value.trim()} onClick={() => void add()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{behaviour(network)}</p>
      <p className="text-xs text-muted-foreground">{t.platformNote}</p>
    </div>
  );
}
