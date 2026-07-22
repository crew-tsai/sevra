import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  Twitter,
  Instagram,
  Facebook,
  Music2,
  Loader2,
  Link2,
  Unlink,
  KeyRound,
  Copy,
  Pencil,
} from "lucide-react";

type Network = "x" | "instagram" | "tiktok" | "facebook";

type SocialConnection = {
  id: string;
  network: Network;
  status: "connected" | "disconnected" | "error";
  account_label: string | null;
  avatar_url: string | null;
  connected_at: string | null;
  last_error: string | null;
};

type CredentialStatus = {
  configured: boolean;
  client_id: string | null;
  updated_at: string | null;
};

const NETWORK_META: Record<Network, { label: string; icon: typeof Twitter }> = {
  x: { label: "X (Twitter)", icon: Twitter },
  instagram: { label: "Instagram", icon: Instagram },
  tiktok: { label: "TikTok", icon: Music2 },
  facebook: { label: "Facebook", icon: Facebook },
};

const NETWORK_ORDER: Network[] = ["x", "instagram", "tiktok", "facebook"];

const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-oauth-callback`;

function emptyCredentials(): Record<Network, CredentialStatus> {
  const out = {} as Record<Network, CredentialStatus>;
  for (const network of NETWORK_ORDER) out[network] = { configured: false, client_id: null, updated_at: null };
  return out;
}

export default function SocialConnectionsManager() {
  const [connections, setConnections] = useState<Record<string, SocialConnection>>({});
  const [credentials, setCredentials] = useState<Record<Network, CredentialStatus>>(emptyCredentials());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Network | null>(null);
  const [editingCreds, setEditingCreds] = useState<Record<string, boolean>>({});
  const [credForm, setCredForm] = useState<Record<string, { client_id: string; client_secret: string }>>({});
  const [savingCreds, setSavingCreds] = useState<Network | null>(null);

  useEffect(() => {
    void loadConnections();
    void loadCredentials();
  }, []);

  async function loadConnections() {
    setLoading(true);
    const { data, error } = await supabase.from("social_connections").select("*");
    if (error) {
      toast({ title: "Failed to load social connections", description: error.message, variant: "destructive" });
    } else {
      const byNetwork: Record<string, SocialConnection> = {};
      for (const row of data ?? []) {
        if (NETWORK_ORDER.includes(row.network as Network)) {
          byNetwork[row.network] = row as SocialConnection;
        }
      }
      setConnections(byNetwork);
    }
    setLoading(false);
  }

  async function loadCredentials() {
    const { data, error } = await supabase.functions.invoke("social-oauth-credentials", { body: { action: "status" } });
    if (error || !data?.success) {
      toast({ title: "Failed to load developer app status", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    setCredentials({ ...emptyCredentials(), ...data.credentials });
  }

  function credField(network: Network) {
    return credForm[network] ?? { client_id: "", client_secret: "" };
  }

  async function saveCredentials(network: Network) {
    const { client_id, client_secret } = credField(network);
    if (!client_id.trim() || !client_secret.trim()) {
      toast({ title: "Client ID and Client Secret are both required", variant: "destructive" });
      return;
    }
    setSavingCreds(network);
    const { data, error } = await supabase.functions.invoke("social-oauth-credentials", {
      body: { action: "save", network, client_id: client_id.trim(), client_secret: client_secret.trim() },
    });
    if (error || !data?.success) {
      toast({ title: "Couldn't save credentials", description: data?.error ?? error?.message, variant: "destructive" });
    } else {
      toast({ title: `${NETWORK_META[network].label} developer app saved` });
      setEditingCreds((s) => ({ ...s, [network]: false }));
      setCredForm((s) => ({ ...s, [network]: { client_id: "", client_secret: "" } }));
      await loadCredentials();
    }
    setSavingCreds(null);
  }

  async function copyRedirectUri() {
    await navigator.clipboard.writeText(REDIRECT_URI);
    toast({ title: "Redirect URI copied" });
  }

  async function connect(network: Network) {
    setPending(network);
    const { data, error } = await supabase.functions.invoke("social-oauth-start", { body: { network } });
    if (error || !data?.success) {
      toast({
        title: `Couldn't start ${NETWORK_META[network].label} connection`,
        description: data?.error ?? error?.message,
        variant: "destructive",
      });
      setPending(null);
      return;
    }
    window.location.href = data.url;
  }

  async function disconnect(network: Network) {
    setPending(network);
    const { data, error } = await supabase.functions.invoke("social-oauth-disconnect", { body: { network } });
    if (error || !data?.success) {
      toast({
        title: `Couldn't disconnect ${NETWORK_META[network].label}`,
        description: data?.error ?? error?.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `${NETWORK_META[network].label} disconnected` });
      await loadConnections();
    }
    setPending(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Social connections</CardTitle>
          <CardDescription>
            Connect the company's official social accounts. These are shared, company-wide
            connections — not personal staff accounts. Each network requires your own developer
            app (registered by you on that platform's developer site); paste the resulting Client
            ID and Client Secret below, then connect the account. Publishing directly through
            these connections is coming in a later update; for now this establishes the account
            link itself.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {NETWORK_ORDER.map((network) => {
          const meta = NETWORK_META[network];
          const Icon = meta.icon;
          const conn = connections[network];
          const cred = credentials[network];
          const isConnected = conn?.status === "connected";
          const isPending = pending === network;
          const isSavingCreds = savingCreds === network;
          const showCredForm = editingCreds[network] || !cred?.configured;

          return (
            <Card key={network}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium text-sm">{meta.label}</span>
                  </div>
                  <Badge variant={isConnected ? "default" : "outline"} className="text-[10px]">
                    {loading ? "…" : isConnected ? "Connected" : "Not connected"}
                  </Badge>
                </div>

                {/* Developer app credentials */}
                {showCredForm ? (
                  <div className="space-y-2 rounded-md border p-3 bg-muted/20">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <KeyRound className="h-3.5 w-3.5" /> Developer app
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Client ID</Label>
                      <Input
                        value={credField(network).client_id}
                        onChange={(e) =>
                          setCredForm((s) => ({ ...s, [network]: { ...credField(network), client_id: e.target.value } }))
                        }
                        className="h-8 text-xs"
                        placeholder="Client ID"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Client Secret</Label>
                      <Input
                        type="password"
                        value={credField(network).client_secret}
                        onChange={(e) =>
                          setCredForm((s) => ({ ...s, [network]: { ...credField(network), client_secret: e.target.value } }))
                        }
                        className="h-8 text-xs"
                        placeholder="Client Secret"
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p>Register an app on {meta.label}'s developer site with this redirect URI:</p>
                      <div className="flex items-center gap-1">
                        <code className="flex-1 truncate rounded bg-background px-1.5 py-1 border text-[10px]">
                          {REDIRECT_URI}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyRedirectUri}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={isSavingCreds} onClick={() => saveCredentials(network)}>
                        {isSavingCreds && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save
                      </Button>
                      {cred?.configured && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCreds((s) => ({ ...s, [network]: false }));
                            setCredForm((s) => ({ ...s, [network]: { client_id: "", client_secret: "" } }));
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-md border p-2 bg-muted/20">
                    <div className="flex items-center gap-1.5 text-xs min-w-0">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate text-muted-foreground">
                        Developer app configured · {cred?.client_id}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingCreds((s) => ({ ...s, [network]: true }))}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {isConnected && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conn.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(conn.account_label ?? meta.label).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{conn.account_label ?? "Connected account"}</p>
                      {conn.connected_at && (
                        <p className="text-[11px] text-muted-foreground">
                          Connected {new Date(conn.connected_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {conn?.last_error && !isConnected && (
                  <p className="text-[11px] text-destructive">{conn.last_error}</p>
                )}

                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => disconnect(network)}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={isPending || !cred?.configured}
                    onClick={() => connect(network)}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
