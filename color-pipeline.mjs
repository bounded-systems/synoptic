#!/usr/bin/env node
// synoptic color-pipeline — derive colors by moving ONE AXIS AT A TIME, MULTIPLICATION ONLY.
// Every step: channel' = k · channel (a pure ratio; no additive offset, no axis coupling).
// Axis order H → L → C → α:
//   H  the AXIOM — committed once, the family identity (a hue can't be reached by ×k, so it
//      is chosen, not derived). Held for every derivation in the family.
//   L  ×k_L   lightness ratio   (one axis)
//   C  ×k_C   chroma ratio      (one axis) — result still gamut-clamped
//   α  ×k_α   alpha ratio       (one axis)
// So a whole hue-family = ONE axiom + per-color (k_L, k_C, k_α) triples of single-axis
// multiplies. Composable, invertible, perceptually-natural (ratios). Grounded: CSS Color 4/5
// (relative color calc(l * k)), Weber–Fechner (ratio steps), gamut.
const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const [bL, bC, bH] = opt("--base", "50,0.08,165").split(",").map(Number);   // the axiom
const Ls = opt("--l", "24,90").split(",").map(Number);
const cfrac = parseFloat(opt("--chroma", "0.5"));
const oklab = (L, C, h) => ({ L: L / 100, a: C * Math.cos(h * Math.PI / 180), b: C * Math.sin(h * Math.PI / 180) });
const lms = ({ L, a, b }) => [(L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, (L - 0.0894841775 * a - 1.2914855480 * b) ** 3];
const lin = ([l, m, s]) => [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
const inG = (L, C, h) => lin(lms(oklab(L, C, h))).every((c) => c >= -0.001 && c <= 1.001);
const maxC = (L, h) => { let lo = 0, hi = 0.4; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; inG(L, m, h) ? lo = m : hi = m; } return lo; };
const r = (n, d = 4) => { const f = 10 ** d; return Math.round(n * f) / f; };

console.log(`color-pipeline — axiom oklch(${bL}% ${bC} ${bH})   (one axis at a time · multiply only)\n`);
console.log(`  ▸ H = ${bH}°   AXIOM (committed once; a hue is chosen, not multiplied). Held below.\n`);
for (const L of Ls) {
  const kL = r(L / bL, 4);
  const Ctarget = r(maxC(L, bH) * cfrac, 4);
  const kC = r(Ctarget / bC, 4);
  console.log(`  target L ${String(L).padStart(3)}  (${L < 50 ? "dark surface" : "light text"}):`);
  console.log(`     ▸ L: c × ${String(kL).padEnd(7)} → oklch(from AXIOM calc(l * ${kL}) c h)   = oklch(${L}% ${bC} ${bH})`);
  console.log(`     ▸ C: c × ${String(kC).padEnd(7)} → oklch(from  …   l calc(c * ${kC}) h)   = oklch(${L}% ${Ctarget} ${bH})   [gamut ceiling ${r(maxC(L, bH), 3)}]`);
  console.log(`     ▸ α: × 1`);
  console.log(`        result: oklch(${L}% ${Ctarget} ${bH} / 1)\n`);
}
console.log(`  the family is: AXIOM(H) + per-color (k_L, k_C, k_α) — three single-axis ratios each.`);
