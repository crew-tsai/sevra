import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ASSET_TYPE_LABELS,
  EMAIL_ASSET_TYPES,
  EmailList,
  RACI_DESCRIPTIONS,
  RACI_LABELS,
  RaciLevel,
  ResponsibilityMatrix,
  loadEmailLists,
  loadResponsibilityMatrix,
  saveResponsibilityMatrix,
} from "@/lib/distribution";
import { Save } from "lucide-react";

const LEVELS: RaciLevel[] = ["responsible", "accountable", "consulted", "informed"];

const LEVEL_COLORS: Record<RaciLevel, string> = {
  responsible: "bg-primary/15 text-primary border-primary/30",
  accountable: "bg-destructive/10 text-destructive border-destructive/30",
  consulted: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  informed: "bg-muted text-muted-foreground border-border",
};

export default function ResponsibilityMatrixEditor() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [matrix, setMatrix] = useState<ResponsibilityMatrix>({});

  useEffect(() => {
    setLists(loadEmailLists());
    setMatrix(loadResponsibilityMatrix());
  }, []);

  function toggle(assetType: string, level: RaciLevel, listId: string) {
    setMatrix((prev) => {
      const current = prev[assetType] ?? {
        responsible: [],
        accountable: [],
        consulted: [],
        informed: [],
      };
      const selected = new Set(current[level]);
      if (selected.has(listId)) selected.delete(listId);
      else selected.add(listId);
      return {
        ...prev,
        [assetType]: { ...current, [level]: Array.from(selected) },
      };
    });
  }

  function save() {
    saveResponsibilityMatrix(matrix);
    toast({ title: "Saved", description: "Responsibility matrix updated." });
  }

  if (lists.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Create at least one email list first to build the matrix.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Responsibility matrix (RACI)</CardTitle>
          <CardDescription>
            For each crisis comms type, mark which lists are
            <strong className="text-foreground"> Responsible</strong>,
            <strong className="text-foreground"> Accountable</strong>,
            <strong className="text-foreground"> Consulted</strong>, and
            <strong className="text-foreground"> Informed</strong>. These choices drive
            the recommended recipients shown when deploying an email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-xs">
            {LEVELS.map((l) => (
              <div key={l} className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-3 w-3 rounded-sm border ${LEVEL_COLORS[l]}`}
                />
                <span className="font-medium">{RACI_LABELS[l]}</span>
                <span className="text-muted-foreground">— {RACI_DESCRIPTIONS[l]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {EMAIL_ASSET_TYPES.map((assetType) => {
          const cell = matrix[assetType] ?? {
            responsible: [],
            accountable: [],
            consulted: [],
            informed: [],
          };
          return (
            <Card key={assetType}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {ASSET_TYPE_LABELS[assetType]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {LEVELS.map((level) => (
                  <div key={level} className="grid sm:grid-cols-[140px_1fr] gap-2 items-start">
                    <Badge
                      variant="outline"
                      className={`justify-center w-fit ${LEVEL_COLORS[level]}`}
                    >
                      {RACI_LABELS[level]}
                    </Badge>
                    <div className="flex flex-wrap gap-1.5">
                      {lists.map((list) => {
                        const active = cell[level].includes(list.id);
                        return (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => toggle(assetType, level, list.id)}
                            className={`text-xs rounded-md border px-2.5 py-1 transition ${
                              active
                                ? LEVEL_COLORS[level]
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            }`}
                          >
                            {list.name}
                            <span className="ml-1 opacity-60">({list.emails.length})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={save}>
          <Save className="h-4 w-4 mr-2" /> Save matrix
        </Button>
      </div>
    </div>
  );
}
