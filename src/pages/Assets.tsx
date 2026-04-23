import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { FileText, Globe, Users, MessageSquare, Megaphone, HelpCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TimeRangeFilter, ALL_TIME, isInRange, type TimeRange } from "@/components/TimeRangeFilter";

type Asset = {
  id: string;
  incident_id: string;
  asset_type: string;
  channel: string | null;
  title: string;
  content: string;
  approval_status: string;
  created_at: string;
};

const TYPE_ICON: Record<string, typeof FileText> = {
  press_release: Megaphone,
  holding_statement: Megaphone,
  post_x: MessageSquare,
  post_instagram: MessageSquare,
  tiktok_script: MessageSquare,
  internal_memo: Users,
  customer_faq: HelpCircle,
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-risk-medium-bg text-risk-medium",
  approved: "bg-risk-low-bg text-risk-low",
  rejected: "bg-risk-critical-bg text-risk-critical",
};

export default function Assets() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(ALL_TIME);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("incident_assets")
        .select("id, incident_id, asset_type, channel, title, content, approval_status, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message);
      setAllAssets((data ?? []) as Asset[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("incident_assets_assets_page")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_assets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const assets = allAssets.filter((a) => isInRange(a.created_at, timeRange));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Generated Statements</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-drafted communications across all incidents</p>
        </div>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : !assets.length ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">No assets in this range.</div>
      ) : (
        <div className="space-y-4">
          {assets.map((a) => {
            const Icon = TYPE_ICON[a.asset_type] ?? FileText;
            return (
              <div key={a.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground capitalize">{a.asset_type.replace(/_/g, " ")}</span>
                    <span className="text-xs font-mono text-muted-foreground/60">PKG-{a.incident_id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[a.approval_status] ?? "bg-muted text-muted-foreground")}>
                      {a.approval_status}
                    </span>
                    <Link
                      to={`/approvals?incident=${a.incident_id}`}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">{a.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
