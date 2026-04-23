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
import { Copy, ExternalLink, Info } from "lucide-react";
import { socialNetworkLabel, socialNetworkUrl } from "@/lib/distribution";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: {
    asset_type: string;
    title: string;
    content: string;
    incident_id: string;
  } | null;
};

export function PublishSocialDialog({ open, onOpenChange, asset }: Props) {
  if (!asset) return null;

  const network = socialNetworkLabel(asset.asset_type);
  const url = socialNetworkUrl(asset.asset_type, asset.content);
  const incidentRef = `INC-${asset.incident_id.slice(0, 8).toUpperCase()}`;

  const handleCopyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(asset.content);
      toast.success(`Copied — opening ${network}`);
      window.open(url, "_blank", "noopener,noreferrer");
      onOpenChange(false);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(asset.content);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Publish to {network}
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

          <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
            <div>
              We'll copy the content and open {network} in a new tab so you can
              publish it from your account.
              <span className="block mt-1 text-[11px]">
                Buffer/Hootsuite integration for direct publishing is coming soon.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4" /> Just copy
          </Button>
          <Button onClick={handleCopyAndOpen}>
            <ExternalLink className="h-4 w-4" /> Copy & open {network}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
