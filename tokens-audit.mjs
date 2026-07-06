#!/usr/bin/env node
// synoptic tokens-audit <url|file> — the design-token state of a live page. Tells you
// which design values ARE token atoms (var(--x) referencing a declared token) and which
// are LOOSE literals (hardcoded #hex / rgb() / Npx|rem that SHOULD be token atoms). A
// coverage read on "declare all leaves" at the design layer. Honest proxy (regex CSS).
//   node tokens-audit.mjs <url | file.html> [--json]
const src = process.argv[2];
if (!src) { console.error("usage: tokens-audit <url|file> [--json]"); process.exit(2); }
const asJson = process.argv.includes("--json");
const get = async (u) => (u.startsWith("http") ? (await fetch(u)).text() : (await import("node:fs")).readFileSync(u, "utf8"));

const html = await get(src);
let css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n")
  + "\n" + [...html.matchAll(/style="([^"]*)"/gi)].map((m) => m[1]).join("\n");
// pull in linked stylesheets (design values usually live there)
if (src.startsWith("http")) {
  const base = new URL(src);
  for (const m of html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi)) {
    try { css += "\n" + await get(new URL(m[1], base).href); } catch {}
  }
}

const declared = new Map();
for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)) declared.set("--" + m[1], m[2].trim());
const varUses = new Set([...css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1]));
// loose = literals appearing as VALUES, after stripping token definitions (their RHS is the token, not loose)
const body = css.replace(/--[a-z0-9-]+\s*:\s*[^;}]+/gi, "");
const colors = new Set([...body.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)].map((m) => m[0].toLowerCase()));
const dims = new Set([...body.matchAll(/(?<![\w-])\d+(?:\.\d+)?(?:px|rem|em)\b/g)].map((m) => m[0]).filter((d) => d !== "0px" && d !== "1px"));
const looseTotal = colors.size + dims.size;
const total = varUses.size + looseTotal;
const coverage = total ? Math.round((100 * varUses.size) / total) : 100;

// the sharpest cases: a loose literal that EQUALS a declared token's value — the token
// already exists, it's just hardcoded here. "#0c5a42 should be var(--color-forest)".
const valToToken = new Map();
for (const [name, val] of declared) { const v = val.toLowerCase().trim(); if (!valToToken.has(v)) valToToken.set(v, name); }
const shouldUse = [...colors, ...dims].map((v) => [v, valToToken.get(v.toLowerCase())]).filter(([, t]) => t);

const report = {
  source: src,
  declaredTokens: declared.size,
  tokenized: varUses.size,
  loose: { total: looseTotal, colors: [...colors], dimensions: [...dims] },
  shouldUseExistingToken: shouldUse.map(([v, t]) => ({ literal: v, token: t })),
  coverage,
};
if (asJson) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
console.log(`design-token state — ${src}\n`);
console.log(`  declared tokens:            ${declared.size}`);
console.log(`  tokenized values (var()):   ${varUses.size} distinct  ✓ these ARE token atoms`);
console.log(`  LOOSE literals:             ${looseTotal}            ⚠ these SHOULD be token atoms`);
if (colors.size) console.log(`     colors:     ${[...colors].slice(0, 14).join("  ")}`);
if (dims.size) console.log(`     dimensions: ${[...dims].slice(0, 14).join("  ")}`);
if (shouldUse.length) {
  console.log(`\n  ✗ ${shouldUse.length} loose literal(s) EQUAL an existing token — just hardcoded (fix first):`);
  for (const [v, t] of shouldUse.slice(0, 16)) console.log(`     ${v}  →  var(${t})`);
}
console.log(`\n  token coverage: ${coverage}%  (${varUses.size} tokenized / ${total} design values)`);
