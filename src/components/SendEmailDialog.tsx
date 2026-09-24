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
  RaciLevel,
  EmailList,
  fetchEmailLists,
  fetchResponsibilityMatrix,
  isValidEmail,
  listDisplay,
  recommendedLists,
  type ResponsibilityMatrix,
} from "@/lib/distribution";
import { Loader2, Mail, Plus, Send, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useLang, useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";
import { distributionMessages } from "@/i18n/messages/distribution";

const LEVEL_BADGE: Record<RaciLevel, string> = {
  responsible: "bg-primary/15 text-primary border-primary/30",
  accountable: "bg-destructive/10 text-destructive border-destructive/30",
  consulted: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  informed: "bg-muted text-muted-foreground border-border",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: {
    id: string;
    incident_id: string;
    asset_type: string;
    title: string;
    content: string;
    language?: string | null;
  } | null;
};

export function SendEmailDialog({ open, onOpenChange, asset }: Props) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState(false);
  // Lists and the matrix are workspace data now, so they are read when the
  // dialog opens rather than from this browser's storage.
  const [lists, setLists] = useState<EmailList[]>([]);
  const [matrix, setMatrix] = useState<ResponsibilityMatrix>({});
  const t = useMessages(distributionMessages);
  const common = useMessages(commonMessages);
  const { lang } = useLang();

  const typeLabel = asset ? common.assetType[asset.asset_type] ?? asset.asset_type : "";

  const recommended = useMemo(
    () => (asset ? recommendedLists(matrix, lists, asset.asset_type) : []),
    [asset, lists, matrix],
  );

  useEffect(() => {
    if (!open || !asset) return;
    void (async () => {
      try {
        const [l, m] = await Promise.all([fetchEmailLists(), fetchResponsibilityMatrix()]);
        setLists(l);
        setMatrix(m);
        // Start with whoever the matrix holds responsible for this kind of
        // communication — that is what the matrix is for.
        const base = new Set<string>();
        for (const { list, level } of recommendedLists(m, l, asset.asset_type)) {
          if (level === "responsible") list.emails.forEach((e) => base.add(e));
        }
        setRecipients(Array.from(base));
      } catch (e) {
        toast.error((e as Error).message);
      }
      setNewEmail("");
    })();
  }, [open, asset]);

  if (!asset) return null;

  const incidentRef = `INC-${asset.incident_id.slice(0, 8).toUpperCase()}`;
  const packageRef = `PKG-${asset.incident_id.slice(0, 8).toUpperCase()}`;

  const addListEmails = (list: EmailList) => {
    if (!list.emails.length) {
      toast.info(t.noContacts(listDisplay(list, lang).name));
      return;
    }
    setRecipients((prev) => {
      const merged = new Set(prev);
      list.emails.forEach((e) => merged.add(e));
      return Array.from(merged);
    });
    toast.success(t.addedFrom(list.emails.length, listDisplay(list, lang).name));
  };

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      toast.error(t.invalidEmail);
      return;
    }
    if (recipients.includes(trimmed)) {
      toast.info(t.alreadyListed);
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
      toast.error(t.addRecipient);
      return;
    }
    setSending(true);

    let success = 0;
    let failed = 0;
    for (const email of recipients) {
      const { data, error } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "crisis-communication",
            recipientEmail: email,
            // Lets the server refuse to send for a drill. The dialog also
            // refuses, but the guard that matters is the one nearest the
            // provider.
            assetId: asset.id,
            idempotencyKey: `asset-${asset.id}-${email}`,
            templateData: {
              assetTitle: asset.title,
              assetType: asset.asset_type,
              assetContent: asset.content,
              incidentRef,
              packageRef,
              // The email around the communication matches the language it
              // was written in, not whoever happens to be sending it.
              lang: asset.language ?? lang,
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

    // One line in the ledger for the whole send, not one per recipient:
    // email_send_log already holds per-address delivery, and what belongs
    // here is "the press release went to 14 people at 14:02". Recorded only
    // when at least one actually went.
    if (success) {
      const { data: user } = await supabase.auth.getUser();
      const { error: logErr } = await supabase.from("communication_sends").insert({
        asset_id: asset.id,
        incident_id: asset.incident_id,
        asset_title: asset.title,
        asset_type: asset.asset_type,
        channel: "email",
        method: "api",
        recipients: success,
        destination: recipients.slice(0, 3).join(", ") + (recipients.length > 3 ? ` +${recipients.length - 3}` : ""),
        sent_by: user.user?.id ?? null,
      });
      // Never allowed to turn a successful send into an error on screen: the
      // email went, and the person needs to know that above all.
      if (logErr && logErr.code !== "23505") console.error("Could not record the send", logErr.message);
    }

    setSending(false);
    if (success && !failed) {
      toast.success(t.sentTo(success));
      onOpenChange(false);
    } else if (success && failed) {
      toast.warning(t.partial(success, failed));
    } else {
      toast.error(t.sendFailed);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t.sendType(typeLabel)}
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
          {recommended.length > 0 && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t.recommendedFor(typeLabel)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recommended.map(({ list, level }) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => addListEmails(list)}
                    className={`group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:scale-[1.02] transition ${LEVEL_BADGE[level]}`}
                    title={t.addFromList(list.emails.length, listDisplay(list, lang).name)}
                  >
                    <Users className="h-3 w-3" />
                    <span className="font-medium">{listDisplay(list, lang).name}</span>
                    <span className="opacity-70">({list.emails.length})</span>
                    <span className="ml-1 text-[9px] uppercase tracking-wider opacity-80">
                      {t.raci[level]}
                    </span>
                    <Plus className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t.basedOnMatrix}
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs">{t.recipients}</Label>
            <div className="flex flex-wrap gap-1.5 mt-2 min-h-[36px] p-2 rounded-md border bg-muted/30">
              {recipients.length === 0 ? (
                <span className="text-xs text-muted-foreground self-center">
                  {t.noRecipients}
                </span>
              ) : (
                recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
                      aria-label={t.remove(email)}
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
              placeholder={t.emailPlaceholder}
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
              <Plus className="h-4 w-4" /> {t.add}
            </Button>
          </div>

          {/* Defaults come from the responsibility matrix in Admin, which the
              whole team shares — not from a per-browser "save as default". */}
          <p className="text-xs text-muted-foreground">{t.defaultsFromMatrix}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {common.cancel}
          </Button>
          <Button onClick={handleSend} disabled={sending || !recipients.length}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t.sendTo(recipients.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
