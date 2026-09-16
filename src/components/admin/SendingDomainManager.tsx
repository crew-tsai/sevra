import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, RefreshCw, CheckCircle2, Globe } from "lucide-react";

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
        title: action === "add" ? "Couldn't set up that domain" : "Couldn't check the domain",
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
    toast({ title: "Domain added", description: "Add the DNS records below, then check again." });
  };

  const check = async () => {
    setChecking(true);
    const data = await call("status");
    setChecking(false);
    if (!data) return;
    if (data.status === "verified") {
      setStatus("verified");
      toast({ title: "Domain verified", description: `Email now sends from ${saved}.` });
    } else {
      setRecords(data.records ?? records);
      toast({
        title: "Not verified yet",
        description: "DNS changes can take a while to propagate. Try again in a few minutes.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Sending domain</CardTitle>
          {status === "verified" && (
            <Badge className="ml-1 text-[10px]">Verified</Badge>
          )}
          {status === "pending" && (
            <Badge variant="outline" className="ml-1 text-[10px]">Pending DNS</Badge>
          )}
        </div>
        <CardDescription>
          Emails currently go out from Sevra's domain. Point your own domain here and press
          releases and statements will arrive from your company instead — which matters most
          with journalists and regulators, who are more likely to trust and open mail from a
          sender they recognize.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-2">
            <Label>Subdomain to send from</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="notify.yourcompany.com"
              disabled={status === "verified"}
            />
            <p className="text-xs text-muted-foreground">
              Use a subdomain like <code>notify.</code> or <code>mail.</code> — not your main
              domain. Your main domain carries your company's own email, and this must not
              touch it.
            </p>
          </div>
          {status !== "verified" && (
            <Button onClick={start} disabled={busy || !domain.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saved ? "Update" : "Set up"}
            </Button>
          )}
        </div>

        {status === "verified" && (
          <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/30 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>
              Verified. Email sends from <strong>noreply@{saved}</strong>.
            </span>
          </div>
        )}

        {status === "pending" && records.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Add these records at your DNS provider</p>
              <Button variant="outline" size="sm" onClick={check} disabled={checking}>
                {checking ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                Check again
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Value</th>
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
                          onClick={() => {
                            void navigator.clipboard.writeText(r.value ?? "");
                            toast({ title: "Value copied" });
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
              DNS can take anywhere from a few minutes to a few hours. Until it verifies, email
              keeps going out from Sevra's domain, so nothing stops working while you wait.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
