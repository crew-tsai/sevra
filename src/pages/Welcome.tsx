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
    description: "Monitor social signals and triage mentions in real time.",
    to: "/sevra",
    icon: Radio,
  },
  {
    title: "Dashboard",
    description: "See the full picture across incidents and channels.",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Manual Incident",
    description: "Log a new incident detected outside automated channels.",
    to: "/incidents/new",
    icon: Plus,
  },
  {
    title: "Reports",
    description: "Review performance, trends and post‑mortems.",
    to: "/reports",
    icon: BarChart3,
  },
  {
    title: "Admin",
    description: "Manage team, brand and platform settings.",
    to: "/admin",
    icon: Settings,
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Where would you like to start?
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Jump into the workflow you need. Urgent items waiting on you are listed below.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-risk-high" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Urgent · top 3
          </h2>
        </div>

        {urgent.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Nothing urgent right now. You're all clear.
          </Card>
        ) : (
          <div className="grid gap-3">
            {urgent.map((i) => (
              <Link key={i.id} to={`/incidents/${i.id}`} className="group">
                <Card className="p-4 sm:p-5 flex items-center gap-4 hover:bg-accent/40 transition-colors">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CrisisLevelBadge level={i.crisis_level} compact />
                      <RiskBadge level={(i.risk as RiskLevel) ?? "medium"} />
                      <Badge variant="outline" className="text-xs capitalize">
                        {i.status}
                      </Badge>
                    </div>
                    <p className="font-medium truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Choose your path
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => (
            <Link key={p.to} to={p.to} className="group">
              <Card className="p-5 h-full hover:bg-accent/40 transition-colors flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
