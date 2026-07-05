#!/usr/bin/env node
// synoptic ledger — follow every grounding pointer to the BOTTOM and report the true
// axioms (the empirical `#print axioms`). Flags axiom LAUNDERING: a claim labeled
// grounded/derivable whose chain actually terminates in a bare assertion — here or
// in another repo. Indirection is not proof; the axiom is at the bottom of the chain.
//
//   node ledger.mjs <grounding.model.json> [--strict]
//
// model: { "<claim>": { grounds, ... } }
//   grounds "count" | "benchmark" | "digest" | "repo-count"  → RE-DERIVABLE (real; needs `source`)
//   grounds "signed-axiom"                                    → an explicit human-signed axiom (real; at the bottom)
//   grounds "assertion"                                       → a bare assertion (AXIOM; `where` may name another repo)
//   grounds "derived"                                         → follow `from` (another claim)
import { readFile } from "node:fs/promises";

const path = process.argv[2];
const strict = process.argv.includes("--strict");
if (!path) { console.error("usage: ledger <grounding.model.json> [--strict]"); process.exit(2); }
const model = JSON.parse(await readFile(path, "utf8"));

const REDERIVABLE = new Set(["count", "benchmark", "digest", "repo-count"]);

// resolve a claim to its terminus, following `derived` chains; detect cycles.
function terminus(claim, seen = new Set()) {
  if (seen.has(claim)) return { claim, grounds: "cycle" };
  seen.add(claim);
  const g = model[claim];
  if (!g) return { claim, grounds: "assertion", where: "undeclared" }; // no pointer ⇒ bare axiom
  if (g.grounds === "derived") return terminus(g.from, seen);
  return { claim, ...g };
}

const axioms = [], laundered = [], derived = [];
for (const [claim, g] of Object.entries(model)) {
  const t = terminus(claim);
  const labelledStrong = g.grounds === "derived" || REDERIVABLE.has(g.grounds);
  if (REDERIVABLE.has(t.grounds)) {
    derived.push({ claim, via: t.grounds, source: t.source });
    if (t.grounds !== "digest" && !t.source) laundered.push({ claim, why: `grounds "${t.grounds}" with no source — unverifiable` });
  } else if (t.grounds === "signed-axiom") {
    axioms.push({ claim, kind: "signed axiom", terminus: t.claim });
  } else {
    // terminus is a bare assertion — this is an axiom no matter how many hops
    axioms.push({ claim, kind: "assertion", terminus: t.claim, where: t.where });
    if (labelledStrong && claim !== t.claim) {
      laundered.push({ claim, why: `labelled derivable but bottoms out in an assertion (${t.where ?? "here"}) at "${t.claim}"` });
    }
  }
}

console.log(`synoptic ledger — ${Object.keys(model).length} claim(s)\n`);
console.log(`TRUE AXIOMS (the bottom — ${axioms.length}):`);
for (const a of axioms) console.log(`  • ${a.claim}${a.terminus !== a.claim ? ` → ${a.terminus}` : ""}  [${a.kind}${a.where ? ", " + a.where : ""}]`);
console.log(`\nDERIVED (${derived.length}): ${derived.map((d) => `${d.claim}(${d.via})`).join(", ") || "—"}`);
if (laundered.length) {
  console.log(`\n❌ LAUNDERING (${laundered.length}):`);
  for (const l of laundered) console.log(`  • ${l.claim} — ${l.why}`);
}
console.log(`\naxioms: ${axioms.length} (${axioms.filter((a) => a.kind === "signed axiom").length} signed, ${axioms.filter((a) => a.kind === "assertion").length} unsigned) · derived: ${derived.length} · laundered: ${laundered.length}`);
process.exit(laundered.length ? 1 : 0);
