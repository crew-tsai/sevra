import { useParams, Link } from "react-router-dom";
import { incidents, timelineEvents } from "@/lib/mock-data";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Brain, Clock, AlertTriangle, Zap, CheckCircle } from "lucide-react";

const typeIcons = {
  alert: AlertTriangle,
  action: Zap,
  update: Clock,
  resolution: CheckCircle,
};

export default function IncidentDetail() {
  const { id } = useParams();
  const incident = incidents.find((i) => i.id === id);

  if (!incident) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Incident not found.</p>
        <Link to="/dashboard" className="text-primary text-sm mt-2 inline-block">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{incident.id}</span>
              <RiskBadge level={incident.risk} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-xl font-semibold text-foreground">{incident.title}</h1>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Assigned to <span className="text-foreground font-medium">{incident.assignee}</span></p>
            <p className="mt-0.5">Risk Score: <span className="text-foreground font-bold">{incident.riskScore}/100</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{incident.description}</p>
          </div>

          {/* AI Analysis */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">AI Analysis</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Impact Assessment:</span> This incident has high potential for regulatory, financial, and reputational impact. GDPR Article 33 requires notification to supervisory authority within 72 hours of breach discovery.</p>
              <p><span className="font-medium text-foreground">Similar Precedents:</span> Based on analysis of 847 similar incidents, the median resolution time is 14 days. Organizations that engaged forensics within 24 hours reduced total cost by 38%.</p>
              <p><span className="font-medium text-foreground">Recommended Priority Actions:</span> (1) Complete forensic scoping within 12 hours, (2) Prepare regulatory notification draft, (3) Engage external counsel, (4) Begin affected user identification.</p>
            </div>
          </div>

          {/* Risk Score Visual */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Risk Score Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: "Regulatory Exposure", value: 95 },
                { label: "Financial Impact", value: 82 },
                { label: "Reputational Risk", value: 88 },
                { label: "Operational Disruption", value: 45 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-accent">
                    <div
                      className={`h-full rounded-full ${item.value > 80 ? "bg-risk-critical" : item.value > 60 ? "bg-risk-high" : item.value > 40 ? "bg-risk-medium" : "bg-risk-low"}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Timeline</h2>
            <div className="space-y-4">
              {timelineEvents.map((event, idx) => {
                const Icon = typeIcons[event.type];
                return (
                  <div key={event.id} className="relative pl-6">
                    {idx < timelineEvents.length - 1 && (
                      <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                    )}
                    <div className="absolute left-0 top-0.5">
                      <Icon className="h-[18px] w-[18px] text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
