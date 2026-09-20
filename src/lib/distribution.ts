// Distribution: the address lists a crisis communication goes to, and who is
// responsible, accountable, consulted or informed for each kind of
// communication.
//
// This used to live in localStorage "so it can be configured per-user without
// backend tables". That made it per-browser: the head of comms configured the
// lists, nobody else saw them, and no edge function could read them — so a
// workflow rule could not notify anyone, and the matrix described a process the
// product could not follow. It now lives in the workspace, where the whole team
// and the rule engine can see the same thing.

import { supabase } from "@/integrations/supabase/client";

export type EmailList = {
  id: string;
  name: string;
  description?: string;
  emails: string[];
};

export type RaciLevel = "responsible" | "accountable" | "consulted" | "informed";
export type ResponsibilityMatrix = Record<string, Record<RaciLevel, string[]>>;

export const RACI_LEVELS: RaciLevel[] = ["responsible", "accountable", "consulted", "informed"];

const EMPTY_RACI = (): Record<RaciLevel, string[]> => ({
  responsible: [],
  accountable: [],
  consulted: [],
  informed: [],
});

export const ASSET_TYPE_LABELS: Record<string, string> = {
  press_release: "Press release",
  holding_statement: "Holding statement",
  internal_memo: "Internal memo",
  customer_faq: "Customer FAQ",
  post_x: "X (Twitter) post",
  post_instagram: "Instagram post",
  post_facebook: "Facebook post",
  tiktok_script: "TikTok script",
};

export const EMAIL_ASSET_TYPES = [
  "press_release",
  "holding_statement",
  "internal_memo",
  "customer_faq",
];

export const SOCIAL_ASSET_TYPES = ["post_x", "post_instagram", "post_facebook", "tiktok_script"];

export function isEmailAsset(assetType: string) {
  return EMAIL_ASSET_TYPES.includes(assetType);
}

export function isSocialAsset(assetType: string) {
  return SOCIAL_ASSET_TYPES.includes(assetType);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const RACI_LABELS: Record<RaciLevel, string> = {
  responsible: "Responsible",
  accountable: "Accountable",
  consulted: "Consulted",
  informed: "Informed",
};

export const RACI_DESCRIPTIONS: Record<RaciLevel, string> = {
  responsible: "Does the work — drafts and sends the comms",
  accountable: "Owns the decision — must sign off before send",
  consulted: "Input needed before publishing",
  informed: "Kept in the loop after sending",
};

/** The lists a workspace starts with, created on first visit to the editor. */
const STARTER_LISTS: Array<{ name: string; description: string }> = [
  { name: "Executive Team", description: "C-level and crisis decision makers" },
  { name: "Press & Media", description: "Journalists, PR agencies, media outlets" },
  { name: "Operations & Frontline", description: "On-the-ground operations and customer-facing staff" },
  { name: "Regulators & Authorities", description: "Regulators, government contacts" },
  { name: "All Employees", description: "Company-wide internal distribution" },
];

// ─────────────────────────────────────────────────────────────
// Lists
// ─────────────────────────────────────────────────────────────

export async function fetchEmailLists(): Promise<EmailList[]> {
  const { data, error } = await supabase
    .from("email_lists")
    .select("id, name, description, emails")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description ?? undefined,
    emails: l.emails ?? [],
  }));
}

export async function createEmailList(name: string, description: string): Promise<EmailList> {
  const { data, error } = await supabase
    .from("email_lists")
    .insert({ name, description: description || null, emails: [] })
    .select("id, name, description, emails")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, name: data.name, description: data.description ?? undefined, emails: data.emails ?? [] };
}

export async function setEmailListAddresses(id: string, emails: string[]): Promise<void> {
  const { data, error } = await supabase
    .from("email_lists")
    .update({ emails })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  // An RLS refusal is silent, and a silently discarded address list is worse
  // than an error message: the team believes people will be told.
  if (!data?.length) throw new Error("not-permitted");
}

