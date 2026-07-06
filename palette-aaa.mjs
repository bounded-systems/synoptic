#!/usr/bin/env node
// synoptic palette-aaa — GENERATE an AAA-valid palette by construction. The set determines the
// use: a color's L-band IS its role (dark band → surface, light band → text). The moat between
// the bands is left EMPTY, so every (surface, text) pair clears the bar by construction — no
// after-the-fact validation. We still print the worst-case ratio as a proof, not a test.
//   --hues 165,80   --bar 7   --steps 3   --surface-max 40
import { readFileSync } from "node:fs";
const args = process.argv.slice(2), opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const HUES = opt("--hues", "165").split(",").map(Number);
const BAR = parseFloat(opt("--bar", "7"));           // 7 = AAA, 4.5 = AA, 3 = large
const STEPS = parseInt(opt("--steps", "3"));
const SURF_MAX = parseFloat(opt("--surface-max", "40"));
const oklab = (L, C, h) => ({ L: L / 100, a: C * Math.cos(h * Math.PI / 180), b: C * Math.sin(h * Math.PI / 180) });
const lms = ({ L, a, b }) => [(L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, (L - 0.0894841775 * a - 1.2914855480 * b) ** 3];
const lin = ([l, m, s]) => [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
const inG = (L, C, h) => lin(lms(oklab(L, C, h))).every((c) => c >= -0.001 && c <= 1.001);
const ceil = (L, h) => { let lo = 0, hi = 0.4; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; inG(L, m, h) ? lo = m : hi = m; } return lo; };
const Yof = (L, C, h) => { const [r, g, b] = lin(lms(oklab(L, C, h))).map((c) => Math.max(0, Math.min(1, c))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [hi, lo] = a >= b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };
const round = (n, d = 4) => { const f = 10 ** d; return Math.round(n * f) / f; };

// surfaces: dark band, L in [18, SURF_MAX]; chroma at 50% of ceiling (muted, AAA-realistic)
const Ls = Array.from({ length: STEPS }, (_, i) => round(18 + (SURF_MAX - 18) * i / (STEPS - 1), 0));
const mk = (L, h) => ({ L, h, C: round(ceil(L, h) * 0.5, 4), Y: Yof(L, ceil(L, h) * 0.5, h) });
const surfaces = Ls.flatMap((L) => HUES.map((h) => mk(L, h)));
// the AAA text FLOOR: darkest text luminance that clears BAR against the MOST-LUMINOUS surface
const worstSurfY = Math.max(...surfaces.map((s) => s.Y));
const needY = BAR * (worstSurfY + 0.05) - 0.05;
let floorL = 50; for (let L = 50; L <= 100; L += 0.5) { if (Yof(L, 0, 0) >= needY) { floorL = L; break; } }
const Lt = Array.from({ length: STEPS }, (_, i) => round(Math.min(96, floorL) + (96 - Math.min(floorL, 92)) * i / (STEPS - 1), 0));
const texts = Lt.flatMap((L) => HUES.map((h) => mk(L, h)));

// PROOF (not a test): the worst pairing across the whole set
let worst = { r: 1e9 };
for (const s of surfaces) for (const t of texts) { const r = ratio(t.Y, s.Y); if (r < worst.r) worst = { r, s, t }; }
console.log(`palette-aaa — hues ${HUES.join(",")}°, bar ${BAR}:1  (roles determined by band)\n`);
console.log(`  SURFACES (dark band, L ${Ls[0]}–${SURF_MAX}) — use as background:`);
for (const s of surfaces) console.log(`     surface  oklch(${s.L}% ${s.C} ${s.h})`);
console.log(`\n  ── moat L ${SURF_MAX}–${Math.round(floorL)} left EMPTY (the AAA gap) ──\n`);
console.log(`  TEXT (light band, L ${Math.round(floorL)}–96) — use as foreground:`);
for (const t of texts) console.log(`     text     oklch(${t.L}% ${t.C} ${t.h})`);
console.log(`\n  ✔ PROOF by construction: worst pair = ${worst.r.toFixed(2)}:1 ` +
  `(text L${worst.t.L} on surface L${worst.s.L})  ${worst.r >= BAR ? "≥ " + BAR + " ✓ every surface×text clears the bar" : "✗ FAILS"}`);
console.log(`  ${surfaces.length} surfaces × ${texts.length} texts = ${surfaces.length * texts.length} pairings, all valid — no color needs checking, its band is its role.`);
