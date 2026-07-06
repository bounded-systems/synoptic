#!/usr/bin/env node
// synoptic derive-palette <css-tokens.json> [--out dir] — factor a color palette into
// AXIOMS (irreducible base colors) + DERIVATIONS (each reconstructed from an axiom via a
// CSS Color 5 operation: color-mix tint/shade/fade, or relative-color oklch(from …)). Every
// derivation is proofType `derivable` — provably equal to its expression within ΔEOK. Only
// the axioms are "magic numbers" that need signing. Emits palette.css (axioms + derived).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const src = process.argv[2];
const outI = process.argv.indexOf("--out"); const OUT = outI >= 0 ? process.argv[outI + 1] : "/private/tmp/palette";
if (!src) { console.error("usage: derive-palette <css-tokens.json> [--out dir]"); process.exit(2); }
const data = JSON.parse(readFileSync(src, "utf8"));
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const numN = (x) => String(x).replace(/\./g, "_").replace(/^-/, "neg");
const nm = (t) => `oklch-${numN(t.l)}-${numN(t.c)}-${numN(t.h)}-${numN(t.alpha)}`;
const css = (t) => `oklch(${t.l}% ${t.c} ${t.h} / ${t.alpha})`;
const oklab = (t) => ({ L: t.l / 100, a: t.c * Math.cos(t.h * Math.PI / 180), b: t.c * Math.sin(t.h * Math.PI / 180) });
const dE = (p, q) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
const TOL = 0.02;
// X = mix(B, white(1,0,0), t): chroma scales by (1-t), L→B.L(1-t)+t
function asTint(B, X) { const bl = oklab(B), xl = oklab(X); const d = Math.abs(bl.a) > Math.abs(bl.b) ? bl.a : bl.b, xn = Math.abs(bl.a) > Math.abs(bl.b) ? xl.a : xl.b; if (Math.abs(d) < 1e-5) return null; const t = 1 - xn / d; if (t < 0.02 || t > 0.98) return null; return dE({ L: bl.L * (1 - t) + t, a: bl.a * (1 - t), b: bl.b * (1 - t) }, xl) < TOL ? t : null; }
// X = mix(B, black(0,0,0), t): everything scales by (1-t)
function asShade(B, X) { const bl = oklab(B), xl = oklab(X); const d = Math.abs(bl.a) > Math.abs(bl.b) ? bl.a : bl.b, xn = Math.abs(bl.a) > Math.abs(bl.b) ? xl.a : xl.b; if (Math.abs(d) < 1e-5) return null; const t = 1 - xn / d; if (t < 0.02 || t > 0.98) return null; return dE({ L: bl.L * (1 - t), a: bl.a * (1 - t), b: bl.b * (1 - t) }, xl) < TOL ? t : null; }
// relative-color pure L step: same C & H, different L
function asRelL(B, X) { const dh = Math.abs(((X.h - B.h + 540) % 360) - 180); if (Math.abs(X.c - B.c) < 0.004 && dh < 2 && Math.abs(X.l - B.l) > 0.5) return +(X.l - B.l).toFixed(2); return null; }

const cs = data.values.map((e) => parse(e.value)).filter((t) => t.$type === "color");
cs.sort((a, b) => b.c - a.c || a.l - b.l); // saturated first → axiom candidates
const axioms = [], derivations = [];
for (const X of cs) {
  if (X.alpha < 1) { const from = { ...X, alpha: 1 }; derivations.push({ X, kind: "fade", from, expr: `color-mix(in oklab, ${nm(from)}, transparent ${Math.round((1 - X.alpha) * 100)}%)` }); continue; }
  let found = null;
  for (const B of axioms) {
    let t;
    if ((t = asRelL(B, X)) != null) { found = { kind: "relative-L", from: B, expr: `oklch(from ${nm(B)} calc(l ${t > 0 ? "+ " + t : "- " + Math.abs(t)}) c h)` }; break; }
    if ((t = asTint(B, X)) != null) { found = { kind: "tint", from: B, expr: `color-mix(in oklab, ${nm(B)}, white ${Math.round(t * 100)}%)` }; break; }
    if ((t = asShade(B, X)) != null) { found = { kind: "shade", from: B, expr: `color-mix(in oklab, ${nm(B)}, black ${Math.round(t * 100)}%)` }; break; }
  }
  if (found) derivations.push({ X, ...found }); else axioms.push(X);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "palette.css"),
  `/* AXIOMS — irreducible base colors (the only 'magic numbers'; sign these). */\n:root {\n${axioms.map((a) => `  --${nm(a)}: ${css(a)};`).join("\n")}\n}\n\n/* DERIVED — provably reconstructable from axioms (proofType: derivable, CSS Color 5). */\n:root {\n${derivations.map((d) => `  --${nm(d.X)}: ${d.expr.replace(/oklch-[\d_neg-]+/g, (m) => "var(--" + m + ")")};`).join("\n")}\n}\n`);
const byKind = {}; for (const d of derivations) byKind[d.kind] = (byKind[d.kind] || 0) + 1;
console.log(`derive-palette — ${src}\n`);
console.log(`  ${cs.length} colors  →  ${axioms.length} AXIOMS  +  ${derivations.length} DERIVATIONS`);
console.log(`  derivations by kind: ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`  axiom fraction: ${Math.round(100 * axioms.length / cs.length)}%  (${cs.length - axioms.length} colors need no independent value)\n`);
console.log(`  AXIOMS (sign these):`);
for (const a of axioms.slice(0, 12)) console.log(`     --${nm(a)}`);
if (axioms.length > 12) console.log(`     … +${axioms.length - 12}`);
console.log(`\n  sample derivations:`);
for (const d of derivations.slice(0, 10)) console.log(`     ${nm(d.X).padEnd(28)} = ${d.expr}`);
console.log(`\n  → ${OUT}/palette.css`);
