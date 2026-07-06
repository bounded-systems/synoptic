#!/usr/bin/env node
// synoptic axis-name — name a color PER AXIS (single-axis, Munsell-in-oklch). Each axis is
// named INDEPENDENTLY, never fused into a composite word:
//   HUE    — grounded on OKLab's unique hues (red/yellow/green/blue = the opponent cardinals),
//            interpolated landmarks between; a hue is "unique" (formal) or "blend".
//   VALUE  — Munsell Value: round(L/10) ∈ 0..10 (0 black, 10 white).
//   CHROMA — GAMUT-RELATIVE %: C / ceiling(L,H); tiered neutral→vivid (our grounded scale).
//   ALPHA  — opacity %.
// Output is a coordinate name (hue · V# · C%tier · α%), the per-axis analog of Munsell 5R 4/14.
import { canonicalizeTyped } from "./canonicalize.mjs";
// OKLab unique hues (opponent cardinals) — measured oklch angles of pure sRGB primaries:
const UNIQUE = { red: 29.23, yellow: 109.77, green: 142.5, blue: 264.05 };
// hue landmarks: the 4 unique (formal) + interpolated blends between them
const HUE = [[29.23,"red",1],[70,"orange",0],[109.77,"yellow",1],[128,"chartreuse",0],[142.5,"green",1],[175,"teal",0],[210,"cyan",0],[264.05,"blue",1],[300,"violet",0],[328,"magenta",0],[350,"rose",0]];
const nearestHue = (h) => HUE.reduce((a, b) => { const d = Math.min(Math.abs(h - b[0]), 360 - Math.abs(h - b[0])); return d < a.d ? { name: b[1], unique: b[2], d } : a; }, { d: 1e9 });
const VALUE_NAME = ["black", "near-black", "darkest", "darker", "dark", "mid", "light", "lighter", "lightest", "near-white", "white"];
const CHROMA_TIER = (p) => p < 8 ? "neutral" : p < 30 ? "grayish" : p < 50 ? "muted" : p < 70 ? "moderate" : p < 90 ? "strong" : "vivid";
// gamut ceiling at (L,H)
const oklab = (L, C, h) => ({ L: L / 100, a: C * Math.cos(h * Math.PI / 180), b: C * Math.sin(h * Math.PI / 180) });
const lms = ({ L, a, b }) => [(L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, (L - 0.0894841775 * a - 1.2914855480 * b) ** 3];
const lin = ([l, m, s]) => [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
const inG = (L, C, h) => lin(lms(oklab(L, C, h))).every((c) => c >= -0.001 && c <= 1.001);
const ceil = (L, h) => { let lo = 0, hi = 0.4; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; inG(L, m, h) ? lo = m : hi = m; } return lo; };

export function axisName(t) {
  if (t.alpha === 0) return { transparent: true, name: "transparent" };
  const value = Math.round(t.l / 10);
  const alpha = Math.round(t.alpha * 100);
  if (t.c < 0.02) return { hue: "—", value, valueName: VALUE_NAME[value], chromaPct: 0, chromaTier: "neutral", alpha, name: `neutral · V${value} (${VALUE_NAME[value]})${alpha < 100 ? " · α" + alpha + "%" : ""}` };
  const h = nearestHue(t.h);
  const cp = Math.round(100 * t.c / (ceil(t.l, t.h) || 1));
  const tier = CHROMA_TIER(cp);
  // ABOVE/BELOW the nearest UNIQUE hue — signed offset (+ above / − below). Since the unique
  // hues are unevenly spaced, this direction is more honest than an absolute angle.
  const uh = Object.entries(UNIQUE).map(([n, a]) => ({ n, d: ((t.h - a + 540) % 360) - 180 })).reduce((a, b) => Math.abs(b.d) < Math.abs(a.d) ? b : a);
  const dir = Math.abs(uh.d) < 0.5 ? "at" : uh.d > 0 ? "above" : "below";
  const rel = `${dir} ${uh.n}${dir === "at" ? "" : " " + Math.abs(Math.round(uh.d)) + "°"}`;
  return { hue: h.name, hueUnique: !!h.unique, hueRel: rel, uniqueHue: uh.n, uniqueOffset: Math.round(uh.d), value, valueName: VALUE_NAME[value], chromaPct: cp, chromaTier: tier, alpha, name: `${h.name}${h.unique ? "" : "*"} (${rel}) · V${value} · C${cp}% (${tier})${alpha < 100 ? " · α" + alpha + "%" : ""}` };
}

// CLI: name colors from a css-tokens.json, or --demo
if (process.argv[1] && process.argv[1].includes("axis-name")) {
  const { readFileSync } = await import("node:fs");
  const src = process.argv[2];
  if (!src || src === "--demo") {
    console.log("per-axis names (hue · Value · Chroma% · α) — hue* = interpolated blend, else unique:\n");
    for (const hex of ["#FF0000", "#800000", "#FFA500", "#228B22", "#0000FF", "#663399", "#C0C0C0", "#F0F8FF"]) {
      const t = canonicalizeTyped(hex); console.log("  " + hex.padEnd(9) + "→ " + axisName(t).name);
    }
  } else {
    const data = JSON.parse(readFileSync(src, "utf8"));
    const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    const cs = data.values.map((e) => parse(e.value)).filter((t) => t.$type === "color").sort((a, b) => a.l - b.l);
    for (const t of cs.slice(0, 24)) console.log("  " + axisName(t).name);
  }
}
