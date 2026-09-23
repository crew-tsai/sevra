import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, FileCheck, Loader2, RefreshCw } from "lucide-react";
import { useLang, useMessages } from "@/i18n";
import { incidentDetailMessages } from "@/i18n/messages/incident-detail";

type Review = {
  content: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
};

/**
 * The after-action report.
 *
 * Offered once the incident is resolved, because that is when it is worth
 * writing and when the record has stopped moving. Regenerable on purpose: a
 * late correction, or a mention that arrives the next morning, changes what
 * the review should say, and a review that cannot be rewritten stops being
 * true.
 */
export function IncidentReview({ incidentId, resolved }: { incidentId: string; resolved: boolean }) {
  const t = useMessages(incidentDetailMessages).review;
  const { lang } = useLang();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  async function load() {
    const { data } = await supabase
      .from("incident_reviews")
      .select("content, generated_by, created_at, updated_at")
      .eq("incident_id", incidentId)
      .maybeSingle();
    setReview((data as Review | null) ?? null);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("incident-review", {
      body: { incident_id: incidentId, lang },
    });
    setGenerating(false);
    if (error || !data?.success) {
      return toast.error(t.failed, { description: data?.error ?? error?.message });
    }
    if (data.generated_by === "facts") toast.warning(t.withoutAi);
    else toast.success(t.ready);
    await load();
  }

  // Not offered while the incident is still running: a post-mortem of
  // something still happening is a distraction from the something.
  if (!resolved && !review) return null;
  if (loading) return null;

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            {t.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t.intro}</p>
        </div>
        <div className="flex items-center gap-2">
          {review && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(review.content);
                toast.success(t.copied);
              }}
            >
              <Copy className="h-3.5 w-3.5" /> {t.copy}
            </Button>
          )}
          <Button variant={review ? "outline" : "default"} size="sm" disabled={generating} onClick={() => void generate()}>
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {review ? t.regenerate : t.generate}
          </Button>
        </div>
      </div>

      {review ? (
        <>
          {review.generated_by === "facts" && (
            <Badge variant="outline" className="border-risk-medium/50 text-[10px] text-risk-medium">
              {t.factsOnly}
            </Badge>
          )}
          <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm">
            {review.content}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{t.empty}</p>
      )}
    </Card>
  );
}
