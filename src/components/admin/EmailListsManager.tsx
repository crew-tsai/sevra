import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  EmailList,
  isValidEmail,
  loadEmailLists,
  saveEmailLists,
} from "@/lib/distribution";
import { Plus, Trash2, X, Users } from "lucide-react";

function uid() {
  return `lst_${Math.random().toString(36).slice(2, 9)}`;
}

export default function EmailListsManager() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setLists(loadEmailLists());
  }, []);

  function persist(next: EmailList[]) {
    setLists(next);
    saveEmailLists(next);
  }

  function addList() {
    const name = newName.trim();
    if (!name) return toast({ title: "Name required", variant: "destructive" });
    persist([...lists, { id: uid(), name, description: newDesc.trim(), emails: [] }]);
    setNewName("");
    setNewDesc("");
  }

  function deleteList(id: string) {
    persist(lists.filter((l) => l.id !== id));
  }

  function addEmail(listId: string) {
    const raw = (inputs[listId] ?? "").trim().toLowerCase();
    if (!raw) return;
    if (!isValidEmail(raw)) return toast({ title: "Invalid email", variant: "destructive" });
    persist(
      lists.map((l) =>
        l.id === listId && !l.emails.includes(raw)
          ? { ...l, emails: [...l.emails, raw] }
          : l,
      ),
    );
    setInputs((s) => ({ ...s, [listId]: "" }));
  }

  function removeEmail(listId: string, email: string) {
    persist(
      lists.map((l) =>
        l.id === listId ? { ...l, emails: l.emails.filter((e) => e !== email) } : l,
      ),
    );
  }

  function renameList(id: string, name: string) {
    persist(lists.map((l) => (l.id === id ? { ...l, name } : l)));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create a new list</CardTitle>
          <CardDescription>
            Group contacts by audience — Executive Team, Press, Operations, Regulators…
            Lists are used to build the responsibility matrix and to recommend recipients
            when deploying a crisis email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label>List name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Crisis Committee"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this group used for?"
              />
            </div>
            <Button onClick={addList}>
              <Plus className="h-4 w-4 mr-2" /> Create list
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
                    <Input
                      value={list.name}
                      onChange={(e) => renameList(list.id, e.target.value)}
                      className="h-7 text-sm font-semibold border-0 px-1 focus-visible:ring-1"
                    />
                  </div>
                  {list.description && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      {list.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => deleteList(list.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-md border bg-muted/30">
                {list.emails.length === 0 ? (
                  <span className="text-xs text-muted-foreground self-center">
                    No contacts yet
                  </span>
                ) : (
                  list.emails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1 pr-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(list.id, email)}
                        className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
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
                  placeholder="add@email.com"
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
                <Button variant="outline" size="sm" onClick={() => addEmail(list.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {list.emails.length} contact{list.emails.length === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
