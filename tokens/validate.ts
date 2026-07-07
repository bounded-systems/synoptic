// Validate every generated token file against its layer schema. The schema is the spec: a
// non-conforming token fails here. Also checks the merkle invariant — every primitive-pair's
// $pairSha recomputes from its color hashes, and the root recomputes from the leaves.
import { z } from "zod";
import { ColorPair, PrimitiveColor, PropertyPair, PropertyToken } from "./schema.ts";
import { crypto } from "jsr:@std/crypto@^1/crypto";
import { encodeHex } from "jsr:@std/encoding@^1/hex";

async function sha(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return encodeHex(new Uint8Array(d));
}

function entries(file: string, wrapper: string): [string, unknown][] {
  const doc = JSON.parse(Deno.readTextFileSync(new URL(file, import.meta.url))) as Record<string, Record<string, unknown>>;
  return Object.entries(doc[wrapper]).filter(([k]) => !k.startsWith("$"));
}

function check(file: string, wrapper: string, schema: z.ZodTypeAny): boolean {
  const bad: string[] = [];
  let ok = 0;
  for (const [k, v] of entries(file, wrapper)) {
    const r = schema.safeParse(v);
    if (r.success) ok++;
    else bad.push(`${k}: ${r.error.issues[0]?.message}`);
  }
  console.log(`  ${bad.length ? "✗" : "✓"} ${file.padEnd(28)} ${ok} valid` + (bad.length ? `, ${bad.length} INVALID (${bad[0]})` : ""));
  return bad.length === 0;
}

let allOk = true;
console.log("schema conformance:");
allOk = check("examples/primitives.derived.json", "primitive", PrimitiveColor) && allOk;
allOk = check("examples/primitive-pairs.json", "primitive-pairs", ColorPair) && allOk;
allOk = check("examples/property.tokens.json", "property", PropertyToken) && allOk;
allOk = check("examples/contrast-pairs.json", "contrast-pairs", PropertyPair) && allOk;

// merkle invariant: recompute each $pairSha and the root
console.log("\nmerkle invariant:");
const pp = JSON.parse(Deno.readTextFileSync(new URL("examples/primitive-pairs.json", import.meta.url)));
const pairs = Object.entries(pp["primitive-pairs"]).filter(([k]) => !k.startsWith("$")) as [string, ColorPair][];
let merkleOk = true;
for (const [k, p] of pairs) {
  const recomputed = (await sha(Object.values(p.$colorShas).sort().join(":"))).slice(0, 12);
  if (recomputed !== p.$pairSha) { console.log(`  ✗ ${k}: pairSha ${p.$pairSha} ≠ recomputed ${recomputed}`); merkleOk = false; }
}
// root
let lvl = pairs.map(([, p]) => p.$pairSha).sort();
while (lvl.length > 1) {
  const nx: string[] = [];
  for (let i = 0; i < lvl.length; i += 2) nx.push(await sha(lvl[i] + (lvl[i + 1] ?? lvl[i])));
  lvl = nx;
}
const rootOk = lvl[0] === pp["primitive-pairs"].$merkleRoot;
console.log(`  ${merkleOk ? "✓" : "✗"} ${pairs.length} pairSha recompute` + `   ${rootOk ? "✓" : "✗"} merkle root ${rootOk ? "matches" : "MISMATCH"}`);

if (!allOk || !merkleOk || !rootOk) Deno.exit(1);
console.log("\nall layers conform; merkle holds.");
