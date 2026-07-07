#!/usr/bin/env node
// Property tokens: the KEY is the full CSS property that reaches <color> — DERIVED from webref
// (StylePropertyMapReadOnly.keys(), whatever takes a color), not invented semantic roles. Each
// points to a derived primitive atom by its short SHA (content address — "any color of this
// name"), chosen by the property's CONTRAST ROLE. Complete coverage of the derived set.
import { readFileSync } from "node:fs";
const derived = JSON.parse(readFileSync("/tmp/synoptic/tokens/color-properties.derived.json","utf8")).properties.map(p=>p.name);
const prims = JSON.parse(readFileSync("/tmp/brand-derived/primitives.derived.json","utf8")).primitive;

// contrast role of each color property (see the contrast-pairs classification)
const BG=/^(background-color|background)$/, SELF=/^scrollbar-color$/, EXEMPT=/^(box-shadow-color|flood-color|lighting-color|stop-color)$/;
const TEXT=/^(color|-webkit-text-fill-color|-webkit-text-stroke-color|-webkit-text-stroke|text-decoration-color|text-emphasis-color|text-decoration|text-emphasis)$/;
const roleOf=(p)=> BG.test(p)?"background": SELF.test(p)?"self-pair": EXEMPT.test(p)?"exempt": TEXT.test(p)?"text-fg":"nontext-fg";
// each role → the derived atom it defaults to, and the tier it must clear
const ATOM={ "text-fg":"oklch-23_84-0_0204-162_64-1", background:"oklch-93_69-0_0124-91_52-1", "nontext-fg":"oklch-61-0_0228-91_69-1", "self-pair":"oklch-61-0_0228-91_69-1", exempt:"oklch-93_69-0_0124-91_52-1" };
const TIER={ "text-fg":"text, pairs with background-color at 7:1 AAA", background:"the ground — the background side of every pair", "nontext-fg":"non-text, pairs with background-color at 3:1", "self-pair":"a self-contained pair (thumb vs track) at 3:1", exempt:"decorative — no contrast pair" };

const out={};
for (const prop of derived) {
  const role=roleOf(prop), atom=ATOM[role], sha=prims[atom].$sha;
  out[prop]={ "$type":"color", "$value":sha, "$resolvesTo":atom, "$role":role,
    "$description":`CSS \`${prop}\` — ${TIER[role]}. Points to any color with content hash ${sha} (currently ${atom}).` };
}
const doc={ property:{ "$description":"Property tokens — keyed by the full CSS property that reaches <color>, DERIVED from @webref/css (the StylePropertyMapReadOnly.keys() surface), not invented semantic roles. $value is the short SHA of a derived atom (content address: any color of that content). $role is the contrast role. Complete coverage of the derived color-property set.", ...out } };
if (process.argv.includes("--json")) { console.log(JSON.stringify(doc,null,2)); process.exit(0); }

const byRole={}; for(const[p,v]of Object.entries(out))(byRole[v.$role]??=[]).push(p);
console.log(`property tokens — ${Object.keys(out).length} color properties (derived), each → a derived atom by SHA:\n`);
for(const[r,ps]of Object.entries(byRole)){ console.log(`  ${r} → ${ATOM[r]} (${prims[ATOM[r]].$sha})`); console.log("      "+ps.join(", ")+"\n"); }