export async function deleteEmailList(id: string): Promise<void> {
  const { error } = await supabase.from("email_lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Create the starter lists if this workspace has none.
 *
 * Returns whatever the workspace has afterwards. Only an administrator can
 * write, so for anyone else this is just a read.
 */
export async function ensureEmailLists(isAdmin: boolean): Promise<EmailList[]> {
  const existing = await fetchEmailLists();
  if (existing.length || !isAdmin) return existing;

  const imported = await importLocalListsOnce();
  if (imported.length) return imported;

  const { error } = await supabase
    .from("email_lists")
    .insert(STARTER_LISTS.map((l) => ({ ...l, emails: [] })));
  if (error) return existing;
  return await fetchEmailLists();
}

// ─────────────────────────────────────────────────────────────
// Responsibility matrix
// ─────────────────────────────────────────────────────────────

export async function fetchResponsibilityMatrix(): Promise<ResponsibilityMatrix> {
  const { data, error } = await supabase
    .from("responsibility_matrix")
    .select("asset_type, level, list_id");
  if (error) throw new Error(error.message);
  const matrix: ResponsibilityMatrix = {};
  for (const row of data ?? []) {
    matrix[row.asset_type] ??= EMPTY_RACI();
    matrix[row.asset_type][row.level as RaciLevel].push(row.list_id);
  }
  return matrix;
}

/**
 * Replace the whole matrix.
 *
 * It is a small set of rows describing one decision, so it is written as one:
 * clear it, then insert what the editor is showing. Anything else leaves the
 * stored matrix half-way between two intentions.
 */
export async function saveResponsibilityMatrix(matrix: ResponsibilityMatrix): Promise<void> {
  const rows: Array<{ asset_type: string; level: RaciLevel; list_id: string }> = [];
  for (const [assetType, levels] of Object.entries(matrix)) {
    for (const level of RACI_LEVELS) {
      for (const listId of levels?.[level] ?? []) {
        rows.push({ asset_type: assetType, level, list_id: listId });
      }
    }
  }

  const { error: clearErr } = await supabase
    .from("responsibility_matrix")
    .delete()
    .not("asset_type", "is", null);
  if (clearErr) throw new Error(clearErr.message);

  if (!rows.length) return;
  const { data, error } = await supabase.from("responsibility_matrix").insert(rows).select("list_id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("not-permitted");
}

export async function getMatrixFor(assetType: string): Promise<Record<RaciLevel, string[]>> {
  const matrix = await fetchResponsibilityMatrix();
  return matrix[assetType] ?? EMPTY_RACI();
}

// ─────────────────────────────────────────────────────────────
// The old browser storage
// ─────────────────────────────────────────────────────────────

const LEGACY_LISTS_KEY = "sevra.email_lists.v1";
const LEGACY_RACI_KEY = "sevra.responsibility_matrix.v1";
const LEGACY_RECIPIENTS_KEY = "sevra.distribution_lists.v1";
const IMPORTED_FLAG = "sevra.distribution.imported.v1";

/**
 * Carry a browser's lists and matrix into the workspace, once.
 *
 * Whoever configured these did real work — collecting press contacts, agreeing
 * who signs off on what — and it was stored where only their own browser could
 * see it. The old list ids were local strings, so the matrix is remapped onto
 * the ids the workspace assigns.
 */
async function importLocalListsOnce(): Promise<EmailList[]> {
  let legacy: EmailList[] = [];
  try {
    if (localStorage.getItem(IMPORTED_FLAG)) return [];
    const raw = localStorage.getItem(LEGACY_LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return [];
    legacy = parsed as EmailList[];
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("email_lists")
    .insert(
      legacy.map((l) => ({
        name: l.name,
        description: l.description || null,
        emails: (l.emails ?? []).filter(isValidEmail),
      })),
    )
    .select("id, name, description, emails");
  if (error || !data?.length) return [];

  const idByName = new Map(data.map((l) => [l.name, l.id]));
  try {
    const rawMatrix = localStorage.getItem(LEGACY_RACI_KEY);
    if (rawMatrix) {
      const oldMatrix = JSON.parse(rawMatrix) as ResponsibilityMatrix;
      const nameByOldId = new Map(legacy.map((l) => [l.id, l.name]));
      const remapped: ResponsibilityMatrix = {};
      for (const [assetType, levels] of Object.entries(oldMatrix)) {
        remapped[assetType] = EMPTY_RACI();
        for (const level of RACI_LEVELS) {
          for (const oldId of levels?.[level] ?? []) {
            const newId = idByName.get(nameByOldId.get(oldId) ?? "");
            if (newId) remapped[assetType][level].push(newId);
          }
        }
      }
      await saveResponsibilityMatrix(remapped);
    }
  } catch {
    // The lists made it across; a matrix that cannot be parsed is not worth
    // failing the import for.
  }

  try {
    localStorage.setItem(IMPORTED_FLAG, new Date().toISOString());
    localStorage.removeItem(LEGACY_RECIPIENTS_KEY);
  } catch {
    // Private browsing. The flag is a convenience, not a correctness guard:
    // the import only runs when the workspace has no lists at all.
  }

  return data.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description ?? undefined,
    emails: l.emails ?? [],
  }));
}

/**
 * The lists a communication should go to, in the order the matrix implies:
 * whoever does the work first, then who signs it off, then the rest.
 */
export function recommendedLists(
  matrix: ResponsibilityMatrix,
  lists: EmailList[],
  assetType: string,
): Array<{ list: EmailList; level: RaciLevel }> {
  const forType = matrix[assetType] ?? EMPTY_RACI();
  const byId = new Map(lists.map((l) => [l.id, l]));
  const out: Array<{ list: EmailList; level: RaciLevel }> = [];
  const seen = new Set<string>();
  for (const level of RACI_LEVELS) {
    for (const id of forType[level] ?? []) {
      if (seen.has(id)) continue;
      const list = byId.get(id);
      if (!list) continue;
      seen.add(id);
      out.push({ list, level });
    }
  }
  return out;
}

// Social network URLs for the "copy + open" flow.
export function socialNetworkUrl(assetType: string, content: string): string {
  const text = encodeURIComponent(content);
  switch (assetType) {
    case "post_x":
      return `https://twitter.com/intent/tweet?text=${text}`;
    case "post_instagram":
      return "https://www.instagram.com/";
    case "post_facebook":
      return "https://www.facebook.com/";
    case "tiktok_script":
      return "https://www.tiktok.com/upload";
    default:
      return "#";
  }
}

export function socialNetworkLabel(assetType: string): string {
  switch (assetType) {
    case "post_x":
      return "X (Twitter)";
    case "post_instagram":
      return "Instagram";
    case "post_facebook":
      return "Facebook";
    case "tiktok_script":
      return "TikTok";
    default:
      return "Social network";
  }
}

// Maps an asset type to the social_connections.network key used by the
// social-oauth-*/social-publish edge functions. Returns null for asset types
// with no direct-publish support (only copy+open-tab applies to those).
export function socialNetworkKey(assetType: string): "x" | "facebook" | null {
  switch (assetType) {
    case "post_x":
      return "x";
    case "post_facebook":
      return "facebook";
    default:
      return null;
  }
}

// The starter lists' Spanish names. A list someone has renamed keeps the name
// they gave it; only an untouched starter is shown translated.
const STARTER_LIST_ES: Record<string, { name: string; description: string }> = {
  "Executive Team": { name: "Equipo directivo", description: "Dirección y responsables de decisión en la crisis" },
  "Press & Media": { name: "Prensa y medios", description: "Periodistas, agencias de comunicación y medios" },
  "Operations & Frontline": { name: "Operaciones y primera línea", description: "Personal de operaciones y de atención al cliente" },
  "Regulators & Authorities": { name: "Reguladores y autoridades", description: "Reguladores y contactos gubernamentales" },
  "All Employees": { name: "Toda la plantilla", description: "Distribución interna a toda la empresa" },
};

export function listDisplay(list: EmailList, lang: "en" | "es"): { name: string; description?: string } {
  const es = STARTER_LIST_ES[list.name];
  const starter = STARTER_LISTS.find((d) => d.name === list.name);
  if (lang !== "es" || !es) return { name: list.name, description: list.description };
  return {
    name: es.name,
    description: !list.description || list.description === starter?.description ? es.description : list.description,
  };
}
