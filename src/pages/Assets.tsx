import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { FileText, Users, MessageSquare, Megaphone, HelpCircle, ExternalLink, ChevronDown, AlertCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TimeRangeFilter, DEFAULT_TIME_RANGE, isInRange, type TimeRange } from "@/components/TimeRangeFilter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n";
import { useTranslations } from "@/i18n/useTranslations";
import { commonMessages } from "@/i18n/messages/common";
import { assetsMessages } from "@/i18n/messages/assets";


const EXTERNAL_ASSET_TYPES = new Set(["press_release", "post_x", "post_instagram", "post_facebook", "tiktok_script"]);

const shareOnWhatsApp = (title: string, content: string) => {
  const text = `${title}\n\n${content}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
};

type Asset = {
  id: string;
  incident_id: string;
  asset_type: string;
  channel: string | null;
  title: string;
  content: string;
  approval_status: string;
  created_at: string;
  language: string | null;
};

type Incident = {
  id: string;
  title: string;
  risk: string;
  status: string;
  created_at: string;
  translations: unknown;
};

const TYPE_ICON: Record<string, typeof FileText> = {
  press_release: Megaphone,
  holding_statement: Megaphone,
  post_x: MessageSquare,
  post_instagram: MessageSquare,
  post_facebook: MessageSquare,
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
  const [incidents, setIncidents] = useState<Record<string, Incident>>({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const t = useMessages(assetsMessages);
  const common = useMessages(commonMessages);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: assetsData, error: aErr }, { data: incData, error: iErr }] = await Promise.all([
        supabase
          .from("incident_assets")
          .select("id, incident_id, asset_type, channel, title, content, approval_status, created_at, language")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("incidents")
          .select("id, title, risk, status, created_at, translations")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (aErr) toast.error(aErr.message);
      if (iErr) toast.error(iErr.message);
      setAllAssets((assetsData ?? []) as Asset[]);
      const map: Record<string, Incident> = {};
      (incData ?? []).forEach((i: Incident) => { map[i.id] = i; });
      setIncidents(map);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("incident_assets_assets_page")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_assets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    allAssets.forEach((a) => set.add(a.asset_type));
    return Array.from(set).sort();
  }, [allAssets]);

  const grouped = useMemo(() => {
    const filtered = allAssets.filter(
      (a) => isInRange(a.created_at, timeRange) && (typeFilter === "all" || a.asset_type === typeFilter)
    );
    const groups = new Map<string, Asset[]>();
    for (const a of filtered) {
      if (!groups.has(a.incident_id)) groups.set(a.incident_id, []);
      groups.get(a.incident_id)!.push(a);
    }
    // Sort group keys by incident created_at desc (fallback to most recent asset)
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ta = incidents[a]?.created_at ?? groups.get(a)![0].created_at;
      const tb = incidents[b]?.created_at ?? groups.get(b)![0].created_at;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
  }, [allAssets, incidents, timeRange, typeFilter]);

  const tr = useTranslations("incidents", grouped.map(([id]) => incidents[id]));
  const typeName = (k: string) => common.assetType[k] ?? k.replace(/_/g, " ");

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (openIds.size === grouped.length) setOpenIds(new Set());
    else setOpenIds(new Set(grouped.map(([id]) => id)));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.intro}</p>
        </div>
        <div className="flex items-center gap-2">
          {grouped.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5"
            >
              {openIds.size === grouped.length ? t.collapseAll : t.expandAll}
            </button>
          )}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder={t.allTypes} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTypes}</SelectItem>
              {availableTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeName(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">{common.loading}</div>
      ) : !grouped.length ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">{t.empty}</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([incidentId, assets]) => {
            const incident = incidents[incidentId];
            const isOpen = openIds.has(incidentId);
            const counts = assets.reduce(
              (acc, a) => {
                acc[a.approval_status] = (acc[a.approval_status] ?? 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            );
            return (
              <Collapsible key={incidentId} open={isOpen} onOpenChange={() => toggle(incidentId)}>
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30 transition-colors text-left">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {incident ? tr.text(incident, "title") : t.unknownIncident}
                            </h3>
                            {incident?.risk && <RiskBadge level={incident.risk as never} />}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="font-mono">PKG-{incidentId.slice(0, 8).toUpperCase()}</span>
                            <span>•</span>
                            <span>{t.assetCount(assets.length)}</span>
                            {counts.pending && <><span>•</span><span className="text-risk-medium">{t.pendingCount(counts.pending)}</span></>}
                            {counts.approved && <><span>•</span><span className="text-risk-low">{t.approvedCount(counts.approved)}</span></>}
                            {counts.rejected && <><span>•</span><span className="text-risk-critical">{t.rejectedCount(counts.rejected)}</span></>}
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/incidents/${incidentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
                      >
                        {t.incident} <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border divide-y divide-border">
                      {assets.map((a) => {
                        const Icon = TYPE_ICON[a.asset_type] ?? FileText;
                        return (
                          <div key={a.id} className="p-4">
                            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-xs font-medium text-muted-foreground">{typeName(a.asset_type)}</span>
                                {a.language && (
                                  <span title={common.writtenIn[a.language]} className="rounded border border-border px-1 text-[10px] font-medium uppercase text-muted-foreground">
                                    {a.language}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[a.approval_status] ?? "bg-muted text-muted-foreground")}>
                                  {common.approval[a.approval_status] ?? a.approval_status}
                                </span>
                                <Link
                                  to={`/approvals?incident=${a.incident_id}`}
                                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                                >
                                  {t.open} <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                            <h4 className="text-sm font-semibold text-foreground mb-1">{a.title}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">{a.content}</p>
                            {EXTERNAL_ASSET_TYPES.has(a.asset_type) && a.approval_status === "approved" && (
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => shareOnWhatsApp(a.title, a.content)}
                                >
                                  <MessageCircle className="h-3.5 w-3.5" /> {t.shareWhatsApp}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
