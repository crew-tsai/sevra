// Distribution lists for crisis communications.
// Stored in localStorage so it can be configured per-user without backend tables.

export type DistributionLists = Record<string, string[]>;

const STORAGE_KEY = "sevra.distribution_lists.v1";
const NAMED_LISTS_KEY = "sevra.email_lists.v1";
const RACI_KEY = "sevra.responsibility_matrix.v1";

export const DEFAULT_LISTS: DistributionLists = {
  press_release: [],
  holding_statement: [],
  internal_memo: [],
  customer_faq: [],
};

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

export function loadDistributionLists(): DistributionLists {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LISTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LISTS, ...parsed };
  } catch {
    return { ...DEFAULT_LISTS };
  }
}

export function saveDistributionLists(lists: DistributionLists) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function getListFor(assetType: string): string[] {
  const lists = loadDistributionLists();
  return lists[assetType] ?? [];
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─────────────────────────────────────────────────────────────
// Named email lists (built in Admin → Email lists)
// ─────────────────────────────────────────────────────────────

export type EmailList = {
  id: string;
  name: string;
  description?: string;
  emails: string[];
};

const DEFAULT_NAMED_LISTS: EmailList[] = [
  {
    id: "exec",
    name: "Executive Team",
    description: "C-level and crisis decision makers",
    emails: [],
  },
  {
    id: "press",
    name: "Press & Media",
    description: "Journalists, PR agencies, media outlets",
    emails: [],
  },
  {
    id: "ops",
    name: "Operations & Frontline",
    description: "On-the-ground operations and customer-facing staff",
    emails: [],
  },
  {
    id: "regulators",
    name: "Regulators & Authorities",
    description: "Aviation authorities, government contacts",
    emails: [],
  },
  {
    id: "internal-all",
    name: "All Employees",
    description: "Company-wide internal distribution",
    emails: [],
  },
];

export function loadEmailLists(): EmailList[] {
  try {
    const raw = localStorage.getItem(NAMED_LISTS_KEY);
    if (!raw) return [...DEFAULT_NAMED_LISTS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_NAMED_LISTS];
    return parsed as EmailList[];
  } catch {
    return [...DEFAULT_NAMED_LISTS];
  }
}

export function saveEmailLists(lists: EmailList[]) {
  localStorage.setItem(NAMED_LISTS_KEY, JSON.stringify(lists));
}

// ─────────────────────────────────────────────────────────────
// Responsibility matrix (RACI)
// Maps each asset type → list IDs by responsibility level.
// ─────────────────────────────────────────────────────────────

export type RaciLevel = "responsible" | "accountable" | "consulted" | "informed";

export type ResponsibilityMatrix = Record<string, Record<RaciLevel, string[]>>;

const EMPTY_RACI: Record<RaciLevel, string[]> = {
  responsible: [],
  accountable: [],
  consulted: [],
  informed: [],
};

const DEFAULT_MATRIX: ResponsibilityMatrix = {
  press_release: {
    responsible: ["press"],
    accountable: ["exec"],
    consulted: ["regulators"],
    informed: ["internal-all"],
  },
  holding_statement: {
    responsible: ["press", "ops"],
    accountable: ["exec"],
    consulted: [],
    informed: ["internal-all"],
  },
  internal_memo: {
    responsible: ["internal-all"],
    accountable: ["exec"],
    consulted: ["ops"],
    informed: [],
  },
  customer_faq: {
    responsible: ["ops"],
    accountable: ["exec"],
    consulted: ["press"],
    informed: ["internal-all"],
  },
};

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

export function loadResponsibilityMatrix(): ResponsibilityMatrix {
  try {
    const raw = localStorage.getItem(RACI_KEY);
    if (!raw) return { ...DEFAULT_MATRIX };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MATRIX, ...parsed };
  } catch {
    return { ...DEFAULT_MATRIX };
  }
}

export function saveResponsibilityMatrix(matrix: ResponsibilityMatrix) {
  localStorage.setItem(RACI_KEY, JSON.stringify(matrix));
}

export function getMatrixFor(assetType: string): Record<RaciLevel, string[]> {
  const matrix = loadResponsibilityMatrix();
  return matrix[assetType] ?? { ...EMPTY_RACI };
}

/**
 * Recommended email lists for a given asset type, ordered by priority
 * (responsible → accountable → consulted → informed).
 */
export function getRecommendedLists(
  assetType: string,
): Array<{ list: EmailList; level: RaciLevel }> {
  const matrix = getMatrixFor(assetType);
  const lists = loadEmailLists();
  const byId = new Map(lists.map((l) => [l.id, l]));
  const out: Array<{ list: EmailList; level: RaciLevel }> = [];
  const seen = new Set<string>();
  (["responsible", "accountable", "consulted", "informed"] as RaciLevel[]).forEach(
    (level) => {
      for (const id of matrix[level] ?? []) {
        if (seen.has(id)) continue;
        const list = byId.get(id);
        if (!list) continue;
        seen.add(id);
        out.push({ list, level });
      }
    },
  );
  return out;
}

// Social network URLs for "copy + open" flow
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
