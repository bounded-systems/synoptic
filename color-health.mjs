#!/usr/bin/env node
// synoptic color-health <css-tokens.json> [--json] — INTRINSIC color health (per color,
// independent of pairing). Two checks, each spec-grounded:
//   GAMUT      — is the color realizable? in sRGB? in Display-P3? Out-of-gamut colors are
//                silently gamut-mapped by the UA, so the rendered color ≠ the value.
//                Grounded: CSS Color 4 §13 (Gamut Mapping). w3.org/TR/css-color-4/#gamut-mapping
//   POWERLESS  — is the hue meaningful? CSS Color 4 defines a hue as POWERLESS when chroma
//                is 0 (the angle carries no information). We flag C=0 as powerless (spec)
//                and 0<C<0.02 as "perceptually powerless" (OUR heuristic — a near-gray whose
//                tint no eye resolves). Grounded: CSS Color 4 §12.4 (powerless components).
// Color math prefers culori (inGamut) when present; hand-rolled fallback (matches culori)
// otherwise. The CHECK layer is ours — a candidate for a standalone color-audit package
// (with contrast=WCAG and color-review=ΔEOK near-dupes).
import { readFileSync } from "node:fs";
let culori = null; try { culori = await import("culori"); } catch { /* fallback */ }
const src = process.argv[2]; const asJson = process.argv.includes("--json");
if (!src) { console.error("usage: color-health <css-tokens.json> [--json]"); process.exit(2); }
const data = JSON.parse(readFileSync(src, "utf8"));
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const num = (x) => String(x).replace(/\./g, "_").replace(/^-/, "neg");
const name = (t) => `oklch-${num(t.l)}-${num(t.c)}-${num(t.h)}-${num(t.alpha)}`;

// oklch → oklab → linear-light (hand-rolled fallback; Ottosson matrices, CSS Color 4 §9)
const oklab = (t) => ({ L: t.l / 100, a: t.c * Math.cos(t.h * Math.PI / 180), b: t.c * Math.sin(t.h * Math.PI / 180) });
const lms = ({ L, a, b }) => [(L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, (L - 0.0894841775 * a - 1.2914855480 * b) ** 3];
const linSRGB = ([l, m, s]) => [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
const linP3 = ([l, m, s]) => { const X = 1.2270138511 * l - 0.5577999807 * m + 0.2812561490 * s, Y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s, Z = -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s; return [2.4934969119 * X - 0.9313836179 * Y - 0.4027107845 * Z, -0.8294889696 * X + 1.7626640603 * Y + 0.0236246858 * Z, 0.0358458302 * X - 0.0761723893 * Y + 0.9568845240 * Z]; };
const okToCss = (t) => ({ mode: "oklch", l: t.l / 100, c: t.c, h: t.h, alpha: t.alpha });
function gamut(t) {
  if (culori) return { srgb: culori.inGamut("rgb")(okToCss(t)), p3: culori.inGamut("p3")(okToCss(t)) };
  const L = lms(oklab(t)), e = 0.0015, ok = (rgb) => rgb.every((c) => c >= -e && c <= 1 + e);
  return { srgb: ok(linSRGB(L)), p3: ok(linP3(L)) };
}

const cs = data.values.map((e) => parse(e.value)).filter((t) => t.$type === "color");
const rows = [];
for (const t of cs) {
  if (t.alpha === 0) { rows.push({ name: name(t), ok: true, checks: {} }); continue; }
  const g = gamut(t);
  const powerless = t.c === 0 ? "spec" : t.c < 0.02 ? "perceptual" : null;
  const flags = [];
  if (!g.srgb) flags.push(g.p3 ? "out-of-sRGB (needs P3)" : "out-of-P3 (unrealizable)");
  if (powerless) flags.push(`powerless-hue:${powerless}`);
  rows.push({ name: name(t), inSRGB: g.srgb, inP3: g.p3, powerless, flags });
}
// --fix: neutralize perceptually-powerless hues → a true gray (C=0, H=0). Imperceptible
// (ΔC < 0.02, sub-JND) and honest — CSS Color 4: a C=0 hue is "none". White (already C=0)
// and transparent are left alone.
if (process.argv.includes("--fix")) {
  const NEUT = (t) => ({ ...t, c: 0, h: 0 });
  const fixes = cs.filter((t) => t.alpha > 0 && t.c > 0 && t.c < 0.02).map((t) => ({ before: t, after: NEUT(t) }));
  const out = { source: src, fixed: fixes.length, changes: fixes.map((f) => ({ from: name(f.before), to: name(f.after), deltaC: f.before.c })) };
  if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
  console.log(`color-health --fix — neutralize ${fixes.length} perceptually-powerless hues → true grays\n`);
  console.log(`  (CSS Color 4 §12.4: a C=0 hue is powerless/none. Each ΔC below is < 0.02, imperceptible.)\n`);
  for (const f of fixes) console.log(`  ${name(f.before).padEnd(30)} → ${name(f.after).padEnd(18)}  oklch(${f.before.l}% ${f.before.c} ${f.before.h}) → oklch(${f.after.l}% 0 0)`);
  console.log(`\n  ${fixes.length} hues neutralized; L (the axis that matters) unchanged, so contrast is identical.`);
  process.exit(0);
}
const outGamut = rows.filter((r) => r.flags?.some((f) => f.startsWith("out-"))).length;
const power = rows.filter((r) => r.powerless).length;
if (asJson) { console.log(JSON.stringify({ source: src, colors: cs.length, engine: culori ? "culori" : "hand-rolled", outOfGamut: outGamut, powerless: power, rows }, null, 2)); process.exit(outGamut ? 1 : 0); }
console.log(`color-health — ${cs.length} colors  (engine: ${culori ? "culori" : "hand-rolled fallback"})\n`);
console.log(`  out of gamut: ${outGamut}  ·  powerless hue: ${power}\n`);
for (const r of rows.filter((r) => r.flags?.length)) console.log(`  ${r.name.padEnd(30)} ${r.flags.join("; ")}`);
if (!outGamut && !power) console.log("  ✓ all realizable, all hues meaningful");
process.exit(outGamut ? 1 : 0);
