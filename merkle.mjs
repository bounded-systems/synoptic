#!/usr/bin/env node
// synoptic merkle — the org as one content-addressed folder. Each repo's HEAD commit
// IS a git Merkle root (git is a Merkle DAG); this builds a Merkle tree OVER the repo
// roots → one org digest committing to the ENTIRE org state. Any change anywhere moves
// the root; an inclusion proof shows a repo is under it. The top of the invalidation
// graph, and a single signable attestation of "the org, right now."
//
//   node merkle.mjs [--org bounded-systems] [--prove <repo>]
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const argv = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
const org = argv("--org") ?? "bounded-systems";
const prove = argv("--prove");
const H = (s) => createHash("sha256").update(s).digest("hex");

// one GraphQL call: every repo + its HEAD commit oid (its own git Merkle root)
const q = `query($org:String!){organization(login:$org){repositories(first:100,orderBy:{field:NAME,direction:ASC}){nodes{name isArchived defaultBranchRef{target{oid}}}}}}`;
const res = spawnSync("gh", ["api", "graphql", "-f", `query=${q}`, "-F", `org=${org}`], { encoding: "utf8" });
if (res.status !== 0) { console.error(res.stderr); process.exit(2); }
const nodes = JSON.parse(res.stdout).data.organization.repositories.nodes
  .filter((r) => r.defaultBranchRef)
  .map((r) => ({ name: r.name, oid: r.defaultBranchRef.target.oid }))
  .sort((a, b) => a.name.localeCompare(b.name));

// leaves = H(name:oid); build the binary Merkle tree, promoting the odd one.
let level = nodes.map((r) => ({ names: [r.name], hash: H(`${r.name}:${r.oid}`) }));
const leaves = level.map((l) => l.hash);
const proofFor = prove ? nodes.findIndex((r) => r.name === prove) : -1;
let idx = proofFor, proof = [];
while (level.length > 1) {
  const next = [];
  for (let i = 0; i < level.length; i += 2) {
    const l = level[i], r = level[i + 1] ?? level[i];
    if (idx === i || idx === i + 1) proof.push({ sibling: (idx === i ? (level[i + 1] ?? level[i]) : level[i]).hash, side: idx === i ? "right" : "left" });
    next.push({ names: [...l.names, ...(level[i + 1] ? r.names : [])], hash: H(l.hash + r.hash) });
  }
  if (idx >= 0) idx = Math.floor(idx / 2);
  level = next;
}
const root = level[0].hash;

// VALIDATOR: recompute the live root and compare to a pinned org SHA. If it matches,
// the ENTIRE org state is unchanged (one comparison invalidates or clears everything);
// if not, something moved — the cache-invalidation trigger for the whole org.
const verify = argv("--verify");
if (verify) {
  const want = verify.replace(/^sha256:/, "");
  const ok = root === want;
  if (ok) {
    console.log(`✅ org root matches sha256:${want.slice(0, 24)}… — ${nodes.length} repos unchanged`);
  } else {
    console.log(`❌ org root MISMATCH — something in the org moved`);
    console.log(`   pinned  sha256:${want.slice(0, 32)}…`);
    console.log(`   live    sha256:${root.slice(0, 32)}…`);
  }
  process.exit(ok ? 0 : 1);
}

// PROOF VALIDATOR: verify an inclusion proof recomputes the root (no org needed).
const check = argv("--check"); // "<repo>:<oid>" leaf to verify against --root with --proof
if (check) {
  const root0 = (argv("--root") ?? "").replace(/^sha256:/, "");
  const sides = JSON.parse(argv("--proof") ?? "[]"); // [{sibling, side}]
  let acc = H(check);
  for (const p of sides) acc = p.side === "right" ? H(acc + p.sibling) : H(p.sibling + acc);
  const ok = acc === root0;
  console.log(ok ? `✅ inclusion verified — ${check.split(":")[0]} is under the org root` : `❌ inclusion FAILED — recomputed sha256:${acc.slice(0, 24)}… ≠ root`);
  process.exit(ok ? 0 : 1);
}

console.log(`org merkle root (${org}): sha256:${root}`);
console.log(`  ${nodes.length} repos · Merkle over each repo's HEAD commit (its own git root)`);
console.log(`  derivable-only: this value can't be stored in the org (writing it moves a repo → moves the root). Hold this function; attest the value externally (Rekor).`);
if (proofFor >= 0) {
  console.log(`\ninclusion proof — "${prove}" @ ${nodes[proofFor].oid.slice(0, 10)} is under the org root:`);
  for (const p of proof) console.log(`  ${p.side.padEnd(5)} sibling ${p.sibling.slice(0, 16)}…`);
  console.log(`  (${proof.length} hashes → root; verifies without the other ${nodes.length - 1} repos)`);
} else if (prove) {
  console.log(`\n⚠ "${prove}" not found in ${org}`);
}
