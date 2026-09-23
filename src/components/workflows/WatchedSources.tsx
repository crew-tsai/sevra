import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Eye, Hash, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMessages } from "@/i18n";
import { workflowsMessages } from "@/i18n/messages/workflows";
import {
  NETWORKS,
  NETWORK_LABELS,
  SOURCE_ROLES,
  roleDefaults,
  sourceCoverage,
  type Network,
  type SourceRole,
} from "@/lib/watched-sources";

type Source = {
  id: string;
  name: string;
  role: SourceRole;
  note: string | null;
  amplifies: boolean;
  watch_everything: boolean;
  active: boolean;
  accounts: Array<{ network: Network; handle: string }>;
};

type Topic = {
  id: string;
  kind: "hashtag" | "phrase";
  value: string;
  note: string | null;
  amplifies: boolean;
  active: boolean;
};

const BLANK_HANDLES = () => Object.fromEntries(NETWORKS.map((n) => [n, ""])) as Record<Network, string>;

/**
 * Who this workspace listens to beyond its own name.
 *
 * It lives in Workflows, not Admin, because it is the same decision as the
 * rules beside it — what the product does on its own — rather than part of the
 * company profile. Decided with the partners on 2026-09-23.
 *
 * The rule the old version broke, and this one keeps: the client says who to
 * watch, and Sevra says what it can do about it. Every source reports its own
 * coverage, including the cases where the honest answer is "nothing" — a
 * source with only a TikTok handle, or a Facebook Page on a workspace that has
 * not connected Facebook. Those used to look exactly like a source that
 * worked.
 */
