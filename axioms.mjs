#!/usr/bin/env node
// synoptic axioms — count + digest the axiom set (the human-asserted primary facts,
// e.g. grounding.json). Two jobs:
//   • the sign-on-change key: the content digest. If it hasn't changed, the old
//     signature still verifies — do NOT re-sign (no temporal drift).
//   • the minimization budget: every axiom is a thing you must trust and human-sign;
//     the goal is fewer over time. --max N fails if the set grew past the budget.
//
//   node axioms.mjs [path] [--max N]     (default path: data/audit/grounding.json)
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const argv = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
const path = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "data/audit/grounding.json";
const max = argv("--max") ? Number(argv("--max")) : undefined;

const raw = await readFile(path, "utf8");
const parsed = JSON.parse(raw);
const list = Array.isArray(parsed) ? parsed : Object.values(parsed).flat();
// canonical digest — stable across formatting, so it changes ONLY on real change.
const digest = "sha256:" + createHash("sha256").update(JSON.stringify(list)).digest("hex");

console.log(`axioms: ${list.length} · ${digest.slice(0, 19)}…`);
console.log(`  source: ${path}`);
if (max !== undefined) {
  console.log(`  budget: ${list.length}/${max}${list.length > max ? " — OVER (reduce axioms: can any be derived instead of asserted?)" : " ✓"}`);
}
// machine-readable line for the sign-on-change gate
console.log(`::axiom-digest::${digest}`);
process.exit(max !== undefined && list.length > max ? 1 : 0);
