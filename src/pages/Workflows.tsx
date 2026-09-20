import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLang, useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";
import { workflowsMessages } from "@/i18n/messages/workflows";
import {
  ACTION_TYPES,
  CRITERIA_FIELDS,
  CRITERIA_OPS,
  INCIDENT_STATUSES,
  type ActionType,
  type Criterion,
  type Workflow,
  type WorkflowAction,
} from "@/lib/workflows";
import { humanizeSubType, INCIDENT_TYPES, profileFor, typeLabel, type IncidentType } from "@/lib/industries";
import {
  Bot,
  CircleDot,
  Filter,
  Lock,
  Loader2,
  Mail,
  Pencil,
  Plus,
  ShieldAlert,
  Tag,
  Trash2,
  Users,
} from "lucide-react";

type EmailList = { id: string; name: string };

const ACTION_ICON: Record<ActionType, typeof Bot> = {
  draft_package: Bot,
  notify: Users,
  set_status: CircleDot,
  lock_public: Lock,
  log_only: Mail,
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runCounts, setRunCounts] = useState<Record<string, number>>({});
  const [lists, setLists] = useState<EmailList[]>([]);
  const [industry, setIndustry] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<number | null>(3);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);

  const t = useMessages(workflowsMessages);
  const common = useMessages(commonMessages);
  const { lang } = useLang();

  const emptyDraft = (): Workflow => ({
    id: "",
    name: "",
    enabled: true,
    incident_type: null,
    sub_type: null,
    min_crisis_level: 3,
    criteria: [],
    actions: [{ type: "draft_package", detail: "" }],
    next_status: null,
  });
  const [draft, setDraft] = useState<Workflow>(emptyDraft());

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: user }, rules, runs, listRows, settings] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("workflows")
        .select("id, name, enabled, incident_type, sub_type, min_crisis_level, criteria, actions, next_status")
        .order("created_at", { ascending: true }),
      supabase.from("workflow_runs").select("workflow_id"),
      supabase.from("email_lists").select("id, name").order("name"),
      supabase.from("company_settings").select("id, industry, auto_package_level").maybeSingle(),
    ]);

    if (user.user?.id) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    }
    if (rules.error) toast({ title: rules.error.message, variant: "destructive" });
    setWorkflows(((rules.data ?? []) as unknown as Workflow[]) ?? []);

    const counts: Record<string, number> = {};
    for (const r of runs.data ?? []) counts[r.workflow_id] = (counts[r.workflow_id] ?? 0) + 1;
    setRunCounts(counts);

    setLists((listRows.data ?? []) as EmailList[]);
    setIndustry(settings.data?.industry ?? null);
    setBaseline(settings.data?.auto_package_level ?? null);
    setSettingsId(settings.data?.id ?? null);
    setLoading(false);
  }

  async function saveBaseline(value: number | null) {
    setBaseline(value);
    if (!settingsId) return;
    const { data, error } = await supabase
      .from("company_settings")
      .update({ auto_package_level: value })
      .eq("id", settingsId)
      .select();
    if (error || !data?.length) {
      return toast({ title: error?.message ?? t.adminOnly, variant: "destructive" });
    }
    toast({ title: t.saved });
  }

  const startNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setOpen(true);
  };

  const startEdit = (w: Workflow) => {
    setEditing(w);
    setDraft(JSON.parse(JSON.stringify(w)));
    setOpen(true);
  };

  async function toggle(w: Workflow) {
    const { error } = await supabase.from("workflows").update({ enabled: !w.enabled }).eq("id", w.id);
    if (error) return toast({ title: error.message, variant: "destructive" });
    await load();
  }

  async function remove(w: Workflow) {
    if (!window.confirm(t.deleteConfirm)) return;
    const { error } = await supabase.from("workflows").delete().eq("id", w.id);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: t.deleted });
    await load();
  }

  async function save() {
    if (!draft.name.trim()) return toast({ title: t.nameRequired, variant: "destructive" });
    const actions = (draft.actions ?? []).filter((a) => a.type);
    if (!actions.length) return toast({ title: t.actionRequired, variant: "destructive" });
    if (actions.some((a) => a.type === "notify" && !a.detail)) {
      return toast({ title: t.notifyNeedsList, variant: "destructive" });
    }
    if (actions.some((a) => a.type === "set_status") && !draft.next_status) {
      return toast({ title: t.statusNeedsChoice, variant: "destructive" });
    }

    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      enabled: draft.enabled,
      incident_type: draft.incident_type,
      sub_type: draft.sub_type,
      min_crisis_level: draft.min_crisis_level,
      // An unfinished criterion filters nothing and only confuses the card.
      criteria: (draft.criteria ?? []).filter((c) => c.value.trim()),
      actions,
      next_status: actions.some((a) => a.type === "set_status") ? draft.next_status : null,
    };
    const { data, error } = editing
      ? await supabase.from("workflows").update(payload).eq("id", editing.id).select()
      : await supabase.from("workflows").insert(payload).select();
    setSaving(false);

    // An RLS refusal returns no error and no rows, which would otherwise read
    // as "saved" right before the list reloads without the rule.
    if (error) return toast({ title: error.message, variant: "destructive" });
    if (!data?.length) return toast({ title: t.adminOnly, variant: "destructive" });

    toast({ title: editing ? t.updated : t.created });
    setOpen(false);
    await load();
  }

  const subTypes = draft.incident_type
    ? profileFor(industry).subTypes[draft.incident_type as IncidentType] ?? []
    : [];

  const setAction = (i: number, next: Partial<WorkflowAction>) =>
    setDraft((d) => {
      const actions = [...d.actions];
      actions[i] = { ...actions[i], ...next };
      return { ...d, actions };
    });

  const setCriterion = (i: number, next: Partial<Criterion>) =>
    setDraft((d) => {
      const criteria = [...d.criteria];
      criteria[i] = { ...criteria[i], ...next };
      return { ...d, criteria };
    });

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t.intro}</p>
          {!isAdmin && <p className="text-xs text-muted-foreground mt-2">{t.adminOnly}</p>}
        </div>
        {isAdmin && (
          <Button onClick={startNew}>
            <Plus className="h-4 w-4 mr-2" /> {t.newWorkflow}
          </Button>
        )}
      </div>

      {/* The baseline, which every rule sits on top of. */}
      <Card className="p-5 border-primary/30 bg-primary/[0.03]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{t.baselineTitle}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {baseline === null ? t.baselineOff : t.baselineOn(common.level[baseline])}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">{t.baselineHint}</p>
            </div>
          </div>
          {isAdmin && (
            <Select
              value={baseline === null ? "off" : String(baseline)}
              onValueChange={(v) => void saveBaseline(v === "off" ? null : Number(v))}
            >
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{t.baselineOffOption}</SelectItem>
                {[1, 2, 3, 4].map((l) => (
                  <SelectItem key={l} value={String(l)}>{t.baselineLevelOption(common.level[l])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {workflows.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">{t.empty}</Card>
        )}

        {workflows.map((w) => (
          <Card key={w.id} className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate">{w.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={w.enabled ? "default" : "secondary"} className="text-[10px]">
                      {w.enabled ? t.active : t.disabled}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {runCounts[w.id] ? t.firedCount(runCounts[w.id]) : t.neverFired}
                    </span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => void toggle(w)}>
                    {w.enabled ? t.disable : t.enable}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(w)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void remove(w)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-3 mt-4">
              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">
                  {t.legend.classification}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill>
                    <Tag className="h-3 w-3" />
                    {w.incident_type ? typeLabel(industry, w.incident_type as IncidentType, lang) : t.anyType}
                  </Pill>
                  {w.sub_type && <Pill>{humanizeSubType(w.sub_type, lang)}</Pill>}
                  <Pill>
                    <ShieldAlert className="h-3 w-3" /> {t.atLevel(common.level[w.min_crisis_level])}
                  </Pill>
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">
                  {t.legend.criteria}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(w.criteria ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  {(w.criteria ?? []).map((c, i) => (
                    <Pill key={i}>
                      <Filter className="h-3 w-3" /> {t.fields[c.field] ?? c.field} {t.ops[c.op] ?? c.op} {c.value}
                    </Pill>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">
                  {t.legend.actions}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(w.actions ?? []).map((a, i) => {
                    const Icon = ACTION_ICON[a.type] ?? Mail;
                    const listName = a.type === "notify"
                      ? lists.find((l) => l.id === a.detail)?.name ?? a.detail
                      : null;
                    const status = a.type === "set_status" && w.next_status
                      ? common.status[w.next_status] ?? w.next_status
                      : null;
                    return (
                      <Pill key={i}>
                        <Icon className="h-3 w-3" />
                        {t.actionTypes[a.type] ?? a.type}
                        {listName ? `: ${listName}` : ""}
                        {status ? `: ${status}` : ""}
                      </Pill>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t.editWorkflow : t.newWorkflow}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label>{t.name}</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t.namePlaceholder}
                className="mt-1.5"
                maxLength={120}
              />
            </div>

            <div className="rounded-md border border-border p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-3">
                {t.legend.classification}
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{t.type}</Label>
                  <Select
                    value={draft.incident_type ?? "any"}
                    onValueChange={(v) =>
                      setDraft({ ...draft, incident_type: v === "any" ? null : v, sub_type: null })
                    }
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t.anyType}</SelectItem>
                      {INCIDENT_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>{typeLabel(industry, v, lang)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t.subType}</Label>
                  <Select
                    value={draft.sub_type ?? "any"}
                    onValueChange={(v) => setDraft({ ...draft, sub_type: v === "any" ? null : v })}
                    disabled={!draft.incident_type}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t.anySubType}</SelectItem>
                      {subTypes.map((s) => (
                        <SelectItem key={s} value={s}>{humanizeSubType(s, lang)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t.minLevel}</Label>
                  <Select
                    value={String(draft.min_crisis_level)}
                    onValueChange={(v) => setDraft({ ...draft, min_crisis_level: Number(v) })}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4].map((l) => (
                        <SelectItem key={l} value={String(l)}>{common.level[l]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground/70">{t.legend.criteria}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft((d) => ({ ...d, criteria: [...d.criteria, { field: CRITERIA_FIELDS[0], op: ">=", value: "" }] }))
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> {t.add}
                </Button>
              </div>
              <div className="space-y-2">
                {draft.criteria.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Select value={c.field} onValueChange={(v) => setCriterion(i, { field: v })}>
                      <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CRITERIA_FIELDS.map((f) => (
                          <SelectItem key={f} value={f}>{t.fields[f] ?? f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={c.op} onValueChange={(v) => setCriterion(i, { op: v })}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CRITERIA_OPS.map((o) => (
                          <SelectItem key={o} value={o}>{t.ops[o] ?? o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-4"
                      value={c.value}
                      placeholder={t.valuePlaceholder}
                      onChange={(e) => setCriterion(i, { value: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="col-span-1"
                      onClick={() => setDraft((d) => ({ ...d, criteria: d.criteria.filter((_, idx) => idx !== i) }))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground/70">{t.legend.actions}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, actions: [...d.actions, { type: "log_only", detail: "" }] }))}
                >
                  <Plus className="h-3 w-3 mr-1" /> {t.add}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">{t.noPublishNote}</p>
              <div className="space-y-3">
                {draft.actions.map((a, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-2">
                      <Select value={a.type} onValueChange={(v) => setAction(i, { type: v as ActionType, detail: "" })}>
                        <SelectTrigger className="col-span-6"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((v) => (
                            <SelectItem key={v} value={v}>{t.actionTypes[v] ?? v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {a.type === "notify" && (
                        <Select value={a.detail} onValueChange={(v) => setAction(i, { detail: v })}>
                          <SelectTrigger className="col-span-5">
                            <SelectValue placeholder={lists.length ? t.list : t.noLists} />
                          </SelectTrigger>
                          <SelectContent>
                            {lists.map((l) => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {a.type === "set_status" && (
                        <Select
                          value={draft.next_status ?? ""}
                          onValueChange={(v) => setDraft((d) => ({ ...d, next_status: v }))}
                        >
                          <SelectTrigger className="col-span-5">
                            <SelectValue placeholder={t.moveTo} />
                          </SelectTrigger>
                          <SelectContent>
                            {INCIDENT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{common.status[s] ?? s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className={a.type === "notify" || a.type === "set_status" ? "col-span-1" : "col-span-6"}
                        onClick={() => setDraft((d) => ({ ...d, actions: d.actions.filter((_, idx) => idx !== i) }))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t.actionHelp[a.type]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? t.saveChanges : t.createWorkflow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
