import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";
import { workflowsMessages } from "@/i18n/messages/workflows";
import {
  AlertTriangle,
  Tag,
  Filter,
  Zap,
  CircleDot,
  Plus,
  Trash2,
  Bot,
  Users,
  ShieldAlert,
  CheckCircle2,
  Megaphone,
  Mail,
  Pencil,
} from "lucide-react";

type Criterion = { field: string; op: string; value: string };
type Action = { type: string; detail: string };
type Workflow = {
  id: string;
  name: string;
  enabled: boolean;
  classification: { type: string; subtype: string; level: string };
  criteria: Criterion[];
  actions: Action[];
  nextStatus: string;
};

const CLASSIFICATION_TYPES = ["Operational", "Safety", "Reputational", "Regulatory", "Cyber"];
const CRISIS_LEVELS = ["L0", "L1", "L2", "L3", "L4"];
const CRITERIA_FIELDS = ["Risk score", "People impacted", "Influencer involved", "Regulator involved", "Region", "Source"];
const CRITERIA_OPS = [">=", ">", "=", "<", "<=", "contains"];
const ACTION_TYPES = [
  "Generate assets with AI",
  "Notify team",
  "Open approval flow",
  "Publish to channels",
  "Lock public publishing",
  "Log to audit only",
];
const STATUSES = [
  "Triage → Active",
  "Active → Containment",
  "Containment → Resolved",
  "Active → Under review",
  "Triage → Closed",
];

