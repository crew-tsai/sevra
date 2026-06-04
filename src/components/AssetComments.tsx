import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquareText, Send, Trash2, Lock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type Comment = {
  id: string;
  asset_id: string;
  author_id: string;
  author_email: string | null;
  body: string;
  created_at: string;
};

const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .nonempty({ message: "Comment cannot be empty" })
    .max(2000, { message: "Comment must be under 2000 characters" }),
});

export function AssetComments({
  assetId,
  isAdmin,
  canApprove,
  onApprove,
  onReject,
}: {
  assetId: string;
  isAdmin: boolean;
  canApprove?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("incident_asset_comments")
      .select("*")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setComments((data ?? []) as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`asset_comments_${assetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incident_asset_comments", filter: `asset_id=eq.${assetId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const submit = async () => {
    const parsed = commentSchema.safeParse({ body });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSubmitting(false);
      return toast.error("You must be signed in");
    }
    const { error } = await supabase.from("incident_asset_comments").insert({
      asset_id: assetId,
      author_id: userData.user.id,
      author_email: userData.user.email ?? null,
      body: parsed.data.body,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setBody("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("incident_asset_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="mt-4 rounded-md border border-accent/20 bg-accent/[0.04] p-3 space-y-3 border-l-4 border-l-accent/40">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <MessageSquareText className="h-3.5 w-3.5" />
        Admin comments
        <span className="text-muted-foreground/60 normal-case font-normal tracking-normal">
          ({comments.length})
        </span>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">No comments yet.</div>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-background p-2.5 text-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-foreground truncate">
                  {c.author_email ?? "Admin"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground hover:text-risk-critical"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {isAdmin ? (
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment for the team…"
            className="min-h-[70px] text-sm"
            maxLength={2000}
          />
          <div className="flex justify-end items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={submit} disabled={submitting || !body.trim()}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Post comment
            </Button>
            {canApprove && onReject && (
              <Button
                size="sm"
                variant="outline"
                className="text-risk-critical hover:text-risk-critical hover:bg-risk-critical-bg"
                onClick={onReject}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            )}
            {canApprove && onApprove && (
              <Button size="sm" onClick={onApprove}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          Only admins can post comments.
        </div>
      )}
    </div>
  );
}
