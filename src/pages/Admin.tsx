import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, ShieldAlert, Building2, Users, Palette, Mail, Network } from "lucide-react";
import { z } from "zod";
import EmailListsManager from "@/components/admin/EmailListsManager";
import ResponsibilityMatrixEditor from "@/components/admin/ResponsibilityMatrixEditor";

const INDUSTRIES = [
  "Aviation", "Hospitality", "Retail", "Banking & Finance", "Healthcare",
  "Energy", "Technology", "Telecommunications", "Education", "Government", "Other",
];

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "coordinador", label: "Coordinator" },
  { value: "manager", label: "Manager" },
  { value: "ejecutivo", label: "Executive" },
] as const;

type Role = typeof ROLES[number]["value"];

const inviteSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  full_name: z.string().trim().max(120).optional(),
  role: z.enum(["admin", "coordinador", "manager", "ejecutivo"]),
});

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [adminExists, setAdminExists] = useState(true);

  // Settings
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandPrimary, setBrandPrimary] = useState("#3B82F6");
  const [brandSecondary, setBrandSecondary] = useState("#0F172A");
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [manualName, setManualName] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Team
  const [team, setTeam] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("ejecutivo");
  const [inviting, setInviting] = useState(false);

  const logoInput = useRef<HTMLInputElement>(null);
  const manualInput = useRef<HTMLInputElement>(null);

  useEffect(() => { void init(); }, []);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const admin = roles?.some((r: any) => r.role === "admin") ?? false;
    setIsAdmin(admin);

    // Check if any admin exists (for bootstrap)
    const { count } = await supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    setAdminExists((count ?? 0) > 0);

    await Promise.all([loadSettings(), loadTeam()]);
    setLoading(false);
  }

  async function loadSettings() {
    const { data } = await supabase.from("company_settings").select("*").maybeSingle();
    if (data) {
      setSettingsId(data.id);
      setCompanyName(data.company_name ?? "");
      setIndustry(data.industry ?? "");
      setLogoUrl(data.logo_url ?? null);
      setBrandPrimary(data.brand_primary ?? "#3B82F6");
      setBrandSecondary(data.brand_secondary ?? "#0F172A");
      setManualUrl(data.comms_manual_url ?? null);
      setManualName(data.comms_manual_name ?? null);
    }
  }

  async function loadTeam() {
    const { data } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
    setTeam(data ?? []);
  }

  async function claimAdmin() {
    if (!userId) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "You are admin", description: "You can now configure the system." });
    await init();
  }

  async function saveSettings() {
    setSavingSettings(true);
    const payload = {
      company_name: companyName.trim() || null,
      industry: industry || null,
      logo_url: logoUrl,
      brand_primary: brandPrimary,
      brand_secondary: brandSecondary,
      comms_manual_url: manualUrl,
      comms_manual_name: manualName,
    };
    const { error } = settingsId
      ? await supabase.from("company_settings").update(payload).eq("id", settingsId)
      : await supabase.from("company_settings").insert(payload);
    setSavingSettings(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Saved", description: "Settings updated." });
    await loadSettings();
  }

  async function uploadLogo(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast({ title: "File too large", description: "Max 5 MB", variant: "destructive" });
    const path = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) return toast({ title: "Logo upload error", description: error.message, variant: "destructive" });
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    toast({ title: "Logo uploaded", description: "Remember to save." });
  }

  async function uploadManual(file: File) {
    if (file.size > 20 * 1024 * 1024) return toast({ title: "File too large", description: "Max 20 MB", variant: "destructive" });
    const path = `manual-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("manuals").upload(path, file, { upsert: true });
    if (error) return toast({ title: "Manual upload error", description: error.message, variant: "destructive" });
    const { data } = await supabase.storage.from("manuals").createSignedUrl(path, 60 * 60 * 24 * 365);
    setManualUrl(data?.signedUrl ?? null);
    setManualName(file.name);
    toast({ title: "Manual uploaded", description: "Remember to save." });
  }

  async function inviteMember() {
    const parsed = inviteSchema.safeParse({ email: inviteEmail, full_name: inviteName || undefined, role: inviteRole });
    if (!parsed.success) return toast({ title: "Invalid data", description: parsed.error.issues[0].message, variant: "destructive" });
    setInviting(true);
    const { error } = await supabase.from("team_members").insert({
      email: parsed.data.email,
      full_name: parsed.data.full_name ?? null,
      role: parsed.data.role,
    });
    setInviting(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setInviteEmail(""); setInviteName(""); setInviteRole("ejecutivo");
    toast({ title: "Invited", description: "Member added to the team." });
    await loadTeam();
  }

  async function updateMemberRole(id: string, role: Role) {
    const { error } = await supabase.from("team_members").update({ role }).eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await loadTeam();
  }

  async function removeMember(id: string) {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await loadTeam();
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /><CardTitle>Restricted access</CardTitle></div>
            <CardDescription>The admin panel is only visible to users with the <strong>admin</strong> role.</CardDescription>
          </CardHeader>
          {!adminExists && (
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">No administrator exists yet. You can claim this role to start the setup.</p>
              <Button onClick={claimAdmin}>Claim admin role</Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
        <p className="text-sm text-muted-foreground">Configure your company, team, and branding.</p>
      </header>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company"><Building2 className="h-4 w-4 mr-2" />Company</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-4 w-4 mr-2" />Branding</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-2" />Team & roles</TabsTrigger>
        </TabsList>

        {/* COMPANY */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company information</CardTitle>
              <CardDescription>Industry and communications manual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company name</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Communications manual</Label>
                <div className="flex items-center gap-3">
                  <input ref={manualInput} type="file" accept=".pdf,.doc,.docx,.md,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadManual(f); e.currentTarget.value = ""; }} />
                  <Button type="button" variant="outline" onClick={() => manualInput.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Upload manual
                  </Button>
                  {manualName && (
                    <a href={manualUrl ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-2 hover:underline">
                      <FileText className="h-4 w-4" />{manualName}
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PDF, DOC or text. Max 20 MB.</p>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRANDING */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo and colors</CardTitle>
              <CardDescription>Applied to generated assets (emails, communications, exports).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
                  </div>
                  <input ref={logoInput} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.currentTarget.value = ""; }} />
                  <Button type="button" variant="outline" onClick={() => logoInput.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Upload logo
                  </Button>
                  {logoUrl && <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)}>Remove</Button>}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 5 MB.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="h-10 w-14 rounded border bg-transparent cursor-pointer" />
                    <Input value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} maxLength={9} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="h-10 w-14 rounded border bg-transparent cursor-pointer" />
                    <Input value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} maxLength={9} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
                <div className="rounded-md p-4 flex items-center gap-3" style={{ background: brandSecondary, color: "#fff" }}>
                  {logoUrl && <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />}
                  <span className="font-semibold">{companyName || "Aurora Skylines"}</span>
                  <span className="ml-auto px-3 py-1 rounded text-xs font-medium" style={{ background: brandPrimary }}>CTA</span>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite member</CardTitle>
              <CardDescription>Assign a role before or after they sign up.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@auroraskylines.com" />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Elena Navarro (MAD)" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={inviteMember} disabled={inviting}>
                  {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team members</CardTitle>
              <CardDescription>{team.length} {team.length === 1 ? "member" : "members"}</CardDescription>
            </CardHeader>
            <CardContent>
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No members invited yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.email}</TableCell>
                        <TableCell className="text-muted-foreground">{m.full_name ?? "—"}</TableCell>
                        <TableCell>
                          <Select value={m.role} onValueChange={(v) => updateMemberRole(m.id, v as Role)}>
                            <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {m.user_id
                            ? <Badge variant="secondary">Active</Badge>
                            : <Badge variant="outline">Pending</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
