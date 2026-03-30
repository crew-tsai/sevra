import { incidents } from "@/lib/mock-data";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { AlertTriangle, Activity, Shield, CheckCircle } from "lucide-react";

const stats = [
  { label: "Active Incidents", value: incidents.filter((i) => i.status === "active").length, icon: AlertTriangle, color: "text-risk-critical" },
  { label: "Monitoring", value: incidents.filter((i) => i.status === "monitoring").length, icon: Activity, color: "text-risk-high" },
  { label: "Contained", value: incidents.filter((i) => i.status === "contained").length, icon: Shield, color: "text-risk-medium" },
  { label: "Resolved", value: incidents.filter((i) => i.status === "resolved").length, icon: CheckCircle, color: "text-risk-low" },
];

export default function Dashboard() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of active incidents and risk posture</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Incidents table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">All Incidents</h2>
        </div>
        <div className="divide-y divide-border">
          {incidents.map((incident) => (
            <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{incident.id}</span>
              <span className="text-sm text-foreground flex-1 min-w-0 truncate">{incident.title}</span>
              <RiskBadge level={incident.risk} />
              <StatusBadge status={incident.status} />
              <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{incident.assignee}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
