import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LifeBuoy, Send, HelpCircle, Paperclip } from "lucide-react";
import { useDateLocale, useMessages } from "@/i18n";
import { helpMessages } from "@/i18n/messages/help";
import { formatDistanceToNow } from "date-fns";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  category: string;
  created_at: string;
  created_email: string | null;
  delivered: boolean;
  answered_at: string | null;
  state: "waiting" | "answered" | "closed";
  last_activity_at: string;
};

// What the team wrote after the first message. Sevra's side lives in
// support_replies; the two are merged by time to read as one conversation.
type Message = {
  id: string;
  ticket_id: string;
  body: string;
  created_email: string | null;
  delivered: boolean;
  created_at: string;
};

type Attachment = {
  id: string;
  ticket_id: string;
  message_id: string | null;
  path: string;
  filename: string;
  size_bytes: number | null;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// What Sevra answered, pushed back into this workspace by the control plane.
// Nothing in the browser can write one, so a reply shown here was written by
// Sevra.
type Reply = {
  id: string;
  ticket_id: string;
  body: string;
  from_name: string;
  sent_at: string;
};

/** Files on a message, opened through a short-lived signed URL. */
function FileList({ items, onOpen }: { items: Attachment[]; onOpen: (a: Attachment) => void }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((a) => (
        <button
          key={a.id}
          onClick={() => onOpen(a)}
          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="h-3 w-3" />
          {a.filename}
        </button>
      ))}
    </div>
  );
}

