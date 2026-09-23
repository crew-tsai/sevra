// Some logic exists twice: once in src/lib for the app and once in
// supabase/functions/_shared for the AI functions (different toolchains, so no
// shared import). If a pair drifts, the app and the AI disagree about the same
// thing — which incident types exist, or how severe an incident is. Run by
// `npm run build`.
import fs from "node:fs";

let failed = false;

const fail = (...lines) => {
  failed = true;
  for (const line of lines) console.error(line);
};

// The industry data is embedded in a larger file, so compare that section only.
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
  fail(
    "Industry lists differ between src/lib/industries.ts and supabase/functions/_shared/industries.ts.",
    "Change the app's copy, then copy its data section (IndustryProfile … LEGACY_ALIASES) to the other.",
  );
} else {
  console.log("industries: app and AI functions agree");
}

// These are whole-file mirrors: same module, two toolchains.
const MIRRORS = [
  ["src/lib/crisis-level.ts", "supabase/functions/_shared/crisis-level.ts"],
  ["src/lib/workflows.ts", "supabase/functions/_shared/workflows.ts"],
  ["src/lib/watched-sources.ts", "supabase/functions/_shared/watched-sources.ts"],
];

for (const [from, to] of MIRRORS) {
  if (fs.readFileSync(from, "utf8") !== fs.readFileSync(to, "utf8")) {
    fail(`${from} and ${to} differ.`, `Change the app's copy, then: cp ${from} ${to}`);
  } else {
    console.log(`${from.split("/").pop()}: app and AI functions agree`);
  }
}

if (failed) process.exit(1);
