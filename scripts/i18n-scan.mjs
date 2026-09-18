// Lists user-visible English written directly in components, so none slips
// past translation: JSX text, text-bearing attributes, and toast messages.
// Usage: node scripts/i18n-scan.mjs [files...]   (defaults to all of src/)
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const ATTRS = new Set(["placeholder", "title", "alt", "aria-label", "label", "description"]);
const CALLS = new Set(["toast", "toast.error", "toast.success", "toast.info", "toast.warning", "toast.message", "setError", "confirm", "alert"]);
const SKIP = [/\/components\/ui\//, /\/i18n\//, /\/integrations\//, /industries(-es)?\.ts$/];
// Names that read the same in every language.
const BRANDS = /\b(Sevra|SEVRA|The Stellar Crew|Agent Stripes|Stellar|X|TikTok|Instagram|Facebook|LinkedIn|Reddit|Resend|Google)\b/g;
const looksLikeWords = (s) => /[A-Za-z]{2,}/.test(s.replace(BRANDS, "")) && !/^[a-z0-9_.:/#-]+$/.test(s.trim()) && !/^(https?:|mailto:)/.test(s.trim());

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : /\.tsx?$/.test(d.name) ? [p] : [];
  });
}

const files = (process.argv.length > 2 ? process.argv.slice(2) : walk("src")).filter((f) => !SKIP.some((r) => r.test(f)));
let total = 0;
for (const file of files) {
  const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits = [];
  const report = (node, text) => {
    const { line } = src.getLineAndCharacterOfPosition(node.getStart());
    hits.push(`${line + 1}: ${text.trim().replace(/\s+/g, " ").slice(0, 90)}`);
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && looksLikeWords(node.text)) report(node, node.text);
    if (ts.isJsxAttribute(node) && ATTRS.has(node.name.getText()) && node.initializer && ts.isStringLiteral(node.initializer) && looksLikeWords(node.initializer.text)) {
      report(node, `${node.name.getText()}="${node.initializer.text}"`);
    }
    if (ts.isCallExpression(node) && CALLS.has(node.expression.getText())) {
      const a = node.arguments[0];
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) && looksLikeWords(a.text)) report(node, `${node.expression.getText()}("${a.text}")`);
      if (a && ts.isTemplateExpression(a) && looksLikeWords(a.head.text)) report(node, `${node.expression.getText()}(\`${a.head.text}…\`)`);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  if (hits.length) {
    total += hits.length;
    console.log(`\n${file} (${hits.length})`);
    hits.forEach((h) => console.log("  " + h));
  }
}
console.log(`\n${total} untranslated string(s)`);