export default function Help() {
  const t = useMessages(helpMessages);
  const locale = useDateLocale();
  const location = useLocation();

  const [category, setCategory] = useState("question");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [threadDraft, setThreadDraft] = useState("");
  const [threadFiles, setThreadFiles] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busyThread, setBusyThread] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Where they came from. Someone who clicks Help from Approvals is almost
  // always asking about Approvals, and this saves the first reply being a
  // question.
  const [from] = useState<string>(() => (location.state as { from?: string })?.from ?? "");

  useEffect(() => {
    void loadTickets();
  }, []);

  async function loadTickets() {
    const [{ data }, { data: answers }, { data: ours }, { data: files }] = await Promise.all([
      supabase
        .from("support_tickets")
        .select("id, subject, message, category, created_at, created_email, delivered, answered_at, state, last_activity_at")
        // By when anything last happened, not when it was opened: a thread
        // that moved this morning is the live one.
        .order("last_activity_at", { ascending: false })
        .limit(20),
      supabase
        .from("support_replies")
        .select("id, ticket_id, body, from_name, sent_at")
        .order("sent_at"),
      supabase
        .from("support_messages")
        .select("id, ticket_id, body, created_email, delivered, created_at")
        .order("created_at"),
      supabase
        .from("support_attachments")
        .select("id, ticket_id, message_id, path, filename, size_bytes")
        .order("created_at"),
    ]);
    setTickets((data ?? []) as Ticket[]);
    setReplies((answers ?? []) as Reply[]);
    setMessages((ours ?? []) as Message[]);
    setAttachments((files ?? []) as Attachment[]);
  }

  /**
   * Put the chosen files in the bucket and hand back their metadata.
   *
   * Uploaded straight from the browser under the person's own session, so a
   * 10 MB screenshot never travels through an edge function that has 30
   * seconds to live.
   */
  async function uploadFiles(list: File[], ticketId: string) {
    const out: Array<{ path: string; filename: string; mime_type: string; size_bytes: number }> = [];
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(t.tooLarge(file.name));
        continue;
      }
      const path = `${ticketId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("support-attachments").upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      out.push({ path, filename: file.name, mime_type: file.type, size_bytes: file.size });
    }
    return out;
  }

  async function openFile(a: Attachment) {
    const { data, error } = await supabase.storage
      .from("support-attachments")
      .createSignedUrl(a.path, 120);
    if (error || !data) return toast.error(error?.message ?? t.failed);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  /** A further message on a thread that already exists. */
  async function sendFollowUp(ticketId: string) {
    if (!threadDraft.trim() && !threadFiles.length) return;
    setBusyThread(true);
    const uploaded = threadFiles.length ? await uploadFiles(threadFiles, ticketId) : [];
    const { data, error } = await supabase.functions.invoke("support-ticket", {
      body: { ticket_id: ticketId, message: threadDraft, attachments: uploaded },
    });
    setBusyThread(false);
    if (error || !data?.success) return toast.error(error?.message ?? data?.error ?? t.failed);
    if (data.delivered) toast.success(t.sent, { description: t.sentDetail });
    else toast.warning(t.notDelivered, { description: t.notDeliveredDetail });
    setThreadDraft("");
    setThreadFiles([]);
    setOpenThread(null);
    void loadTickets();
  }

  async function send() {
    if (!subject.trim() || !message.trim()) return toast.error(t.required);
    setSending(true);
    // The ticket id is not known until it exists, so new-ticket files go under
    // a folder of their own and are attached by the function.
    const folder = crypto.randomUUID();
    const uploaded = files.length ? await uploadFiles(files, folder) : [];
    const { data, error } = await supabase.functions.invoke("support-ticket", {
      body: {
        subject,
        message,
        category,
        page: from || document.referrer || "/help",
        attachments: uploaded,
      },
    });
    setSending(false);

    if (error || !data?.success) {
      return toast.error(error?.message ?? data?.error ?? t.failed);
    }
    // Recorded either way; the difference is whether it reached Sevra, and
    // saying "sent" when it has not is how a client waits three days for an
    // answer nobody knows they are owed.
    if (data.delivered) {
      toast.success(t.sent, { description: t.sentDetail });
    } else {
      toast.warning(t.notDelivered, { description: t.notDeliveredDetail, duration: 10000 });
    }
    setSubject("");
    setMessage("");
    setFiles([]);
    void loadTickets();
  }

  async function retry(id: string) {
    setRetrying(id);
    const { data, error } = await supabase.functions.invoke("support-ticket", {
      body: { retry_id: id },
    });
    setRetrying(null);
    if (error || !data?.success) return toast.error(error?.message ?? t.failed);
    if (data.delivered) toast.success(t.sent, { description: t.sentDetail });
    else toast.warning(t.notDelivered, { description: t.notDeliveredDetail });
    void loadTickets();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LifeBuoy className="h-5 w-5 text-primary" /> {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-muted-foreground" /> {t.faqTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {t.faq.map((item, i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.contactTitle}</CardTitle>
          <CardDescription>{t.contactIntro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <Label>{t.category}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(t.categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.subject}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t.subjectPlaceholder}
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.message}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              rows={6}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5" /> {t.attach}
            </Label>
            <Input
              type="file"
              multiple
              className="cursor-pointer"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            <p className="text-xs text-muted-foreground">{t.attachHint}</p>
            {files.length > 0 && (
              <ul className="text-xs text-muted-foreground">
                {files.map((f) => <li key={f.name}>{f.name}</li>)}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void send()} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? t.sending : t.send}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.historyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.historyEmpty}</p>
          ) : (
            <ul className="divide-y">
              {tickets.map((ticket) => {
                const answers = replies.filter((r) => r.ticket_id === ticket.id);
                const ours = messages.filter((m) => m.ticket_id === ticket.id);
                const ticketFiles = attachments.filter((a) => a.ticket_id === ticket.id);
                // Both sides, in the order they happened.
                const thread = [
                  ...answers.map((r) => ({
                    kind: "reply" as const, id: r.id, body: r.body, at: r.sent_at, who: r.from_name,
                  })),
                  ...ours.map((m) => ({
                    kind: "message" as const, id: m.id, body: m.body, at: m.created_at,
                    who: m.created_email ?? t.you,
                  })),
                ].sort((a, b) => a.at.localeCompare(b.at));
                return (
                  <li key={ticket.id} className="space-y-2 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.categories[ticket.category] ?? ticket.category}
                          {" · "}
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale })}
                          {ticket.created_email ? ` · ${t.by(ticket.created_email)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={
                            ticket.state === "closed" ? "outline"
                              : ticket.state === "answered" ? "default"
                              : ticket.delivered ? "secondary" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {ticket.state === "closed" ? t.closed
                            : ticket.state === "answered" ? t.answered
                            : ticket.delivered ? t.waiting : t.pending}
                        </Badge>
                        {!ticket.delivered && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={retrying === ticket.id}
                            onClick={() => void retry(ticket.id)}
                          >
                            {retrying === ticket.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              t.retry
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* One conversation: the question, whatever the team added
                        afterwards, and Sevra's replies, in the order they
                        happened. An answer on its own is half a thread. */}
                    {(answers.length > 0 || ours.length > 0) && (
                      <>
                        <div className="rounded-md border bg-muted/40 p-3">
                          <p className="mb-1 text-xs font-medium">{t.you}</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.message}</p>
                          <FileList items={ticketFiles.filter((a) => !a.message_id)} onOpen={openFile} />
                        </div>

                        {thread.map((item) =>
                          item.kind === "reply" ? (
                            <div key={item.id} className="rounded-md border border-primary/20 bg-primary/5 p-3">
                              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                                <LifeBuoy className="h-3.5 w-3.5" />
                                {item.who === "Sevra support" ? t.supportName : item.who}
                                <span className="font-normal text-muted-foreground">
                                  {formatDistanceToNow(new Date(item.at), { addSuffix: true, locale })}
                                </span>
                              </p>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
                            </div>
                          ) : (
                            <div key={item.id} className="rounded-md border bg-muted/40 p-3">
                              <p className="mb-1 text-xs font-medium">
                                {item.who}{" "}
                                <span className="font-normal text-muted-foreground">
                                  {formatDistanceToNow(new Date(item.at), { addSuffix: true, locale })}
                                </span>
                              </p>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
                              <FileList items={ticketFiles.filter((a) => a.message_id === item.id)} onOpen={openFile} />
                            </div>
                          ),
                        )}
                      </>
                    )}

                    {answers.length === 0 && ours.length === 0 && ticket.delivered && (
                      <p className="text-xs text-muted-foreground">{t.awaitingReply}</p>
                    )}

                    {/* Always available while the thread is open. A first reply
                        is not the end of a problem, and a client with nowhere
                        to say so says it by email instead. */}
                    {ticket.state !== "closed" && (
                      openThread === ticket.id ? (
                        <div className="space-y-2 rounded-md border p-3">
                          <Textarea
                            value={threadDraft}
                            onChange={(e) => setThreadDraft(e.target.value)}
                            placeholder={t.replyPlaceholder}
                            rows={3}
                            maxLength={5000}
                            autoFocus
                          />
                          <Input
                            type="file"
                            multiple
                            className="cursor-pointer"
                            onChange={(e) => setThreadFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setOpenThread(null); setThreadFiles([]); }}>
                              {t.remove}
                            </Button>
                            <Button size="sm" disabled={busyThread} onClick={() => void sendFollowUp(ticket.id)}>
                              {busyThread ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-3.5 w-3.5" />
                              )}
                              {busyThread ? t.sending : t.sendReply}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setOpenThread(ticket.id); setThreadDraft(""); }}
                        >
                          {t.reply}
                        </Button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
