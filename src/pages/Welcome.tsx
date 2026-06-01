import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";
import { RiskBadge } from "@/components/RiskBadge";
import {
  Radio,
  LayoutDashboard,
  Plus,
  BarChart3,
  Settings,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { RiskLevel } from "@/lib/mock-data";

type UrgentIncident = {
  id: string;
  title: string;
  risk: string;
  status: string;
  crisis_level: number | null;
  risk_score: number;
  updated_at: string;
};

const paths = [
  {
    title: "SEVRA · Social Intel",
    description: "Monitor signals and triage mentions in real time.",
    to: "/sevra",
    icon: Radio,
    accent: "text-sky-500 bg-sky-500/10 ring-sky-500/20",
  },
  {
    title: "Dashboard",
    description: "Full picture across incidents and channels.",
    to: "/dashboard",
    icon: LayoutDashboard,
    accent: "text-violet-500 bg-violet-500/10 ring-violet-500/20",
  },
  {
    title: "Manual Incident",
    description: "Log an incident detected outside automation.",
    to: "/incidents/new",
    icon: Plus,
    accent: "text-rose-500 bg-rose-500/10 ring-rose-500/20",
  },
  {
    title: "Reports",
    description: "Performance, trends and post‑mortems.",
    to: "/reports",
    icon: BarChart3,
    accent: "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20",
  },
  {
    title: "Admin",
    description: "Team, brand and platform settings.",
    to: "/admin",
    icon: Settings,
    accent: "text-amber-500 bg-amber-500/10 ring-amber-500/20",
  },
];

const RISK_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export default function Welcome() {
  const [urgent, setUrgent] = useState<UrgentIncident[]>([]);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      setName(email.split("@")[0] ?? "");
    });
    supabase
      .from("incidents")
      .select("id,title,risk,status,crisis_level,risk_score,updated_at")
      .in("status", ["active", "monitoring"])
      .order("crisis_level", { ascending: false })
      .order("risk_score", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const rows = (data ?? []) as UrgentIncident[];
        const sorted = rows
          .sort((a, b) => {
            const c = (b.crisis_level ?? 0) - (a.crisis_level ?? 0);
            if (c !== 0) return c;
            const r = (RISK_RANK[b.risk] ?? 0) - (RISK_RANK[a.risk] ?? 0);
            if (r !== 0) return r;
            return (b.risk_score ?? 0) - (a.risk_score ?? 0);
          })
          .slice(0, 3);
        setUrgent(sorted);
      });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Where would you like to start?
        </h1>
      </header>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Urgent · top 3
          </h2>
        </div>

        {urgent.length === 0 ? (
          <Card className="p-3 text-xs text-muted-foreground">
            Nothing urgent right now. You're all clear.
          </Card>
        ) : (
          <div className="grid gap-2">
            {urgent.map((i) => (
              <Link key={i.id} to={`/incidents/${i.id}`} className="group">
                <Card className="px-3 py-2.5 flex items-center gap-3 hover:bg-accent/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <CrisisLevelBadge level={i.crisis_level} compact />
                      <RiskBadge level={(i.risk as RiskLevel) ?? "medium"} />
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {i.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1 break-words">{i.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Updated {formatDistanceToNow(new Date(i.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Choose your path
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => (
            <Link key={p.to} to={p.to} className="group">
              <Card className="p-3 h-full hover:bg-accent/40 transition-colors flex items-start gap-3">
                <div className={`h-9 w-9 rounded-md ring-1 flex items-center justify-center shrink-0 ${p.accent}`}>
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold truncate">{p.title}</h3>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{p.description}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
