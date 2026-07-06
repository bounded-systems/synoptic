#!/usr/bin/env node
// synoptic name-values <css-tokens.json> — name each distinct VALUE by INLINING the value
// itself (lossless, no namespace, no bucketing). A token's NAME IS ITS CONTENT — a
// human-readable content-address. We project the CSS Typed OM internal representation
// (color {l,c,h,alpha}, dimension {value,unit}, …) into the name, so the value is legible
// from the name and identical values get identical names (unique by construction).
import { readFileSync } from "node:fs";
const src = process.argv[2];
if (!src) { console.error("usage: name-values <css-tokens.json>"); process.exit(2); }
const data = JSON.parse(readFileSync(src, "utf8"));
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const num = (x) => String(x).replace(/\./g, "_").replace(/^-/, "neg");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// INLINE the internal representation into the name — lossless.
function nameOf(t) {
  switch (t.$type) {
    case "color":      return `oklch-${num(t.l)}-${num(t.c)}-${num(t.h)}-${num(t.alpha)}`;
    case "dimension":  return t.value === 0 ? "0" : `${num(t.value)}${t.unit}`;
    case "number":     return `n-${num(t.value)}`;
    case "percentage": return `${num(t.value)}pct`;
    case "keyword":    return slug(t.value);
    case "fontFamily": return t.value.map(slug).join("--");
    default:           return slug(JSON.stringify(t));
  }
}

const named = data.values.map((e) => { const t = parse(e.value); return { name: nameOf(t), type: t.$type, value: t, address: e.address, token: e.token || null }; });
// verify the name is a true content-address: unique per distinct value
const names = new Set(), dupes = [];
for (const n of named) { if (names.has(n.name)) dupes.push(n.name); names.add(n.name); }
named.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
console.log(`name-values — ${named.length} values named by INLINING the value (name = content)\n`);
console.log(`  unique names: ${names.size}/${named.length}  ${names.size === named.length ? "✓ each name maps 1:1 to a value" : "❌ " + dupes.length + " collisions"}\n`);
const byType = {};
for (const n of named) (byType[n.type] ??= []).push(n);
for (const [ty, list] of Object.entries(byType)) {
  console.log(`  ${ty} (${list.length}):`);
  for (const n of list.slice(0, 10)) console.log(`     ${n.name.padEnd(28)}${n.token ? " (" + n.token + ")" : ""}`);
  if (list.length > 10) console.log(`     … +${list.length - 10} more`);
}
