#!/usr/bin/env node
// go over each color token: content-name + oklch + hue family + authored token, grouped,
// with ΔEOK perceptual near-duplicate flags (OKLab distance).
import { readFileSync } from "node:fs";
const data = JSON.parse(readFileSync(process.argv[2], "utf8"));
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const num = (x) => String(x).replace(/\./g, "_").replace(/^-/, "neg");
const name = (t) => `oklch-${num(t.l)}-${num(t.c)}-${num(t.h)}-${num(t.alpha)}`;
const HUES = [[29, "red"], [60, "orange"], [85, "amber"], [110, "yellow"], [130, "lime"], [145, "green"], [165, "teal"], [195, "cyan"], [230, "blue"], [264, "indigo"], [300, "violet"], [330, "magenta"], [350, "pink"]];
const hueName = (h) => { let b = "red", d = 999; for (const [a, n] of HUES) { const x = Math.min(Math.abs(h - a), 360 - Math.abs(h - a)); if (x < d) { d = x; b = n; } } return b; };
// oklch → oklab for ΔEOK
const lab = (t) => ({ L: t.l / 100, a: t.c * Math.cos(t.h * Math.PI / 180), b: t.c * Math.sin(t.h * Math.PI / 180) });
const dEOK = (p, q) => { const A = lab(p), B = lab(q); return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b); };

const colors = data.values.map((e) => ({ t: parse(e.value), token: e.token })).filter((x) => x.t.$type === "color");
colors.forEach((c) => { c.name = name(c.t); c.family = c.t.c < 0.02 ? (c.t.l >= 99 ? "white" : c.t.l <= 2 ? "black" : "gray") : hueName(c.t.h); });
// near-dupes
const near = [];
for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) {
  if (colors[i].t.alpha !== colors[j].t.alpha) continue;
  const d = dEOK(colors[i].t, colors[j].t);
  if (d < 0.025) near.push({ a: colors[i], b: colors[j], d });
}
const order = ["black", "gray", "white", "red", "orange", "amber", "yellow", "lime", "green", "teal", "cyan", "blue", "indigo", "violet", "magenta", "pink"];
colors.sort((x, y) => (order.indexOf(x.family) - order.indexOf(y.family)) || (x.t.l - y.t.l));
console.log(`${colors.length} color tokens — bounded.tools\n`);
let fam = null;
for (const c of colors) {
  if (c.family !== fam) { fam = c.family; console.log(`  ── ${fam} ──`); }
  const T = c.t;
  console.log(`  ${c.name.padEnd(30)} L${String(T.l).padStart(5)} C${String(T.c).padEnd(6)} H${String(T.h).padEnd(6)}${T.alpha < 1 ? " a" + T.alpha : "  "}${c.token ? "  " + c.token : ""}`);
}
console.log(`\n  perceptual near-duplicates (ΔEOK < 0.025) — candidates to merge:`);
if (!near.length) console.log("    none");
for (const n of near.sort((a, b) => a.d - b.d)) console.log(`    ΔE ${n.d.toFixed(4)}  ${n.a.name}  ≈  ${n.b.name}   (${n.a.token || "?"} ≈ ${n.b.token || "?"})`);
