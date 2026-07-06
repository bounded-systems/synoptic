#!/usr/bin/env node
// synoptic css-project <url> — project a live page's computed CSS into a NAMED,
// content-addressed token set. Renders in tezcatl, and for each element records its
// CONTEXT (class > role > tag) + key design properties. Each (context, property, value)
// becomes a semantic token NAMED by its context (e.g. hero.fg, body.bg, link.color); the
// value is a CAS atom; if it equals a declared --primitive it's an ALIAS to it (derivable),
// else a new atom to declare (axiom). The semantic layer, derived from real usage.
//   node css-project.mjs <url> [--out css-tokens.json]
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const url = process.argv[2];
if (!url) { console.error("usage: css-project <url> [--out file]"); process.exit(2); }
const outI = process.argv.indexOf("--out"); const out = outI >= 0 ? process.argv[outI + 1] : null;
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

// property -> short role name for the token
const ROLE = { "color": "fg", "background-color": "bg", "border-top-color": "border",
  "font-family": "font", "font-size": "size", "font-weight": "weight", "line-height": "leading",
  "letter-spacing": "tracking", "padding-top": "pad", "border-radius": "radius", "row-gap": "gap",
  "box-shadow": "shadow", "text-decoration-color": "underline" };
const KEYS = Object.keys(ROLE);

// only the RENDERED tree (body subtree, actually displayed + non-empty) — no head/meta/
// script defaults, no display:none noise.
const EXTRACT = `(()=>{const KEYS=${JSON.stringify(KEYS)};const seen={};document.querySelectorAll('body, body *').forEach(el=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||el.getClientRects().length===0)return;let ctx=(typeof el.className==='string'&&el.className.trim())?el.className.trim().split(/\\s+/)[0]:(el.getAttribute('role')||el.tagName.toLowerCase());ctx=ctx.replace(/[^a-z0-9-]/gi,'').toLowerCase()||'el';for(const p of KEYS){const v=cs.getPropertyValue(p);if(!v)continue;const k=ctx+'|'+p;(seen[k]=seen[k]||[]);if(seen[k].indexOf(v)<0)seen[k].push(v);}});const rs=getComputedStyle(document.documentElement);const tokens={};for(let i=0;i<rs.length;i++){const p=rs[i];if(p.indexOf('--')===0)tokens[p]=rs.getPropertyValue(p).trim();}return JSON.stringify({seen,tokens});})()`;

const data = JSON.parse(execFileSync("tezcatl", [url, "--eval=" + EXTRACT], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim());
const valToTok = new Map();
for (const [name, v] of Object.entries(data.tokens || {})) if (!valToTok.has(v)) valToTok.set(v, name);
const merkleRoot = (hs) => {
  if (!hs.length) return sha("");
  let lvl = hs.map((h) => (h.startsWith("sha256:") ? h : "sha256:" + h));
  while (lvl.length > 1) { const nx = []; for (let i = 0; i < lvl.length; i += 2) nx.push(sha(lvl[i] + (lvl[i + 1] ?? lvl[i]))); lvl = nx; }
  return lvl[0];
};

// CAS keys and values SEPARATELY (deduped); a declaration = merkle(keyAtom, valueAtom);
// merkle declarations up context → page. Keys + values are the leaves.
const keys = new Map(), values = new Map(), decls = [], byCtx = {};
for (const [k, vals] of Object.entries(data.seen)) {
  const [ctx, prop] = k.split("|");
  vals.forEach((v, i) => {
    const keyStr = `${ctx}.${ROLE[prop]}${vals.length > 1 ? "." + (i + 1) : ""}`;
    const keyAddr = sha(keyStr), valAddr = sha(v);
    keys.set(keyStr, keyAddr); values.set(v, valAddr);
    const declAddr = merkleRoot([keyAddr, valAddr]);
    decls.push({ key: keyStr, value: v, keyAddr, valAddr, declAddr, aliasOf: valToTok.get(v) || valToTok.get(v.trim()) || null });
    (byCtx[ctx] ??= []).push(declAddr);
  });
}
const ctxRoots = Object.entries(byCtx).map(([ctx, ds]) => ({ ctx, root: merkleRoot([...new Set(ds)]), decls: ds.length }));
const pageRoot = merkleRoot(ctxRoots.map((c) => c.root));
const distinctDecls = new Set(decls.map((d) => d.declAddr)).size;
const aliased = decls.filter((d) => d.aliasOf).length;

console.log(`css-project — ${url}\n`);
console.log(`  CAS'd SEPARATELY (the leaves):`);
console.log(`    distinct KEYS   (context.role): ${keys.size}`);
console.log(`    distinct VALUES:                ${values.size}   (${aliased ? decls.filter((d) => d.aliasOf).length + " decls alias a primitive" : ""})`);
console.log(`  MERKLED UP:`);
console.log(`    declarations = merkle(key,val): ${decls.length}  (${distinctDecls} distinct)`);
console.log(`    contexts:                       ${ctxRoots.length}`);
console.log(`    PAGE ROOT:                      ${pageRoot.slice(0, 26)}…\n`);
console.log(`  e.g. declaration = merkle(keyAtom, valueAtom):`);
for (const d of decls.slice(0, 8))
  console.log(`    ${d.key.padEnd(16)} key ${d.keyAddr.slice(7, 15)} ⊕ val ${d.valAddr.slice(7, 15)} → ${d.declAddr.slice(7, 19)}${d.aliasOf ? "  (val = " + d.aliasOf + ")" : ""}`);
if (out) {
  const casDir = out.replace(/\.json$/, "") + ".cas"; mkdirSync(casDir, { recursive: true });
  const put = (addr, obj) => writeFileSync(join(casDir, addr.slice(7) + ".json"), JSON.stringify(obj) + "\n");
  for (const [s, a] of keys) put(a, { kind: "key", value: s });
  for (const [s, a] of values) put(a, { kind: "value", value: s });
  for (const d of decls) put(d.declAddr, { kind: "declaration", key: d.keyAddr, value: d.valAddr });
  writeFileSync(out, JSON.stringify({ url, pageRoot, contexts: ctxRoots, keys: [...keys].map(([v, a]) => ({ address: a, value: v })), values: [...values].map(([v, a]) => ({ address: a, value: v, token: valToTok.get(v) || null })), declarations: decls }, null, 2) + "\n");
  console.log(`\n  → ${out} + ${casDir}/ (${keys.size + values.size + distinctDecls} CAS atoms; page root commits all)`);
}
