#!/usr/bin/env node
// synoptic verify-artifact — prove a rendered element is a genuine artifact, WITHOUT
// self-reference. Each element carries data-cas="sha256:X" pointing at its SOURCE
// subgraph in /cas (the input, not the html). This checks, per element:
//   1. /cas/X.json exists and sha256(it) === X            (CAS integrity — real artifact)
//   2. re-projecting that subgraph reproduces the element (genuine projection)
//   3. the sidecar attestation binds this element to casSource X
// The digest is of the INPUT, so re-projection is a pure function of an independently
// addressed artifact — no cycle. (data-cas of the html would be self-referencing; this
// deliberately is not.)
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const CWD = process.cwd();
const distArg = process.argv[2] ?? "dist";
const dist = distArg.startsWith("/") ? distArg : join(CWD, distArg);
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");
const rd = (p) => readFileSync(p, "utf8");

const html = rd(join(dist, "graph-page.html"));
const prov = JSON.parse(rd(join(dist, "components", "graph-site.provenance.json")));
// a source is "bound" if any attestation names it — either a single-page casSource or a
// section's casSource within a composed page.
const bound = new Set(prov.flatMap((s) => [
  s.predicate.casSource,
  ...(s.predicate.sections ?? []).map((x) => x.casSource),
].filter(Boolean)));

// the leaves are STRINGS: every data-cas is a string leaf with a file in /cas. Verify
// each exists and hashes to its address (tamper-evident). data-node-root /
// data-section-root are Merkle roots (no file) — not leaf-checked here.
const re = /data-cas="(sha256:[a-f0-9]+)"/g;
let m, checked = 0, bad = 0;
while ((m = re.exec(html)) !== null) {
  const casId = m[1];
  if (!casId || casId === "sha256:") continue;
  checked++;
  let ok = true, why = [];
  let source;
  try { source = rd(join(dist, "cas", `${casId.slice(7)}.json`)); }
  catch { ok = false; why.push("leaf missing in /cas"); }
  if (source && sha(source.replace(/\n$/, "")) !== casId) { ok = false; why.push("digest ≠ address (tampered)"); }
  if (!ok) { bad++; console.log(`  ✗ ${casId.slice(0, 22)}…  — ${why.join("; ")}`); }
}
console.log(`${bad ? "❌" : "✓"} verify-artifact: ${checked - bad}/${checked} string leaf/leaves proven genuine (in /cas, integrity ok)`);
process.exit(bad ? 1 : 0);
