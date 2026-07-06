#!/usr/bin/env node
// synoptic derive-tokens <css-tokens.json> [--out dir] — split the token set:
//   DERIVED  = the content-named atoms (name = value). The active, canonical set.
//   ARCHIVED = the authored --* vars (--bs-*, --site-*). NOT derived → archived, kept only
//              as aliases pointing at the derived atom (so old CSS still resolves), never
//              as the source of truth.
// Emits tokens.derived.css/.json + archive/tokens.authored.css/.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const src = process.argv[2];
const outI = process.argv.indexOf("--out"); const OUT = outI >= 0 ? process.argv[outI + 1] : "/private/tmp/derived";
if (!src) { console.error("usage: derive-tokens <css-tokens.json> [--out dir]"); process.exit(2); }
const data = JSON.parse(readFileSync(src, "utf8"));
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const num = (x) => String(x).replace(/\./g, "_").replace(/^-/, "neg");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const nameOf = (t) => t.$type === "color" ? `oklch-${num(t.l)}-${num(t.c)}-${num(t.h)}-${num(t.alpha)}`
  : t.$type === "dimension" ? (t.value === 0 ? "0" : `${num(t.value)}${t.unit}`)
  : t.$type === "number" ? `n-${num(t.value)}` : t.$type === "percentage" ? `${num(t.value)}pct`
  : t.$type === "keyword" ? slug(t.value) : t.$type === "fontFamily" ? t.value.map(slug).join("--") : slug(JSON.stringify(t));
const toCss = (t) => t.$type === "color" ? `oklch(${t.l}% ${t.c} ${t.h} / ${t.alpha})`
  : t.$type === "dimension" ? (t.value === 0 ? "0" : `${t.value}${t.unit}`)
  : t.$type === "number" ? `${t.value}` : t.$type === "percentage" ? `${t.value}%`
  : t.$type === "keyword" ? t.value : t.$type === "fontFamily" ? t.value.join(", ") : String(t.value ?? "");

// DERIVED: distinct content atoms
const derived = new Map();      // content-name -> {name, type, css, value}
const archived = [];            // {var, derived} — authored → content-name
for (const e of data.values) {
  const t = parse(e.value); const nm = nameOf(t);
  if (!derived.has(nm)) derived.set(nm, { name: nm, type: t.$type, css: toCss(t), value: t });
  if (e.token) archived.push({ var: e.token, derived: nm });
}
archived.sort((a, b) => a.var.localeCompare(b.var));
const D = [...derived.values()].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

mkdirSync(join(OUT, "archive"), { recursive: true });
// ACTIVE: the derived tokens, used DIRECTLY (no alias layer).
writeFileSync(join(OUT, "tokens.derived.css"), `/* DERIVED tokens — name IS the value (content-addressed). The canonical set, used directly. */\n:root {\n${D.map((d) => `  --${d.name}: ${d.css};`).join("\n")}\n}\n`);
writeFileSync(join(OUT, "tokens.derived.json"), JSON.stringify(D, null, 2) + "\n");
// ARCHIVE: a plain historical record of what the authored --* vars mapped to. NOT emitted
// as aliases, NOT for use — just a migration ledger so nothing is silently lost.
writeFileSync(join(OUT, "archive/authored-vars.json"), JSON.stringify({ note: "Historical record of the removed authored vars and the derived atom each named. Not aliases; not for use. Author against the derived tokens directly.", vars: archived }, null, 2) + "\n");
console.log(`derive-tokens — ${src}\n`);
console.log(`  DERIVED  (active, content-named, used directly): ${D.length} atoms`);
console.log(`  ARCHIVED (authored --* vars, record only):       ${archived.length}`);
console.log(`  → ${OUT}/tokens.derived.css  ·  archive/authored-vars.json (record, not aliases)`);
console.log(`\n  derived tokens (used directly):`);
for (const d of D.filter((x) => x.type === "color").slice(0, 4)) console.log(`     --${d.name}: ${d.css};`);
