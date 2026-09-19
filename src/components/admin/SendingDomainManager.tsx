import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, RefreshCw, CheckCircle2, Globe } from "lucide-react";
import { useMessages } from "@/i18n";
import { sendingDomainMessages } from "@/i18n/messages/admin-panels";

type DnsRecord = {
  record?: string;
  name?: string;
  type?: string;
  value?: string;
  ttl?: string;
  status?: string;
};

type Status = "pending" | "verified" | null;

export default function SendingDomainManager() {
  const [domain, setDomain] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const t = useMessages(sendingDomainMessages);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("sending_domain, sending_domain_status, sending_domain_records")
        .maybeSingle();
      if (!data) return;
      setSaved(data.sending_domain ?? null);
      setStatus((data.sending_domain_status as Status) ?? null);
      setRecords((data.sending_domain_records as DnsRecord[]) ?? []);
      if (data.sending_domain) setDomain(data.sending_domain);
    })();
  }, []);

  const call = async (action: "add" | "status") => {
    const { data, error } = await supabase.functions.invoke("email-domain", {
      body: { action, domain: domain.trim().toLowerCase() },
    });
    if (error || !data?.success) {
      toast({
        title: action === "add" ? t.setupFailed : t.checkFailed,
        description: data?.error ?? error?.message,
        variant: "destructive",
      });
      return null;
    }
    return data;
  };

  const start = async () => {
    setBusy(true);
    const data = await call("add");
    setBusy(false);
    if (!data) return;
    setSaved(data.domain);
    setStatus("pending");
    setRecords(data.records ?? []);
    toast({ title: t.added, description: t.addedDetail });
  };

  const check = async () => {
    setChecking(true);
    const data = await call("status");
    setChecking(false);
    if (!data) return;
    if (data.status === "verified") {
      setStatus("verified");
      toast({ title: t.verified, description: t.verifiedDetail(saved ?? "") });
    } else {
      setRecords(data.records ?? records);
      toast({
        title: t.notYet,
        description: t.notYetDetail,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>{t.title}</CardTitle>
          {status === "verified" && (
            <Badge className="ml-1 text-[10px]">{t.verifiedBadge}</Badge>
          )}
          {status === "pending" && (
            <Badge variant="outline" className="ml-1 text-[10px]">{t.pendingBadge}</Badge>
          )}
        </div>
        <CardDescription>
          {t.intro}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-2">
            <Label>{t.subdomain}</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={t.subdomainPlaceholder}
              disabled={status === "verified"}
            />
            <p className="text-xs text-muted-foreground">
              {t.subdomainHintBefore} <code>notify.</code> {t.subdomainHintOr} <code>mail.</code> {t.subdomainHintAfter}
            </p>
          </div>
          {status !== "verified" && (
            <Button onClick={start} disabled={busy || !domain.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saved ? t.update : t.setUp}
            </Button>
          )}
        </div>

        {status === "verified" && (
          <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/30 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>
              {t.verifiedSends} <strong>noreply@{saved}</strong>.
            </span>
          </div>
        )}

        {status === "pending" && records.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t.addRecords}</p>
              <Button variant="outline" size="sm" onClick={check} disabled={checking}>
                {checking ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                {t.checkAgain}
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 font-medium">{t.type}</th>
                    <th className="text-left p-2 font-medium">{t.name}</th>
                    <th className="text-left p-2 font-medium">{t.value}</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{r.type ?? r.record}</td>
                      <td className="p-2 font-mono break-all">{r.name}</td>
                      <td className="p-2 font-mono break-all max-w-[18rem]">{r.value}</td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label={t.copyValue}
                          onClick={() => {
                            void navigator.clipboard.writeText(r.value ?? "");
                            toast({ title: t.valueCopied });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.dnsWait}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
