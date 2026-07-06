#!/usr/bin/env node
// synoptic css-extract <url> — extract the COMPLETE computed-CSS state of a live page via
// tezcatl (WebKit): every element's every property, INCLUDING browser defaults, deduped
// into the atom set. "Declare all leaves" for CSS — nothing implicit; every value (default
// or authored) becomes a content-addressed atom. Cross-references declared design tokens
// so you see which computed values ARE token atoms vs raw.
//   node css-extract.mjs <url> [--out css-atoms.json]
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const url = process.argv[2];
if (!url) { console.error("usage: css-extract <url> [--out file]"); process.exit(2); }
const outI = process.argv.indexOf("--out"); const out = outI >= 0 ? process.argv[outI + 1] : null;
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

// in-page: computed styles of every element + the declared :root custom properties (tokens)
const EXTRACT = `(()=>{const props={};const els=document.querySelectorAll('*');els.forEach(el=>{const cs=getComputedStyle(el);for(let i=0;i<cs.length;i++){const p=cs[i];const v=cs.getPropertyValue(p);(props[p]=props[p]||[]);if(props[p].indexOf(v)<0)props[p].push(v);}});const rs=getComputedStyle(document.documentElement);const tokens={};for(let i=0;i<rs.length;i++){const p=rs[i];if(p.indexOf('--')===0)tokens[p]=rs.getPropertyValue(p).trim();}return JSON.stringify({elements:els.length,props,tokens});})()`;

const data = JSON.parse(execFileSync("tezcatl", [url, "--eval=" + EXTRACT], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim());
const props = data.props, tokens = data.tokens || {};
// value -> token name (so we can label computed values that ARE a declared token)
const valToTok = new Map();
for (const [name, v] of Object.entries(tokens)) if (!valToTok.has(v)) valToTok.set(v, name);

const atoms = new Map(); // value -> { addr, value, props:Set, token? }
let pairs = 0;
for (const [p, vals] of Object.entries(props)) for (const v of vals) {
  pairs++;
  const a = atoms.get(v) ?? { addr: sha(v), value: v, props: new Set(), token: valToTok.get(v) || valToTok.get(v.trim()) };
  a.props.add(p); atoms.set(v, a);
}
const list = [...atoms.values()];
const asToken = list.filter((a) => a.token).length;
console.log(`css-extract — ${url}`);
console.log(`  elements:                ${data.elements}`);
console.log(`  properties (incl defaults): ${Object.keys(props).length}`);
console.log(`  distinct (property,value):  ${pairs}`);
console.log(`  distinct VALUE atoms:       ${atoms.size}`);
console.log(`  declared tokens (:root --): ${Object.keys(tokens).length}`);
console.log(`  atoms that ARE a token:     ${asToken}  ✓`);
console.log(`  atoms NOT a token (default/raw): ${atoms.size - asToken}  ⚠ candidates to declare\n`);
console.log(`  e.g. computed value → token:`);
for (const a of list.filter((a) => a.token).slice(0, 6)) console.log(`     ${a.value.slice(0, 28).padEnd(28)} = ${a.token}  (${[...a.props].slice(0, 2).join(", ")})`);
console.log(`  e.g. raw/default atoms (no token):`);
for (const a of list.filter((a) => !a.token && /^(#|rgb|\d)/.test(a.value)).slice(0, 6)) console.log(`     ${a.value.slice(0, 28).padEnd(28)} (${[...a.props].slice(0, 2).join(", ")})`);
if (out) {
  writeFileSync(out, JSON.stringify({ url, elements: data.elements, tokens, atoms: list.map((a) => ({ address: a.addr, value: a.value, token: a.token || null, properties: [...a.props] })) }, null, 2) + "\n");
  console.log(`\n  → ${out}  (${atoms.size} atoms)`);
}
