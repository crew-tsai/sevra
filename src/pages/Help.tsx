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
import { Loader2, LifeBuoy, Send, HelpCircle } from "lucide-react";
import { useDateLocale, useMessages } from "@/i18n";
import { helpMessages } from "@/i18n/messages/help";
import { formatDistanceToNow } from "date-fns";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  created_at: string;
  created_email: string | null;
  delivered: boolean;
};

export default function Help() {
  const t = useMessages(helpMessages);
  const locale = useDateLocale();
  const location = useLocation();

  const [category, setCategory] = useState("question");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Where they came from. Someone who clicks Help from Approvals is almost
  // always asking about Approvals, and this saves the first reply being a
  // question.
  const [from] = useState<string>(() => (location.state as { from?: string })?.from ?? "");

  useEffect(() => {
    void loadTickets();
  }, []);

  async function loadTickets() {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, category, created_at, created_email, delivered")
      .order("created_at", { ascending: false })
      .limit(20);
    setTickets((data ?? []) as Ticket[]);
  }

  async function send() {
    if (!subject.trim() || !message.trim()) return toast.error(t.required);
    setSending(true);
    const { data, error } = await supabase.functions.invoke("support-ticket", {
      body: { subject, message, category, page: from || document.referrer || "/help" },
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
              {tickets.map((ticket) => (
                <li key={ticket.id} className="flex items-start justify-between gap-3 py-2.5">
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
                    <Badge variant={ticket.delivered ? "secondary" : "outline"} className="text-[10px]">
                      {ticket.delivered ? t.delivered : t.pending}
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
