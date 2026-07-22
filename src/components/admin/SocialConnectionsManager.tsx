import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Twitter, Instagram, Facebook, Music2, Loader2, Link2, Unlink } from "lucide-react";

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

const NETWORK_META: Record<Network, { label: string; icon: typeof Twitter }> = {
  x: { label: "X (Twitter)", icon: Twitter },
  instagram: { label: "Instagram", icon: Instagram },
  tiktok: { label: "TikTok", icon: Music2 },
  facebook: { label: "Facebook", icon: Facebook },
};

const NETWORK_ORDER: Network[] = ["x", "instagram", "tiktok", "facebook"];

export default function SocialConnectionsManager() {
  const [connections, setConnections] = useState<Record<string, SocialConnection>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Network | null>(null);

  useEffect(() => {
    void loadConnections();
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
            connections managed by admins — not personal staff accounts. Publishing directly
            through these connections is coming in a later update; for now this establishes
            the account link itself.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {NETWORK_ORDER.map((network) => {
          const meta = NETWORK_META[network];
          const Icon = meta.icon;
          const conn = connections[network];
          const isConnected = conn?.status === "connected";
          const isPending = pending === network;

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
                    disabled={isPending}
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
