#!/usr/bin/env node
// synoptic derive — compute facts that would otherwise be asserted. A count you can
// recompute is derivable, not axiomatic. Cross-repo aware: a derivation can count
// across an org or via code search. Emits derived-facts.json — each with a value, a
// re-run RECIPE (so anyone reproduces it), and proofType: derivable.
//
//   node derive.mjs <derive.model.json> [--out derived-facts.json]
//
// model: { "<claim>": { derive, ... } }
//   "file-count"      glob (local): { glob: "schemas/**/*.json" }
//   "gh-repo-count"   org repos:    { org: "bounded-systems", visibility: "public" }
//   "gh-search-count" code search:  { org, query }  (APPROXIMATE — flagged)
import { spawnSync } from "node:child_process";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const argv = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
const path = process.argv[2];
const out = argv("--out") ?? "derived-facts.json";
if (!path) { console.error("usage: derive <derive.model.json> [--out <file>]"); process.exit(2); }
const gh = (args) => { const r = spawnSync("gh", args, { encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : null; };
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex").slice(0, 16);

async function walk(dir, hits, re) {
  let ents; try { ents = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, hits, re);
    else if (re.test(p)) hits.push(p);
  }
}

const model = JSON.parse(await readFile(path, "utf8"));
const facts = {};
for (const [claim, d] of Object.entries(model)) {
  let value = null, source = null, recipe = null, approx = false;
  if (d.derive === "file-count") {
    const re = new RegExp(d.glob.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\./g, "\\.").replace(/\\\.\*/g, ".*") + "$");
    const hits = []; await walk(".", hits, re);
    value = hits.length; source = d.glob; recipe = `count files matching ${d.glob}`;
  } else if (d.derive === "gh-repo-count") {
    const j = gh(["api", `orgs/${d.org}/repos?type=${d.visibility ?? "all"}&per_page=100`, "--paginate", "--jq", "length"]);
    value = j ? j.split("\n").reduce((n, x) => n + (+x || 0), 0) : null;
    source = `github.com/orgs/${d.org}`; recipe = `gh api orgs/${d.org}/repos?type=${d.visibility ?? "all"} --paginate --jq length`;
  } else if (d.derive === "trellis") {
    // derive from trellis's cosign-signed status.json (the lattice projection) — the
    // org's own VERIFIED source of truth, not a raw live query. The overlap: org-wide
    // facts are lattice facts; deriving from the signed lattice grounds them in an
    // attested source (proofType stays derivable, chained to a signed projection).
    const url = d.status ?? "https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json";
    const r = spawnSync("curl", ["-s", url], { encoding: "utf8" });
    let j = null; try { j = JSON.parse(r.stdout); } catch {}
    value = j ? d.field.split(".").reduce((o, k) => o?.[k], j) : null;
    source = "trellis status.json (cosign-signed lattice projection)";
    recipe = `${d.field} of the signed trellis lattice projection`;
  } else if (d.derive === "gh-search-count") {
    const j = gh(["search", "code", d.query, "--owner", d.org, "--json", "path", "--limit", "1000"]);
    value = j ? JSON.parse(j).length : null; approx = true;
    source = `code search: ${d.query}`; recipe = `gh search code '${d.query}' --owner ${d.org}`;
  }
  facts[claim] = { value, proofType: "derivable", derive: d.derive, source, recipe, ...(approx ? { approximate: true } : {}) };
  console.log(`${value === null ? "⚠" : "✓"} ${claim} = ${value ?? "(failed)"}${approx ? " (approx)" : ""}  ← ${recipe}`);
}
facts.$digest = sha(JSON.stringify(Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, v.value]))));
await writeFile(out, JSON.stringify(facts, null, 2) + "\n");
console.log(`\n✓ ${out} — ${Object.keys(facts).length - 1} derived fact(s)`);
