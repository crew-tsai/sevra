import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle, Activity, Shield, CheckCircle, Radio, Hand } from "lucide-react";
import { toast } from "sonner";

type Incident = {
  id: string;
  title: string;
  risk: string;
  status: string;
  source: string;
  assignee: string | null;
  airline_name: string | null;
  flight_number: string | null;
  created_at: string;
};

const SOURCE_META: Record<string, { label: string; icon: typeof Radio; className: string }> = {
  social_media: { label: "Social Intel", icon: Radio, className: "border-primary/40 text-primary" },
  manual: { label: "Manual", icon: Hand, className: "border-border text-muted-foreground" },
};

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "social_media">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "monitoring" | "contained" | "resolved">("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("incidents")
        .select("id, title, risk, status, source, assignee, airline_name, flight_number, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast.error(error.message);
      setIncidents((data ?? []) as Incident[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("incidents_dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = [
    { key: "active", label: "Active", value: incidents.filter((i) => i.status === "active").length, icon: AlertTriangle, color: "text-risk-critical" },
    { key: "monitoring", label: "Monitoring", value: incidents.filter((i) => i.status === "monitoring").length, icon: Activity, color: "text-risk-high" },
    { key: "contained", label: "Contained", value: incidents.filter((i) => i.status === "contained").length, icon: Shield, color: "text-risk-medium" },
    { key: "resolved", label: "Resolved", value: incidents.filter((i) => i.status === "resolved").length, icon: CheckCircle, color: "text-risk-low" },
  ] as const;

  const isManualSource = (s: string) => s !== "social_media";

  const sourceCounts = {
    manual: incidents.filter((i) => isManualSource(i.source)).length,
    social: incidents.filter((i) => i.source === "social_media").length,
  };

  const filtered = incidents.filter(
    (i) =>
      (sourceFilter === "all" ||
        (sourceFilter === "manual" ? isManualSource(i.source) : i.source === sourceFilter)) &&
      (statusFilter === "all" || i.status === statusFilter),
  );

  const hasFilters = sourceFilter !== "all" || statusFilter !== "all";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of active incidents and risk posture</p>
      </div>

      {/* Stats — clickable status filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const active = statusFilter === stat.key;
          return (
            <button
              key={stat.key}
              onClick={() => setStatusFilter(active ? "all" : stat.key)}
              className={`text-left rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 ${
                active ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </button>
          );
        })}
      </div>

      {/* Source filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">Source:</span>
        {([
          { key: "all", label: `All (${incidents.length})` },
          { key: "social_media", label: `Social Intel (${sourceCounts.social})`, icon: Radio },
          { key: "manual", label: `Manual (${sourceCounts.manual})`, icon: Hand },
        ] as const).map((opt) => {
          const active = sourceFilter === opt.key;
          const Icon = "icon" in opt ? opt.icon : null;
          return (
            <button
              key={opt.key}
              onClick={() => setSourceFilter(opt.key as typeof sourceFilter)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {opt.label}
            </button>
          );
        })}
        {hasFilters && (
          <button
            onClick={() => { setSourceFilter("all"); setStatusFilter("all"); }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Incidents table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Incidents {hasFilters && <span className="text-muted-foreground font-normal">· {filtered.length} of {incidents.length}</span>}
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No incidents yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((incident) => {
              const meta = SOURCE_META[incident.source] ?? SOURCE_META.manual;
              const SourceIcon = meta.icon;
              return (
                <Link
                  key={incident.id}
                  to={`/incidents/${incident.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground w-20 shrink-0 truncate">
                    {incident.id.slice(0, 8)}
                  </span>
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{incident.title}</span>
                  <Badge variant="outline" className={`gap-1 text-[10px] shrink-0 ${meta.className}`}>
                    <SourceIcon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                  <RiskBadge level={incident.risk as any} />
                  <StatusBadge status={incident.status as any} />
                  <span className="text-xs text-muted-foreground w-24 text-right shrink-0 truncate">
                    {incident.assignee ?? incident.airline_name ?? "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
