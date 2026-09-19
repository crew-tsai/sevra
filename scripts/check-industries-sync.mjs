// The industry list exists twice: src/lib/industries.ts for the app and
// supabase/functions/_shared/industries.ts for the AI functions (different
// toolchains, so no shared import). If they drift, the form offers one set of
// incident types and the AI classifies against another. Run by `npm run build`.
import fs from "node:fs";

const section = (path, end) => {
  const s = fs.readFileSync(path, "utf8");
  const from = s.indexOf("export type IndustryProfile");
  const to = s.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Could not find the industry data in ${path}`);
  return s.slice(from, to).trim();
};

const app = section("src/lib/industries.ts", 'type Lang = "en" | "es";');
const fns = section("supabase/functions/_shared/industries.ts", "export function profileFor");
if (app !== fns) {
  console.error("Industry lists differ between src/lib/industries.ts and supabase/functions/_shared/industries.ts.");
  console.error("Change the app's copy, then copy its data section (IndustryProfile … LEGACY_ALIASES) to the other.");
  process.exit(1);
}
console.log("industries: app and AI functions agree");