const SEED: Workflow[] = [
  {
    id: "wf-1",
    name: "Auto-escalate L3+ safety events",
    enabled: true,
    classification: { type: "Safety", subtype: "Any", level: "L3" },
    criteria: [{ field: "Risk score", op: ">=", value: "70" }],
    actions: [
      { type: "Notify team", detail: "CEO + Head of Comms" },
      { type: "Generate assets with AI", detail: "Holding statement" },
      { type: "Open approval flow", detail: "Priority 2-step" },
    ],
    nextStatus: "Active → Containment",
  },
  {
    id: "wf-2",
    name: "Viral social signal response",
    enabled: true,
    classification: { type: "Reputational", subtype: "Social", level: "L2" },
    criteria: [
      { field: "Influencer involved", op: "=", value: "true" },
      { field: "Risk score", op: ">=", value: "70" },
    ],
    actions: [
      { type: "Generate assets with AI", detail: "Social reply + press note" },
      { type: "Notify team", detail: "Social Lead" },
    ],
    nextStatus: "Triage → Active",
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>(SEED);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const t = useMessages(workflowsMessages);
  const common = useMessages(commonMessages);
  const L = (v: string) => t.values[v] ?? v;

  const emptyDraft = (): Workflow => ({
    id: `wf-${Date.now()}`,
    name: "",
    enabled: true,
    classification: { type: CLASSIFICATION_TYPES[0], subtype: "Any", level: "L2" },
    criteria: [{ field: CRITERIA_FIELDS[0], op: ">=", value: "" }],
    actions: [{ type: ACTION_TYPES[0], detail: "" }],
    nextStatus: STATUSES[0],
  });
  const [draft, setDraft] = useState<Workflow>(emptyDraft());

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
  const remove = (id: string) => {
    setWorkflows((ws) => ws.filter((w) => w.id !== id));
    toast({ title: t.deleted });
  };
  const toggle = (id: string) => {
    setWorkflows((ws) => ws.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)));
  };
  const save = () => {
    if (!draft.name.trim()) {
      toast({ title: t.nameRequired, variant: "destructive" });
      return;
    }
    setWorkflows((ws) => {
      const exists = ws.some((w) => w.id === draft.id);
      return exists ? ws.map((w) => (w.id === draft.id ? draft : w)) : [...ws, draft];
    });
    toast({ title: editing ? t.updated : t.created });
    setOpen(false);
  };

  const addCriterion = () =>
    setDraft((d) => ({ ...d, criteria: [...d.criteria, { field: CRITERIA_FIELDS[0], op: ">=", value: "" }] }));
  const removeCriterion = (i: number) =>
    setDraft((d) => ({ ...d, criteria: d.criteria.filter((_, idx) => idx !== i) }));
  const addAction = () =>
    setDraft((d) => ({ ...d, actions: [...d.actions, { type: ACTION_TYPES[0], detail: "" }] }));
  const removeAction = (i: number) =>
    setDraft((d) => ({ ...d, actions: d.actions.filter((_, idx) => idx !== i) }));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {t.intro}
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-2" /> {t.newWorkflow}
        </Button>
      </div>

      {/* Flow legend */}
      <Card className="p-4 bg-card border-border">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {[
            { icon: AlertTriangle, label: t.legend.incident },
            { icon: Tag, label: t.legend.classification },
            { icon: Filter, label: t.legend.criteria },
            { icon: Zap, label: t.legend.actions },
            { icon: CircleDot, label: t.legend.nextStatus },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <span className="font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Workflows list */}
      <div className="space-y-4">
        {workflows.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">{t.empty}</Card>
        )}
        {workflows.map((w) => (
          <Card key={w.id} className="p-5 bg-card border-border">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate">{L(w.name)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={w.enabled ? "default" : "secondary"} className="text-[10px]">
                      {w.enabled ? t.active : t.disabled}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {L(w.classification.type)} · {w.classification.level}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toggle(w.id)}>
                  {w.enabled ? t.disable : t.enable}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => startEdit(w)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(w.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mt-4">
              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">{t.legend.classification}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill><Tag className="h-3 w-3" /> {L(w.classification.type)}</Pill>
                  <Pill><ShieldAlert className="h-3 w-3" /> ≥ {w.classification.level}</Pill>
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">{t.legend.criteria}</div>
                <div className="flex flex-wrap gap-1.5">
                  {w.criteria.map((c, i) => (
                    <Pill key={i}><Filter className="h-3 w-3" /> {L(c.field)} {L(c.op)} {L(c.value)}</Pill>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">{t.legend.actions}</div>
                <div className="flex flex-wrap gap-1.5">
                  {w.actions.map((a, i) => {
                    const Icon =
                      a.type.startsWith("Generate") ? Bot :
                      a.type.startsWith("Notify") ? Users :
                      a.type.startsWith("Open approval") ? CheckCircle2 :
                      a.type.startsWith("Publish") ? Megaphone : Mail;
                    return <Pill key={i}><Icon className="h-3 w-3" /> {L(a.type)}{a.detail ? `: ${L(a.detail)}` : ""}</Pill>;
                  })}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">{t.legend.nextStatus}</div>
                <Pill><CircleDot className="h-3 w-3" /> {L(w.nextStatus)}</Pill>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Builder dialog */}
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
              />
            </div>

            {/* Classification */}
            <div className="rounded-md border border-border p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-3">{t.legend.classification}</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{t.type}</Label>
                  <Select
                    value={draft.classification.type}
                    onValueChange={(v) => setDraft({ ...draft, classification: { ...draft.classification, type: v } })}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATION_TYPES.map((v) => <SelectItem key={v} value={v}>{L(v)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t.subType}</Label>
                  <Input
                    value={draft.classification.subtype}
                    onChange={(e) => setDraft({ ...draft, classification: { ...draft.classification, subtype: e.target.value } })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t.minLevel}</Label>
                  <Select
                    value={draft.classification.level}
                    onValueChange={(v) => setDraft({ ...draft, classification: { ...draft.classification, level: v } })}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CRISIS_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Criteria */}
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground/70">{t.legend.criteria}</div>
                <Button variant="ghost" size="sm" onClick={addCriterion}>
                  <Plus className="h-3 w-3 mr-1" /> {t.add}
                </Button>
              </div>
              <div className="space-y-2">
                {draft.criteria.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Select value={c.field} onValueChange={(v) => {
                      const next = [...draft.criteria]; next[i] = { ...c, field: v }; setDraft({ ...draft, criteria: next });
                    }}>
                      <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CRITERIA_FIELDS.map((f) => <SelectItem key={f} value={f}>{L(f)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={c.op} onValueChange={(v) => {
                      const next = [...draft.criteria]; next[i] = { ...c, op: v }; setDraft({ ...draft, criteria: next });
                    }}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CRITERIA_OPS.map((o) => <SelectItem key={o} value={o}>{L(o)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-4"
                      value={c.value}
                      placeholder={t.valuePlaceholder}
                      onChange={(e) => {
                        const next = [...draft.criteria]; next[i] = { ...c, value: e.target.value }; setDraft({ ...draft, criteria: next });
                      }}
                    />
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeCriterion(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground/70">{t.legend.actions}</div>
                <Button variant="ghost" size="sm" onClick={addAction}>
                  <Plus className="h-3 w-3 mr-1" /> {t.add}
                </Button>
              </div>
              <div className="space-y-2">
                {draft.actions.map((a, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Select value={a.type} onValueChange={(v) => {
                      const next = [...draft.actions]; next[i] = { ...a, type: v }; setDraft({ ...draft, actions: next });
                    }}>
                      <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((v) => <SelectItem key={v} value={v}>{L(v)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-6"
                      value={a.detail}
                      placeholder={t.detailPlaceholder}
                      onChange={(e) => {
                        const next = [...draft.actions]; next[i] = { ...a, detail: e.target.value }; setDraft({ ...draft, actions: next });
                      }}
                    />
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeAction(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Next status */}
            <div>
              <Label>{t.moveTo}</Label>
              <Select value={draft.nextStatus} onValueChange={(v) => setDraft({ ...draft, nextStatus: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((v) => <SelectItem key={v} value={v}>{L(v)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{common.cancel}</Button>
            <Button onClick={save}>{editing ? t.saveChanges : t.createWorkflow}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
