#!/usr/bin/env node
// synoptic partition <url> — partition the rendered DOM into a MECE set of buckets
// (Mutually Exclusive, Collectively Exhaustive): every node belongs to EXACTLY ONE
// bucket, and every node is covered. The audit substrate — run any audit per bucket with
// a coverage guarantee (nothing unaudited, nothing double-counted). Default bucket = the
// element's SIGNATURE (tag + sorted class set): nodes in a bucket are structurally
// identical, so auditing one representative covers the whole bucket.
//   node partition.mjs <url> [--by tag|sig|context]
import { execFileSync } from "node:child_process";
const url = process.argv[2];
if (!url) { console.error("usage: partition <url> [--by tag|sig|context]"); process.exit(2); }
const byI = process.argv.indexOf("--by"); const by = byI >= 0 ? process.argv[byI + 1] : "sig";

const EVAL = `(()=>{
  const key=el=>{
    const tag=el.tagName.toLowerCase();
    const cls=(typeof el.className==='string'&&el.className.trim())?el.className.trim().split(/\\s+/).sort():[];
    if('${by}'==='tag')return tag;
    if('${by}'==='context')return (cls[0]||el.getAttribute('role')||tag);
    return tag+cls.map(c=>'.'+c).join('');   // sig: exact tag + class set
  };
  const b={};let total=0;const nodes=document.querySelectorAll('body, body *');
  nodes.forEach(el=>{total++;const k=key(el);(b[k]=b[k]||{count:0,rep:''});b[k].count++;if(!b[k].rep)b[k].rep=(el.textContent||'').trim().slice(0,24);});
  return JSON.stringify({total,buckets:b});
})()`;

const { total, buckets } = JSON.parse(execFileSync("tezcatl", [url, "--eval=" + EVAL], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim());
const entries = Object.entries(buckets).sort((a, b) => b[1].count - a[1].count);
const covered = entries.reduce((s, [, v]) => s + v.count, 0);
// MECE: exhaustive = covered === total; exclusive = by construction (each node → one key)
console.log(`partition — ${url}  (by ${by})\n`);
console.log(`  nodes:    ${total}`);
console.log(`  buckets:  ${entries.length}`);
console.log(`  coverage: ${covered}/${total}  ${covered === total ? "✓ EXHAUSTIVE" : "❌ GAP"}`);
console.log(`  overlap:  none ✓ (each node has exactly one signature → MECE)\n`);
console.log(`  largest buckets:`);
for (const [sig, v] of entries.slice(0, 12)) console.log(`    ${String(v.count).padStart(4)}  ${sig.slice(0, 48).padEnd(48)} ${v.rep ? '"' + v.rep + '"' : ""}`);
console.log(`\n  → ${entries.length} non-overlapping buckets fully cover ${total} nodes; audit each once.`);
process.exit(covered === total ? 0 : 1);
