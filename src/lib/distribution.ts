// Distribution lists for crisis communications.
// Stored in localStorage so it can be configured per-user without backend tables.
// Lists are keyed by asset type.

export type DistributionLists = Record<string, string[]>;

const STORAGE_KEY = "sevra.distribution_lists.v1";

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
  tiktok_script: "TikTok script",
};

export const EMAIL_ASSET_TYPES = [
  "press_release",
  "holding_statement",
  "internal_memo",
  "customer_faq",
];

export const SOCIAL_ASSET_TYPES = ["post_x", "post_instagram", "tiktok_script"];

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

// Social network URLs for "copy + open" flow
export function socialNetworkUrl(assetType: string, content: string): string {
  const text = encodeURIComponent(content);
  switch (assetType) {
    case "post_x":
      return `https://twitter.com/intent/tweet?text=${text}`;
    case "post_instagram":
      // Instagram has no web composer — open the app/site
      return "https://www.instagram.com/";
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
    case "tiktok_script":
      return "TikTok";
    default:
      return "Social network";
  }
}
