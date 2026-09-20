import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useLang, useMessages } from "@/i18n";
import { distributionMessages } from "@/i18n/messages/distribution";
import {
  createEmailList,
  deleteEmailList,
  EmailList,
  ensureEmailLists,
  isValidEmail,
  setEmailListAddresses,
} from "@/lib/distribution";
import { listDisplay } from "@/lib/distribution";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, X, Users } from "lucide-react";

export default function EmailListsManager() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      let admin = false;
      if (data.user?.id) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        admin = (roles ?? []).some((r) => r.role === "admin");
      }
      try {
        // The lists live in the workspace now; a browser that still has the
        // old local ones hands them over here, once.
        setLists(await ensureEmailLists(admin));
      } catch (e) {
        toast({ title: (e as Error).message, variant: "destructive" });
      }
    })();
  }, []);

  const t = useMessages(distributionMessages);
  const { lang } = useLang();

  /** Write the addresses of one list, and say so if the workspace refused. */
  async function persistAddresses(listId: string, emails: string[]) {
    const before = lists;
    setLists(lists.map((l) => (l.id === listId ? { ...l, emails } : l)));
    try {
      await setEmailListAddresses(listId, emails);
    } catch (e) {
      setLists(before);
      const message = (e as Error).message === "not-permitted" ? t.adminOnly : (e as Error).message;
      toast({ title: message, variant: "destructive" });
    }
  }

  async function addList() {
    const name = newName.trim();
    if (!name) return toast({ title: t.nameRequired, variant: "destructive" });
    try {
      const created = await createEmailList(name, newDesc.trim());
      setLists([...lists, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewDesc("");
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  }

  async function deleteList(id: string) {
    const before = lists;
    setLists(lists.filter((l) => l.id !== id));
    try {
      await deleteEmailList(id);
    } catch (e) {
      setLists(before);
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  }

  function addEmail(listId: string) {
    const raw = (inputs[listId] ?? "").trim().toLowerCase();
    if (!raw) return;
    if (!isValidEmail(raw)) return toast({ title: t.invalidEmail, variant: "destructive" });
    const list = lists.find((l) => l.id === listId);
    if (!list || list.emails.includes(raw)) return;
    void persistAddresses(listId, [...list.emails, raw]);
    setInputs((s) => ({ ...s, [listId]: "" }));
  }

  function removeEmail(listId: string, email: string) {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    void persistAddresses(listId, list.emails.filter((e) => e !== email));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.createList}</CardTitle>
          <CardDescription>
            {t.createListIntro}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label>{t.listName}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.listNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t.descriptionPlaceholder}
              />
            </div>
            <Button onClick={() => void addList()}>
              <Plus className="h-4 w-4 mr-2" /> {t.createListButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {lists.map((list) => (
          <Card key={list.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold truncate">
                      {listDisplay(list, lang).name}
                    </span>
                  </div>
                  {list.description && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      {listDisplay(list, lang).description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => void deleteList(list.id)}
                  aria-label={t.deleteList(listDisplay(list, lang).name)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-md border bg-muted/30">
                {list.emails.length === 0 ? (
                  <span className="text-xs text-muted-foreground self-center">
                    {t.noContactsYet}
                  </span>
                ) : (
                  list.emails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1 pr-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(list.id, email)}
                        className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
                        aria-label={t.remove(email)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={inputs[list.id] ?? ""}
                  onChange={(e) => setInputs((s) => ({ ...s, [list.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail(list.id);
                    }
                  }}
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => addEmail(list.id)} aria-label={t.add}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t.contacts(list.emails.length)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
