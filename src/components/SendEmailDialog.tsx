import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  ASSET_TYPE_LABELS,
  getListFor,
  isValidEmail,
  loadDistributionLists,
  saveDistributionLists,
} from "@/lib/distribution";
import { Loader2, Mail, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: {
    id: string;
    incident_id: string;
    asset_type: string;
    title: string;
    content: string;
  } | null;
};

export function SendEmailDialog({ open, onOpenChange, asset }: Props) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [persistToList, setPersistToList] = useState(false);
  const [sending, setSending] = useState(false);

  const typeLabel = useMemo(
    () => (asset ? ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type : ""),
    [asset],
  );

  useEffect(() => {
    if (open && asset) {
      setRecipients(getListFor(asset.asset_type));
      setNewEmail("");
      setPersistToList(false);
    }
  }, [open, asset]);

  if (!asset) return null;

  const incidentRef = `INC-${asset.incident_id.slice(0, 8).toUpperCase()}`;
  const packageRef = `PKG-${asset.incident_id.slice(0, 8).toUpperCase()}`;

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      toast.error("Invalid email address");
      return;
    }
    if (recipients.includes(trimmed)) {
      toast.info("Already in the list");
      return;
    }
    setRecipients((r) => [...r, trimmed]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setRecipients((r) => r.filter((e) => e !== email));
  };

  const handleSend = async () => {
    if (!recipients.length) {
      toast.error("Add at least one recipient");
      return;
    }
    setSending(true);

    if (persistToList) {
      const lists = loadDistributionLists();
      lists[asset.asset_type] = recipients;
      saveDistributionLists(lists);
    }

    let success = 0;
    let failed = 0;
    for (const email of recipients) {
      const { data, error } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "crisis-communication",
            recipientEmail: email,
            idempotencyKey: `asset-${asset.id}-${email}`,
            templateData: {
              assetTitle: asset.title,
              assetType: asset.asset_type,
              assetContent: asset.content,
              incidentRef,
              packageRef,
            },
          },
        },
      );
      if (error || !data?.success) {
        failed++;
      } else {
        success++;
      }
    }

    setSending(false);
    if (success && !failed) {
      toast.success(`Email sent to ${success} recipient${success === 1 ? "" : "s"}`);
      onOpenChange(false);
    } else if (success && failed) {
      toast.warning(`Sent ${success}, failed ${failed}`);
    } else {
      toast.error("Failed to send email. Check recipients and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Send {typeLabel.toLowerCase()}
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">{asset.title}</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono">
              <Badge variant="outline" className="border-primary/40 text-primary">
                {packageRef}
              </Badge>
              <span className="text-muted-foreground">·</span>
              <Badge variant="outline">{incidentRef}</Badge>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Recipients</Label>
            <div className="flex flex-wrap gap-1.5 mt-2 min-h-[36px] p-2 rounded-md border bg-muted/30">
              {recipients.length === 0 ? (
                <span className="text-xs text-muted-foreground self-center">
                  No recipients yet — add emails below
                </span>
              ) : (
                recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="add@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              className="text-sm"
            />
            <Button type="button" variant="outline" onClick={addEmail}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={persistToList}
              onChange={(e) => setPersistToList(e.target.checked)}
              className="rounded border-border"
            />
            Save these recipients as the default list for {typeLabel.toLowerCase()}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !recipients.length}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send to {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
