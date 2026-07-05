#!/usr/bin/env node
// synoptic coverage — the anti-circumvention gate. Two directions, both failures:
//
//   UNCOVERED — data of a known kind is present, but its layer isn't declared /
//               validated. This is the attack you named: add unproven data by
//               quietly dropping (or never adding) its validation. FAIL.
//   DEAD      — a layer is declared but no data feeds it. A rule that validates
//               nothing — a design system going unused. WARN.
//
//   node coverage.mjs [--strict]   (from a site's root; reads synoptic.config.json)
//
// The DETECTORS live HERE, in the engine, not in the site — so a site cannot
// weaken coverage in the same change that adds the data. Data and the rule that
// governs it stay in separate authorities.
import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CWD = process.cwd();
const strict = process.argv.includes("--strict");
const has = (rel) => existsSync(join(CWD, rel));
const hasGlob = (dir, ext) => { try { return readdirSync(join(CWD, dir)).some((f) => f.endsWith(ext)); } catch { return false; } };

// Data-kind → the layer that MUST cover it when the data is present. Engine-owned.
const DETECTORS = [
  { layer: "tokens", present: () => ["content/strings.json", "data/copy.json", "data/audit/grounding.json"].some(has),
    why: "content tokens / proof atoms are present — they must be grounded" },
  { layer: "markdown", present: () => hasGlob("blog", ".md") || hasGlob("posts", ".md"),
    why: "composed markdown is present — it must pass the prose gates" },
  { layer: "jsonld", present: () => has("contract/jsonld.shapes.ttl") || has("dist/json.ld"),
    why: "a knowledge graph is emitted — it must validate against its shapes" },
  { layer: "website", present: () => has("dist"),
    why: "a built site is present — it must pass the website gates" },
];

const config = JSON.parse(await readFile(join(CWD, "synoptic.config.json"), "utf8"));
const declared = new Set(Object.keys(config.layers ?? {}));

const uncovered = [], dead = [];
for (const d of DETECTORS) {
  const present = d.present();
  const covers = declared.has(d.layer);
  if (present && !covers) uncovered.push(d);
  if (!present && covers) dead.push(d.layer);
}

console.log(`synoptic coverage — ${config.site ?? CWD}\n`);
for (const d of uncovered) {
  console.log(`❌ UNCOVERED  ${d.layer} — ${d.why}`);
  console.log(`             data is present but layer "${d.layer}" is not declared in synoptic.config.json`);
}
for (const l of dead) console.log(`⚠  DEAD       ${l} — declared but no data feeds it (unused rule)`);
if (!uncovered.length && !dead.length) console.log("✓ every present data kind is covered; no dead rules");

console.log(`\ncovered: ${[...declared].filter((l) => !dead.includes(l)).join(", ") || "(none)"} · uncovered: ${uncovered.length} · dead: ${dead.length}`);
// UNCOVERED always fails (it's the attack); DEAD fails only under --strict.
process.exit(uncovered.length || (strict && dead.length) ? 1 : 0);
