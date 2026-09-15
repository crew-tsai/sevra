import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, History, LifeBuoy } from "lucide-react";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";

type AuditEntry = {
  id: string;
  incident_id: string;
  incident_title: string | null;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
};

type SupportAccess = {
  id: string;
  user_email: string | null;
  accessed_at: string;
};

const FIELD_LABEL: Record<string, string> = {
  crisis_level: "Crisis level",
  risk_score: "Risk score",
  risk: "Risk label",
};

function ValueCell({ field, value }: { field: string; value: string | null }) {
  if (value === null || value === "") return <span className="text-muted-foreground">—</span>;
  if (field === "crisis_level") {
    const n = Number(value);
    if (!Number.isNaN(n)) return <CrisisLevelBadge level={n} compact />;
  }
  if (field === "risk") {
    return <Badge variant="outline" className="capitalize">{value}</Badge>;
  }
  return <span className="font-mono text-sm">{value}</span>;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [supportAccess, setSupportAccess] = useState<SupportAccess[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("support_access_log")
        .select("id, user_email, accessed_at")
        .order("accessed_at", { ascending: false })
        .limit(100);
      setSupportAccess((data ?? []) as SupportAccess[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("incident_audit_log")
        .select("id, incident_id, incident_title, changed_by, changed_at, field_name, old_value, new_value")
        .order("changed_at", { ascending: false })
        .limit(500);
      if (fieldFilter !== "all") q = q.eq("field_name", fieldFilter);
      const { data } = await q;
      setEntries((data ?? []) as AuditEntry[]);
      setLoading(false);
    })();
  }, [fieldFilter]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <History className="h-6 w-6" /> Audit log
          </h1>
          <p className="text-sm text-muted-foreground">
            Changes to incident crisis levels and risk scores, with previous and new values.
          </p>
        </div>
        <Select value={fieldFilter} onValueChange={setFieldFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fields</SelectItem>
            <SelectItem value="crisis_level">Crisis level</SelectItem>
            <SelectItem value="risk_score">Risk score</SelectItem>
            <SelectItem value="risk">Risk label</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4 text-muted-foreground" /> Sevra support access
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            When Sevra staff opened this workspace. Support accounts are listed under
            Admin → Team &amp; roles, and these entries cannot be edited or deleted.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {supportAccess.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-muted-foreground">
              No Sevra staff have opened this workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Who</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportAccess.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(s.accessed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {s.user_email ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${entries.length} change${entries.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!loading && entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No changes recorded yet. Future updates to crisis level or risk score will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>New</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(e.changed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <Link
                          to={`/incidents/${e.incident_id}`}
                          className="line-clamp-2 text-sm font-medium hover:underline"
                        >
                          {e.incident_title ?? e.incident_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{FIELD_LABEL[e.field_name] ?? e.field_name}</TableCell>
                      <TableCell><ValueCell field={e.field_name} value={e.old_value} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <ValueCell field={e.field_name} value={e.new_value} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