export function WatchedSources({ isAdmin }: { isAdmin: boolean }) {
  const t = useMessages(workflowsMessages).sources;
  const [sources, setSources] = useState<Source[] | null>(null);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [connected, setConnected] = useState<Network[]>([]);
  const [editing, setEditing] = useState<Source | null>(null);
  const [form, setForm] = useState({
    name: "",
    role: "press" as SourceRole,
    note: "",
    amplifies: true,
    watchEverything: false,
    handles: BLANK_HANDLES(),
  });
  const [topicKind, setTopicKind] = useState<Topic["kind"]>("hashtag");
  const [topicValue, setTopicValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [{ data: srcRows }, { data: topicRows }, { data: connections }] = await Promise.all([
      supabase
        .from("monitor_sources")
        .select("id, name, role, note, amplifies, watch_everything, active, monitor_source_accounts(network, handle)")
        .order("created_at"),
      supabase.from("monitor_topics").select("id, kind, value, note, amplifies, active").order("created_at"),
      supabase.from("social_connections").select("network").eq("status", "connected"),
    ]);

    setSources(
      (srcRows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role as SourceRole,
        note: r.note,
        amplifies: r.amplifies,
        watch_everything: r.watch_everything,
        active: r.active,
        accounts: (r.monitor_source_accounts ?? []).map((a) => ({
          network: a.network as Network,
          handle: a.handle,
        })),
      })),
    );
    setTopics((topicRows ?? []) as Topic[]);
    setConnected((connections ?? []).map((c) => c.network as Network));
  }

  function startNew() {
    setForm({ name: "", role: "press", note: "", amplifies: true, watchEverything: false, handles: BLANK_HANDLES() });
    setEditing({ id: "", name: "", role: "press", note: null, amplifies: true, watch_everything: false, active: true, accounts: [] });
  }

  function startEdit(s: Source) {
    const handles = BLANK_HANDLES();
    for (const a of s.accounts) handles[a.network] = a.handle;
    setForm({
      name: s.name,
      role: s.role,
      note: s.note ?? "",
      amplifies: s.amplifies,
      watchEverything: s.watch_everything,
      handles,
    });
    setEditing(s);
  }

  // Picking the role rewrites the two switches, because the role is a summary
  // of how this kind of actor is usually watched. Only until the admin touches
  // them: after that the row means what they said, not what the role implies.
  function pickRole(role: SourceRole) {
    const d = roleDefaults(role);
    setForm((f) => ({ ...f, role, amplifies: d.amplifies, watchEverything: d.watchesEverything }));
  }

  async function saveSource() {
    const name = form.name.trim();
    if (!name) return toast.error(t.nameRequired);
    setBusy(true);

    const patch = {
      name,
      role: form.role,
      note: form.note.trim() || null,
      amplifies: form.amplifies,
      watch_everything: form.watchEverything,
    };

    const { data: saved, error } = editing?.id
      ? await supabase.from("monitor_sources").update(patch).eq("id", editing.id).select("id").maybeSingle()
      : await supabase.from("monitor_sources").insert(patch).select("id").maybeSingle();

    if (error || !saved) {
      setBusy(false);
      return toast.error(error?.message ?? "Could not save");
    }

    // Replace the handles wholesale: an emptied field means "they are not on
    // that network any more", which a partial upsert would silently ignore.
    const rows = NETWORKS.map((n) => ({
      source_id: saved.id,
      network: n,
      handle: form.handles[n].trim().replace(/^@/, ""),
    })).filter((r) => r.handle);

    await supabase.from("monitor_source_accounts").delete().eq("source_id", saved.id);
    if (rows.length) {
      const { error: accErr } = await supabase.from("monitor_source_accounts").insert(rows);
      if (accErr) {
        setBusy(false);
        return toast.error(accErr.message);
      }
    }

    setBusy(false);
    setEditing(null);
    void load();
  }

  async function toggleSource(s: Source, field: "active" | "amplifies" | "watch_everything") {
    const patch = field === "active" ? { active: !s.active }
      : field === "amplifies" ? { amplifies: !s.amplifies }
      : { watch_everything: !s.watch_everything };
    const { error } = await supabase.from("monitor_sources").update(patch).eq("id", s.id).select("id");
    if (error) return toast.error(error.message);
    void load();
  }

  async function removeSource(s: Source) {
    const { error } = await supabase.from("monitor_sources").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    void load();
  }

  async function addTopic() {
    const value = topicValue.trim().replace(/^#/, "");
    if (!value) return;
    setBusy(true);
    const { error } = await supabase.from("monitor_topics").insert({ kind: topicKind, value });
    setBusy(false);
    if (error) return toast.error(error.message);
    setTopicValue("");
    void load();
  }

  async function toggleTopic(topic: Topic) {
    const { error } = await supabase
      .from("monitor_topics")
      .update({ active: !topic.active })
      .eq("id", topic.id)
      .select("id");
    if (error) return toast.error(error.message);
    void load();
  }

  async function removeTopic(topic: Topic) {
    const { error } = await supabase.from("monitor_topics").delete().eq("id", topic.id);
    if (error) return toast.error(error.message);
    void load();
  }

  const names = (networks: Network[]) => networks.map((n) => NETWORK_LABELS[n]).join(", ");

  /** What this source actually does today, in the client's terms. */
  function Coverage({ source }: { source: Source }) {
    const cover = sourceCoverage(source.accounts.map((a) => a.network), connected);
    if (cover.watchesNothing) {
      return (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t.watchingNothingHint}</span>
        </p>
      );
    }
    return (
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {cover.searched.length > 0 && <p>{t.coverageSearched(names(cover.searched))}</p>}
        {cover.ownAccounts.length > 0 && <p>{t.coverageOwn(names(cover.ownAccounts))}</p>}
        {cover.needsConnection.length > 0 && <p>{t.coverageNeedsConnection(names(cover.needsConnection))}</p>}
        {cover.unreachable.length > 0 && <p>{t.coverageUnreachable(names(cover.unreachable))}</p>}
      </div>
    );
  }

  return (
    <Card className="p-5 space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground max-w-3xl">{t.intro}</p>
      </div>

      {/* Sources */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-medium">{t.sourcesTitle}</h3>
            <p className="text-xs text-muted-foreground">{t.sourcesIntro}</p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" /> {t.addSource}
            </Button>
          )}
        </div>

        {sources === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.emptySources}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {sources.map((s) => {
              const cover = sourceCoverage(s.accounts.map((a) => a.network), connected);
              return (
                <li key={s.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${s.active ? "" : "text-muted-foreground line-through"}`}>
                          {s.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">{t.roles[s.role] ?? s.role}</Badge>
                        {cover.watchesNothing && (
                          <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600 dark:text-amber-500">
                            {t.watchingNothing}
                          </Badge>
                        )}
                      </div>
                      {s.accounts.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {s.accounts.map((a) => `${NETWORK_LABELS[a.network]} @${a.handle}`).join(" · ")}
                        </p>
                      )}
                      {s.note && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{s.note}</p>}
                      <Coverage source={s} />
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${isAdmin ? "cursor-pointer" : "pointer-events-none"}`}
                        title={t.scopeHint}
                        onClick={() => isAdmin && void toggleSource(s, "watch_everything")}
                      >
                        {s.watch_everything ? t.scopeEverything : t.scopeMentions}
                      </Badge>
                      <Badge
                        variant={s.amplifies ? "default" : "outline"}
                        className={`text-[10px] ${isAdmin ? "cursor-pointer" : "pointer-events-none"}`}
                        title={t.amplifiesHint}
                        onClick={() => isAdmin && void toggleSource(s, "amplifies")}
                      >
                        {s.amplifies ? t.amplifies : t.amplifiesOff}
                      </Badge>
                      <Switch
                        checked={s.active}
                        disabled={!isAdmin}
                        onCheckedChange={() => void toggleSource(s, "active")}
                        aria-label={t.active}
                      />
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void removeSource(s)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Topics */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium">{t.topicsTitle}</h3>
          <p className="text-xs text-muted-foreground max-w-3xl">{t.topicsIntro}</p>
        </div>

        {topics === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : topics.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.emptyTopics}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {topics.map((topic) => (
              <li key={topic.id} className="flex items-center gap-3 px-3 py-2">
                <span className="text-muted-foreground">
                  {topic.kind === "hashtag" ? <Hash className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </span>
                <p className={`min-w-0 flex-1 truncate text-sm ${topic.active ? "" : "text-muted-foreground line-through"}`}>
                  {topic.kind === "hashtag" ? `#${topic.value}` : topic.value}
                </p>
                <Switch
                  checked={topic.active}
                  disabled={!isAdmin}
                  onCheckedChange={() => void toggleTopic(topic)}
                  aria-label={t.active}
                />
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void removeTopic(topic)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isAdmin && (
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
            <Select value={topicKind} onValueChange={(v) => setTopicKind(v as Topic["kind"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hashtag">{t.kindHashtag}</SelectItem>
                <SelectItem value="phrase">{t.kindPhrase}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={topicValue}
              onChange={(e) => setTopicValue(e.target.value)}
              placeholder={t.topicPlaceholder}
              maxLength={80}
              onKeyDown={(e) => { if (e.key === "Enter") void addTopic(); }}
            />
            <Button type="button" variant="outline" disabled={busy || !topicValue.trim()} onClick={() => void addTopic()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t.platformNote}</p>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t.editSource : t.addSource}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="source-name">{t.namePlaceholder}</Label>
              <Input
                id="source-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t.namePlaceholder}
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source-role">{t.roleLabel}</Label>
              <Select value={form.role} onValueChange={(v) => pickRole(v as SourceRole)}>
                <SelectTrigger id="source-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{t.roles[r.id] ?? r.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t.roleHint}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t.handlesTitle}</Label>
              <p className="text-xs text-muted-foreground">{t.handlesHint}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {NETWORKS.map((n) => (
                  <div key={n} className="space-y-1">
                    <Label htmlFor={`handle-${n}`} className="text-xs font-normal text-muted-foreground">
                      {NETWORK_LABELS[n]}
                    </Label>
                    <Input
                      id={`handle-${n}`}
                      value={form.handles[n]}
                      onChange={(e) => setForm((f) => ({ ...f, handles: { ...f.handles, [n]: e.target.value } }))}
                      placeholder={t.handlePlaceholder}
                      maxLength={80}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source-note">{t.notePlaceholder}</Label>
              <Input
                id="source-note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={t.notePlaceholder}
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm">{form.watchEverything ? t.scopeEverything : t.scopeMentions}</p>
                <p className="text-xs text-muted-foreground">{t.scopeHint}</p>
              </div>
              <Switch
                checked={form.watchEverything}
                onCheckedChange={(v) => setForm((f) => ({ ...f, watchEverything: v }))}
                aria-label={t.scopeEverything}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm">{form.amplifies ? t.amplifies : t.amplifiesOff}</p>
                <p className="text-xs text-muted-foreground">{t.amplifiesHint}</p>
              </div>
              <Switch
                checked={form.amplifies}
                onCheckedChange={(v) => setForm((f) => ({ ...f, amplifies: v }))}
                aria-label={t.amplifies}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>{t.cancel}</Button>
            <Button disabled={busy} onClick={() => void saveSource()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
