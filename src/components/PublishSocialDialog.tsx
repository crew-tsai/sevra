import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, ExternalLink, Info, Loader2, Send } from "lucide-react";
import { socialNetworkKey, socialNetworkLabel, socialNetworkUrl } from "@/lib/distribution";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMessages } from "@/i18n";
import { distributionMessages } from "@/i18n/messages/distribution";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: {
    id: string;
    asset_type: string;
    title: string;
    content: string;
    incident_id: string;
  } | null;
};

export function PublishSocialDialog({ open, onOpenChange, asset }: Props) {
  const [connected, setConnected] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const [marking, setMarking] = useState(false);
  const t = useMessages(distributionMessages);

  const networkKey = asset ? socialNetworkKey(asset.asset_type) : null;

  useEffect(() => {
    if (!open || !networkKey) {
      setConnected(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("social_connections")
        .select("status")
        .eq("network", networkKey)
        .maybeSingle();
      if (!cancelled) setConnected(data?.status === "connected");
    })();
    return () => {
      cancelled = true;
    };
  }, [open, networkKey]);

  if (!asset) return null;

  const network = socialNetworkLabel(asset.asset_type);
  const url = socialNetworkUrl(asset.asset_type, asset.content);
  const incidentRef = `INC-${asset.incident_id.slice(0, 8).toUpperCase()}`;
  const canPublishDirectly = !!networkKey && connected;

  /**
   * Record a post the person made themselves.
   *
   * Instagram and TikTok accept no API post, so the text is copied and the
   * person publishes it by hand. Sevra cannot observe that, and pretending
   * the copy was a publication would put a lie in the one table that exists
   * to be believed. So it is recorded only when they say they did it, and
   * recorded as their word rather than as a confirmed send.
   */
  const markPublished = async () => {
    if (!asset) return;
    setMarking(true);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("communication_sends").insert({
      asset_id: asset.id,
      incident_id: asset.incident_id,
      asset_title: asset.title,
      asset_type: asset.asset_type,
      channel: networkKey ?? asset.asset_type,
      method: "manual",
      sent_by: user.user?.id ?? null,
    });
    setMarking(false);
    if (error) {
      // A duplicate means it is already on the record, which is the state the
      // person wanted anyway.
      if (error.code === "23505") {
        toast.success(t.alreadyRecorded);
        onOpenChange(false);
        return;
      }
      return toast.error(error.message);
    }
    toast.success(t.markedPublished(network));
    onOpenChange(false);
  };

  const handleCopyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(asset.content);
      toast.success(t.copiedOpening(network));
      window.open(url, "_blank", "noopener,noreferrer");
      setHandedOff(true);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(asset.content);
    toast.success(t.copied);
  };

  const handlePublishNow = async () => {
    if (!networkKey) return;
    setPublishing(true);
    const { data, error } = await supabase.functions.invoke("social-publish", {
      // The asset travels with the post so the send can be recorded against
      // it. Without this the product could say what it had drafted and never
      // what it had said.
      body: {
        network: networkKey,
        content: asset.content,
        asset_id: asset.id,
        incident_id: asset.incident_id,
        asset_title: asset.title,
        asset_type: asset.asset_type,
      },
    });
    setPublishing(false);
    if (error || !data?.success) {
      toast.error(t.publishFailed(network), { description: data?.error ?? error?.message });
      return;
    }
    toast.success(t.published(network), {
      description: data.url,
      action: { label: t.view, onClick: () => window.open(data.url, "_blank", "noopener,noreferrer") },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            {t.publishTo(network)}
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">{asset.title}</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {incidentRef}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
            {asset.content}
          </div>

          {canPublishDirectly ? (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <Send className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div>{t.connectedNote(network)}</div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
              <div>
                {t.copyNote(network)}
                {networkKey ? (
                  <span className="block mt-1 text-[11px]">
                    {t.connectNote(network)}
                  </span>
                ) : (
                  <span className="block mt-1 text-[11px]">
                    {t.comingSoon(network)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4" /> {t.justCopy}
          </Button>
          {canPublishDirectly ? (
            <Button onClick={handlePublishNow} disabled={publishing}>
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t.publishNow}
            </Button>
          ) : handedOff ? (
            // Offered only after the text was actually handed over, so the
            // record reflects something that plausibly happened.
            <Button onClick={() => void markPublished()} disabled={marking}>
              {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t.markPublished}
            </Button>
          ) : (
            <Button onClick={handleCopyAndOpen}>
              <ExternalLink className="h-4 w-4" /> {t.copyAndOpen(network)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
