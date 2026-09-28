// STATIC CHECKS (RULES.md section 11): rules the code itself must keep. Exits 1 on any failure.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const rel = (f) => path.relative(root, f).replace(/\\/g, "/");
const src = walk(path.join(root, "src")).filter((f) => /\.(ts|tsx|css)$/.test(f));
const code = src.filter((f) => /\.(ts|tsx)$/.test(f));
const read = (f) => fs.readFileSync(f, "utf8");
const results = [];
const check = (name, problems) => results.push({ name, ok: problems.length === 0, problems });
const lineOf = (s, i) => s.slice(0, i).split("\n").length;

// 1. one database connection (core connection)
check("Only src/lib/server/core.ts creates a database client", code.filter((f) => rel(f) !== "src/lib/server/core.ts" && /createClient\s*\(/.test(read(f))).map(rel));

// 2. server files never reach the phone
check("Every server file is marked server-only", code.filter((f) => rel(f).startsWith("src/lib/server/") && !/import "server-only"/.test(read(f))).map(rel));
check("No phone screen imports server code (except types)", code.filter((f) => /["']use client["']/.test(read(f)) && /^import (?!type )[^;]*from "@\/lib\/server\//m.test(read(f))).map(rel));

// 3. no secrets in the code (the repo is public)
const SECRET = [/sb_secret_[A-Za-z0-9_-]{10,}/, /sbp_[a-f0-9]{20,}/, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJ[A-Za-z0-9_-]{20,}/, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, new RegExp("god" + "islove", "i"), /AIza[0-9A-Za-z_-]{30,}/, /Telgo(Admin|Sup|Eng|Fin|Client)#20\d\d/];
const everything = walk(root).filter((f) => !/[\\/](node_modules|\.next|legacy|\.git)[\\/]/.test(f) && !/\.env/.test(path.basename(f)) && /\.(ts|tsx|js|mjs|json|md|sql|css|html|webmanifest)$/.test(f));
check("No keys, passwords or tokens in the code", everything.flatMap((f) => SECRET.filter((re) => re.test(read(f))).map((re) => `${rel(f)} matches ${re}`)));

// 4. no demo or sample data anywhere
check("No demo data, sample projects or fake fallbacks", code.flatMap((f) => {
  const s = read(f);
  return [/demo-data|mobile-seed|DEFAULT_PROJECTS|ops-store|offline-store/, /9\.9538|76\.3428|vadakkekotta/i, /\bMath\.random\(\)/].filter((re) => re.test(s)).map((re) => `${rel(f)} matches ${re}`);
}));

// 5. no HTML injection (only the fixed icon drawings may use it)
check("No dangerouslySetInnerHTML outside Icon.tsx", code.filter((f) => rel(f) !== "src/components/Icon.tsx" && /dangerouslySetInnerHTML/.test(read(f))).map(rel));

// 6. passwords never kept on the phone
check("No password in the phone's storage", code.filter((f) => /localStorage\.setItem\([^)]*pass/i.test(read(f))).map(rel));

// 7. page files export only the page (Next.js rule; a second export breaks the build)
check("page.tsx files export only the page", code.filter((f) => /[\\/]page\.tsx$/.test(f)).flatMap((f) => {
  const s = read(f);
  return [...s.matchAll(/^export (?!default)(const|function|async function|let|class|type|interface) (\w+)/gm)].map((m) => `${rel(f)} exports ${m[2]}`);
}));
check("route.ts files export only HTTP handlers", code.filter((f) => /[\\/]route\.ts$/.test(f)).flatMap((f) => {
  const s = read(f);
  return [...s.matchAll(/^export (const|function|async function) (\w+)/gm)].filter((m) => !["GET", "POST", "PATCH", "PUT", "DELETE", "dynamic"].includes(m[2])).map((m) => `${rel(f)} exports ${m[2]}`);
}));

// 8. every API route goes through the gate (api/publicApi), except the two with their own lock
const OWN_LOCK = new Set(["src/app/api/version/route.ts", "src/app/api/cron/purge/route.ts"]);
check("Every API route goes through the security gate", code.filter((f) => /src[\\/]app[\\/]api[\\/].*route\.ts$/.test(f) && !OWN_LOCK.has(rel(f))).filter((f) => {
  const s = read(f);
  const handlers = [...s.matchAll(/^export const (GET|POST|PATCH|PUT|DELETE) = (\w+)\(/gm)];
  const bare = /^export (async )?function (GET|POST|PATCH|PUT|DELETE)/m.test(s);
  return bare || !handlers.length || handlers.some((h) => !["api", "publicApi"].includes(h[2]));
}).map(rel));

// 9. every database write reads back what it saved (or says why it doesn't need to)
check("Every database write is confirmed (select) or marked unconfirmed-ok with a reason", code.filter((f) => rel(f).startsWith("src/")).flatMap((f) => {
  const s = read(f);
  const out = [];
  for (const m of s.matchAll(/\.from\([^)]*\)\s*\.(insert|update|upsert|delete)\(/g)) {
    const rest = s.slice(m.index);
    const end = rest.search(/;\s*(\n|$)/);
    const stmt = rest.slice(0, end < 0 ? 800 : end);
    if (/\.select\(/.test(stmt)) continue;
    const line = lineOf(s, m.index);
    const lines = s.split("\n");
    if (/unconfirmed-ok:/.test(lines[line - 1] ?? "") || /unconfirmed-ok:/.test(lines[line - 2] ?? "")) continue;
    out.push(`${rel(f)}:${line}`);
  }
  return out;
}));

// 10. no old routes that leaked data
check("The old open routes are gone", ["src/app/api/mobile/check-db/route.ts", "src/app/api/mobile/sign-in/route.ts"].filter((f) => fs.existsSync(path.join(root, f))));

// 11. content has no icons (owner's rule): <svg> only in Icon, Map pins, the bore chart and the HDD sheet
const SVG_OK = new Set(["src/components/Icon.tsx", "src/app/app/report/new/_parts/steps.tsx", "src/app/app/reports/print/[id]/page.tsx"]);
check("No icons in the screens (words only; icons live in the menu)", code.filter((f) => !SVG_OK.has(rel(f)) && /<svg[\s>]/.test(read(f))).map(rel));

// 12. no browser alert()/confirm() (every question is a plain-word sheet)
check("No alert() or confirm() popups", code.filter((f) => /[^.\w](alert|confirm)\(/.test(read(f).replace(/\/\/.*$/gm, ""))).map(rel));

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
  if (!r.ok) { failed++; r.problems.slice(0, 20).forEach((p) => console.log(`        ${p}`)); }
}
console.log(`\n${results.length - failed}/${results.length} static checks passed`);
process.exit(failed ? 1 : 0);
