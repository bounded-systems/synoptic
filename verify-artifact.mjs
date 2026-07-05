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

const re = /data-page="([^"]+)"[^>]*data-cas="(sha256:[a-f0-9]+)"/g;
let m, checked = 0, bad = 0;
while ((m = re.exec(html)) !== null) {
  const [, page, casId] = m;
  checked++;
  let ok = true, why = [];
  // 1. CAS integrity: the source exists and hashes to its address
  let source;
  try { source = rd(join(dist, "cas", `${casId.slice(7)}.json`)); }
  catch { ok = false; why.push("source missing in /cas"); }
  if (source && sha(source.replace(/\n$/, "")) !== casId) { ok = false; why.push("digest ≠ address (tampered)"); }
  // 3. attestation binds this element to the source
  if (!bound.has(casId)) { ok = false; why.push("no attestation binds this casSource"); }
  if (ok) console.log(`  ✓ ${page}  ← ${casId.slice(0, 20)}…  (real artifact, bound, integrity ok)`);
  else { bad++; console.log(`  ✗ ${page}  ${casId.slice(0, 20)}…  — ${why.join("; ")}`); }
}
console.log(`\n${bad ? "❌" : "✓"} verify-artifact: ${checked - bad}/${checked} element(s) proven genuine (source in /cas, integrity ok, attested)`);
process.exit(bad ? 1 : 0);
