#!/usr/bin/env node
// synoptic scale — OUR pinned per-axis scale. Each axis is quantized to fixed steps that are
// a COMFORTABLE MULTIPLE of the JND ("less granular, more pinned"): adjacent steps are clearly
// distinct, not barely. Snaps any color onto the grid. Grounded: the JND per axis (§2).
//
//   axis  JND (§2)          our step         → levels    (step / JND)
//   L     ~2%               5%               21 (0..100)   2.5×
//   C     ~10% of ceiling   25% of ceiling    5 (0..100)   ~2.5×   (gamut-relative)
//   H     ~3° (max chroma)  15°              24 (0..345)   5×
//   α     ~7%               25%               5 (0..100)   ~3.5×
import { canonicalizeTyped } from "./canonicalize.mjs";
const oklab = (L, C, h) => ({ L: L / 100, a: C * Math.cos(h * Math.PI / 180), b: C * Math.sin(h * Math.PI / 180) });
const lms = ({ L, a, b }) => [(L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, (L - 0.0894841775 * a - 1.2914855480 * b) ** 3];
const lin = ([l, m, s]) => [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
const inG = (L, C, h) => lin(lms(oklab(L, C, h))).every((c) => c >= -0.001 && c <= 1.001);
const ceil = (L, h) => { let lo = 0, hi = 0.4; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; inG(L, m, h) ? lo = m : hi = m; } return lo; };
const snap = (v, step) => Math.round(v / step) * step;

export const SCALE = { L: { step: 5, n: 21 }, Cpct: { step: 25, n: 5 }, H: { step: 15, n: 24 }, Apct: { step: 25, n: 5 } };
export function quantize(t) {
  if (t.alpha === 0) return { L: 0, Cpct: 0, H: 0, Apct: 0, transparent: true, oklch: "oklch(0% 0 0 / 0)" };
  const L = snap(t.l, 5);
  const Apct = snap(t.alpha * 100, 25);
  if (t.c < 0.02) return { L, Cpct: 0, H: null, Apct, neutral: true, oklch: `oklch(${L}% 0 0 / ${Apct / 100})` };
  const H = (snap(t.h, 15)) % 360;
  const cap = ceil(L, H) || 1;
  const Cpct = Math.min(100, snap(100 * t.c / cap, 25));
  const C = +(Cpct / 100 * cap).toFixed(4);
  return { L, Cpct, H, Apct, oklch: `oklch(${L}% ${C} ${H} / ${Apct / 100})` };
}
if (process.argv[1] && process.argv[1].includes("scale")) {
  const { readFileSync } = await import("node:fs");
  const src = process.argv[2];
  console.log("synoptic pinned scale:  L 5% (21) · C 25%-of-gamut (5) · H 15° (24) · α 25% (5)\n");
  if (!src || src === "--demo") {
    for (const hex of ["#228B22", "#800000", "#663399", "#F0F8FF", "#16221C"]) {
      const q = quantize(canonicalizeTyped(hex)); console.log("  " + hex.padEnd(9) + "→ " + q.oklch + (q.neutral ? "  (neutral)" : q.transparent ? "  (transparent)" : `  [L${q.L} C${q.Cpct}% H${q.H}° α${q.Apct}%]`));
    }
  } else {
    const data = JSON.parse(readFileSync(src, "utf8"));
    const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    const cs = data.values.map((e) => parse(e.value)).filter((t) => t.$type === "color");
    const cells = new Set(cs.map((t) => JSON.stringify(quantize(t)).replace(/"oklch[^,]*/, "")));
    console.log("  " + cs.length + " colors → " + cells.size + " distinct grid cells (the pinning collapses near-neighbors)\n");
    console.log("  total addressable grid: 21 L × 24 H × 4 C × 4 α (chromatic) + 21 L × 4 α (neutral) + 1 (transparent)");
    console.log("  = " + (21 * 24 * 4 * 4 + 21 * 4 + 1).toLocaleString() + " pinned colors — the whole space, finite.");
  }
}
