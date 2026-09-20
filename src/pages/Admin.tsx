import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, ShieldAlert, Building2, Users, Palette, Mail, Network, Share2 } from "lucide-react";
import { z } from "zod";
import EmailListsManager from "@/components/admin/EmailListsManager";
import ResponsibilityMatrixEditor from "@/components/admin/ResponsibilityMatrixEditor";
import SocialConnectionsManager from "@/components/admin/SocialConnectionsManager";
import SendingDomainManager from "@/components/admin/SendingDomainManager";
import { MonitoringFocus } from "@/components/admin/MonitoringFocus";
import { groupLabel, INDUSTRY_GROUPS, industryLabel } from "@/lib/industries";
import { useLang, useMessages } from "@/i18n";
import { adminMessages } from "@/i18n/messages/admin";
import { commonMessages } from "@/i18n/messages/common";

// Stored values; their names on screen are adminMessages.roles.
const ROLES = ["admin", "coordinador", "manager", "ejecutivo", "soporte"] as const;

type Role = typeof ROLES[number];

// Keep in sync with ROLES above — the invite is validated against this list
// before it reaches the database, so a value missing here is rejected client
// side even though the column accepts it.
const inviteSchema = (invalidEmail: string) => z.object({
  email: z.string().trim().email(invalidEmail).max(255),
  full_name: z.string().trim().max(120).optional(),
  role: z.enum(["admin", "coordinador", "manager", "ejecutivo", "soporte"]),
});

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const t = useMessages(adminMessages);
  const common = useMessages(commonMessages);
  const { lang } = useLang();

  // Settings
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [monitorCountries, setMonitorCountries] = useState<string[]>([]);
  const [monitorLanguages, setMonitorLanguages] = useState<string[]>([]);
  const [monitorExcludeTerms, setMonitorExcludeTerms] = useState<string[]>([]);
  // null = Sevra drafts nothing until someone asks for it.
  const [autoPackageLevel, setAutoPackageLevel] = useState<number | null>(3);
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

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "company";

  useEffect(() => { void init(); }, []);

  // Land back on the Social connections tab (and surface the result) after
  // an OAuth redirect from social-oauth-callback.
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      toast({ title: t.connected(connected) });
    } else if (error) {
      toast({ title: t.connectionFailed, description: error, variant: "destructive" });
    }
    if (connected || error) {
      const next = new URLSearchParams(searchParams);
      next.delete("connected");
      next.delete("error");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    // getUser() is a network call that returns {user: null} on failure rather
    // than throwing. Treating that as "not signed in" shows a real admin the
    // Restricted access page and skips loading their settings -- which is what
    // a transient blip looks like from the user's side: their workspace
    // suddenly forgot who they are and lost their data.
    //
    // getSession() reads local storage, so it distinguishes "no session" from
    // "couldn't reach the server just now".
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoading(false);
        toast({
          title: t.cantVerify,
          description: t.cantVerifyDetail(userErr?.message ?? null),
          variant: "destructive",
        });
        return;
      }
      setLoading(false);
      return;
    }

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
    // A swallowed read error here is indistinguishable from "there is nothing
    // saved": the fields render empty and the user concludes the workspace
    // threw their input away. Say which it is.
    const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
    if (error) {
      toast({
        title: t.cantLoadSettings,
        description: t.cantLoadSettingsDetail(error.message),
        variant: "destructive",
      });
      return;
    }
    if (data) {
      setSettingsId(data.id);
      setCompanyName(data.company_name ?? "");
      setIndustry(data.industry ?? "");
      setXHandle(data.x_handle ?? "");
      setMonitorCountries(data.monitor_countries ?? []);
      setMonitorLanguages(data.monitor_languages ?? []);
      setMonitorExcludeTerms(data.monitor_exclude_terms ?? []);
      setAutoPackageLevel(data.auto_package_level ?? null);
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
    // Must go through the RPC: the "First user can claim admin" INSERT policy
    // was dropped in 20260527111803 and replaced by this SECURITY DEFINER
    // function, so a direct insert into user_roles is always blocked by RLS
    // for a user who isn't already an admin. The RPC also checks the caller
    // against the admin email designated for this deployment.
    const { data: status, error } = await supabase.rpc("claim_first_admin");
    if (error) return toast({ title: t.error, description: error.message, variant: "destructive" });

    if (status === "claimed") {
      toast({ title: t.youAreAdmin, description: t.canConfigure });
      await init();
      return;
    }

    // adminExists is computed from a count query that RLS filters to the
    // caller's own roles, so the claim button can appear even when the claim
    // cannot succeed. Explain which case this is.
    const reason = t.reasons[status as string] ?? t.couldNotClaim;
    await init();
    toast({ ...reason, variant: "destructive" });
  }

  async function saveSettings() {
    setSavingSettings(true);
    const payload = {
      company_name: companyName.trim() || null,
      industry: industry || null,
      x_handle: xHandle.trim().replace(/^@/, "") || null,
      monitor_countries: monitorCountries,
      monitor_languages: monitorLanguages,
      monitor_exclude_terms: monitorExcludeTerms,
      auto_package_level: autoPackageLevel,
      logo_url: logoUrl,
      brand_primary: brandPrimary,
      brand_secondary: brandSecondary,
      comms_manual_url: manualUrl,
      comms_manual_name: manualName,
    };
    // .select() is what makes this honest. An UPDATE blocked by RLS affects
    // zero rows and returns no error, so without checking what came back we
    // would report "Saved" over a write that never happened -- and then
    // loadSettings() would quietly restore the old values, which reads to the
    // user as their input being deleted.
    const { data, error } = settingsId
      ? await supabase.from("company_settings").update(payload).eq("id", settingsId).select()
      : await supabase.from("company_settings").insert(payload).select();
    setSavingSettings(false);
    if (error) return toast({ title: t.error, description: error.message, variant: "destructive" });
    if (!data || data.length === 0) {
      return toast({
        title: t.notSaved,
        description: t.noPermission,
        variant: "destructive",
      });
    }
    toast({ title: t.saved, description: t.settingsUpdated });
    await loadSettings();
  }

  async function uploadLogo(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast({ title: t.fileTooLarge, description: t.max5, variant: "destructive" });
    const path = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) return toast({ title: t.logoUploadError, description: error.message, variant: "destructive" });
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    toast({ title: t.logoUploaded, description: t.rememberToSave });
  }

  async function uploadManual(file: File) {
    if (file.size > 20 * 1024 * 1024) return toast({ title: t.fileTooLarge, description: t.max20, variant: "destructive" });
    const path = `manual-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("manuals").upload(path, file, { upsert: true });
    if (error) return toast({ title: t.manualUploadError, description: error.message, variant: "destructive" });
    const { data } = await supabase.storage.from("manuals").createSignedUrl(path, 60 * 60 * 24 * 365);
    setManualUrl(data?.signedUrl ?? null);
    setManualName(file.name);
    toast({ title: t.manualUploaded, description: t.rememberToSave });
  }

  async function inviteMember() {
    const parsed = inviteSchema(t.invalidEmail).safeParse({ email: inviteEmail, full_name: inviteName || undefined, role: inviteRole });
    if (!parsed.success) return toast({ title: t.invalidData, description: parsed.error.issues[0].message, variant: "destructive" });
    setInviting(true);
    const { error } = await supabase.from("team_members").insert({
      email: parsed.data.email,
      full_name: parsed.data.full_name ?? null,
      role: parsed.data.role,
    });
    setInviting(false);
    if (error) return toast({ title: t.error, description: error.message, variant: "destructive" });
    setInviteEmail(""); setInviteName(""); setInviteRole("ejecutivo");
    toast({ title: t.invited, description: t.memberAdded });
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
            <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /><CardTitle>{t.restricted}</CardTitle></div>
            <CardDescription>{t.restrictedDetailBefore} <strong>{t.restrictedDetailRole}</strong>{lang === "es" ? "" : " "}{t.restrictedDetailAfter}</CardDescription>
          </CardHeader>
          {!adminExists && (
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.noAdminYet}</p>
              <Button onClick={claimAdmin}>{t.claimAdmin}</Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </header>

      <Tabs defaultValue={initialTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="company"><Building2 className="h-4 w-4 mr-2" />{t.tabs.company}</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-4 w-4 mr-2" />{t.tabs.branding}</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-2" />{t.tabs.team}</TabsTrigger>
          <TabsTrigger value="lists"><Mail className="h-4 w-4 mr-2" />{t.tabs.lists}</TabsTrigger>
          <TabsTrigger value="raci"><Network className="h-4 w-4 mr-2" />{t.tabs.raci}</TabsTrigger>
          <TabsTrigger value="social"><Share2 className="h-4 w-4 mr-2" />{t.tabs.social}</TabsTrigger>
        </TabsList>

        {/* COMPANY */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.companyInfo}</CardTitle>
              <CardDescription>{t.companyInfoIntro}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.companyName}</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label>{t.industry}</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue placeholder={t.selectIndustry} /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_GROUPS.map((g) => (
                        <SelectGroup key={g.group}>
                          <SelectLabel>{groupLabel(g.group, lang)}</SelectLabel>
                          {g.values.map((i) => <SelectItem key={i} value={i}>{industryLabel(i, lang)}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t.industryHint}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.xHandle}</Label>
                <Input
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  placeholder={t.xHandlePlaceholder}
                  maxLength={40}
                />
                <p className="text-xs text-muted-foreground">
                  {t.xHandleHint}
                </p>
              </div>

              <MonitoringFocus
                companyName={companyName}
                xHandle={xHandle}
                countries={monitorCountries}
                languages={monitorLanguages}
                excludeTerms={monitorExcludeTerms}
                onCountries={setMonitorCountries}
                onLanguages={setMonitorLanguages}
                onExcludeTerms={setMonitorExcludeTerms}
              />

              <div className="space-y-2">
                <Label>{t.manual}</Label>
                <div className="flex items-center gap-3">
                  <input ref={manualInput} type="file" accept=".pdf,.doc,.docx,.md,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadManual(f); e.currentTarget.value = ""; }} />
                  <Button type="button" variant="outline" onClick={() => manualInput.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />{t.uploadManual}
                  </Button>
                  {manualName && (
                    <a href={manualUrl ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-2 hover:underline">
                      <FileText className="h-4 w-4" />{manualName}
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t.manualHint}</p>
              </div>

              <div className="space-y-2">
                <Label>{t.autoPackage}</Label>
                <Select
                  value={autoPackageLevel === null ? "off" : String(autoPackageLevel)}
                  onValueChange={(v) => setAutoPackageLevel(v === "off" ? null : Number(v))}
                >
                  <SelectTrigger className="sm:w-80"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">{t.autoPackageOff}</SelectItem>
                    {[1, 2, 3, 4].map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        {t.autoPackageLevel(common.level[level])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t.autoPackageHint}</p>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t.save}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRANDING */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.logoAndColors}</CardTitle>
              <CardDescription>{t.logoAndColorsIntro}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t.logo}</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {logoUrl ? <img src={logoUrl} alt={t.logo} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">{t.noLogo}</span>}
                  </div>
                  <input ref={logoInput} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.currentTarget.value = ""; }} />
                  <Button type="button" variant="outline" onClick={() => logoInput.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />{t.uploadLogo}
                  </Button>
                  {logoUrl && <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)}>{t.remove}</Button>}
                </div>
                <p className="text-xs text-muted-foreground">{t.logoHint}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.primaryColor}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="h-10 w-14 rounded border bg-transparent cursor-pointer" />
                    <Input value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} maxLength={9} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.secondaryColor}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="h-10 w-14 rounded border bg-transparent cursor-pointer" />
                    <Input value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} maxLength={9} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.preview}</p>
                <div className="rounded-md p-4 flex items-center gap-3" style={{ background: brandSecondary, color: "#fff" }}>
                  {logoUrl && <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />}
                  <span className="font-semibold">{companyName || t.yourCompany}</span>
                  <span className="ml-auto px-3 py-1 rounded text-xs font-medium" style={{ background: brandPrimary }}>CTA</span>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t.save}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.inviteMember}</CardTitle>
              <CardDescription>{t.inviteIntro}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end">
                <div className="space-y-2">
                  <Label>{t.email}</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t.emailPlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label>{t.name}</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder={t.namePlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label>{t.role}</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{t.roles[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={inviteMember} disabled={inviting}>
                  {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t.add}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.teamMembers}</CardTitle>
              <CardDescription>{t.memberCount(team.length)}</CardDescription>
            </CardHeader>
            <CardContent>
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t.noMembers}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.email}</TableHead>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.role}</TableHead>
                      <TableHead>{t.status}</TableHead>
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
                              {ROLES.map((r) => <SelectItem key={r} value={r}>{t.roles[r]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {m.user_id
                            ? <Badge variant="secondary">{t.active}</Badge>
                            : <Badge variant="outline">{t.pending}</Badge>}
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

        {/* EMAIL LISTS */}
        <TabsContent value="lists" className="space-y-4">
          <SendingDomainManager />
          <EmailListsManager />
        </TabsContent>

        {/* RESPONSIBILITY MATRIX */}
        <TabsContent value="raci" className="space-y-4">
          <ResponsibilityMatrixEditor />
        </TabsContent>

        {/* SOCIAL CONNECTIONS */}
        <TabsContent value="social" className="space-y-4">
          <SocialConnectionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
