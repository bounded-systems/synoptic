#!/usr/bin/env node
// synoptic color-systems — express a color in the major PER-AXIS color systems (all single-
// axis, no composite names). Exact conversions where the math is closed-form; Munsell is
// approximate (empirical renotation — flagged). One point, many axis-namings.
//   OKLCh   L% C H        (ours; CSS Color 4)      — perceptual, our canonical
//   CIELCh  L* C* h       (CIE)                    — the perceptual predecessor
//   CIELab  L* a* b*      (CIE 1976)               — opponent, exact
//   HSL     H S% L%       (CSS Color 4)            — cylindrical sRGB
//   HSV     H S% V%       (classic)                — cylindrical sRGB
//   Munsell H V/C         (ASTM D1535) ~approx     — the per-axis classic (empirical)
import { canonicalizeTyped } from "./canonicalize.mjs";
const r = (n, d = 2) => { const f = 10 ** d; return Math.round(n * f) / f; };
// oklch → oklab → LMS(cubed) → XYZ(D65)
const oklab = (t) => ({ L: t.l / 100, a: t.c * Math.cos(t.h * Math.PI / 180), b: t.c * Math.sin(t.h * Math.PI / 180) });
const lmsCubed = ({ L, a, b }) => [(L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, (L - 0.0894841775 * a - 1.2914855480 * b) ** 3];
const xyz = ([l, m, s]) => [1.2270138511 * l - 0.5577999807 * m + 0.2812561490 * s, -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s, -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s];
// XYZ(D65) → CIELab
function cielab(t) {
  const [X, Y, Z] = xyz(lmsCubed(oklab(t)));
  const Xn = 0.95047, Yn = 1, Zn = 1.08883, d = 6 / 29;
  const f = (u) => (u > d ** 3 ? Math.cbrt(u) : u / (3 * d * d) + 4 / 29);
  const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}
// oklch → linear sRGB → sRGB
const linSRGB = ([l, m, s]) => [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
const srgb = (t) => linSRGB(lmsCubed(oklab(t))).map((c) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; });
function hsl_hsv(t) {
  const [R, G, B] = srgb(t); const mx = Math.max(R, G, B), mn = Math.min(R, G, B), c = mx - mn;
  let h = 0; if (c) h = mx === R ? ((G - B) / c % 6) : mx === G ? (B - R) / c + 2 : (R - G) / c + 4; h = (h * 60 + 360) % 360;
  const L = (mx + mn) / 2, Sl = c === 0 ? 0 : c / (1 - Math.abs(2 * L - 1)), V = mx, Sv = mx === 0 ? 0 : c / mx;
  return { h, Sl: Sl * 100, L: L * 100, V: V * 100, Sv: Sv * 100 };
}
// approximate Munsell: hue family from CIELCh hue, Value ≈ L*/10, Chroma ≈ C*/5
const MUN = ["R", "YR", "Y", "GY", "G", "BG", "B", "PB", "P", "RP"];
function munsell(lab) {
  const C = Math.hypot(lab.a, lab.b); let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI; if (h < 0) h += 360;
  // CIELCh hue → Munsell family (empirical rough: R≈40°, Y≈100°, G≈160°, B≈270° in Lab-hue)
  const fam = MUN[Math.round(((h + 20) % 360) / 36) % 10];
  return { fam, V: r(lab.L / 10, 1), C: r(C / 5, 1) };
}
export function systems(t) {
  const lab = cielab(t), lch = { L: lab.L, C: Math.hypot(lab.a, lab.b), h: (Math.atan2(lab.b, lab.a) * 180 / Math.PI + 360) % 360 };
  const cyl = hsl_hsv(t), mun = munsell(lab);
  return { oklch: t, cielab: lab, cielch: lch, hsl: cyl, hsv: cyl, munsell: mun };
}
if (process.argv[1] && process.argv[1].includes("color-systems")) {
  const inputs = process.argv.slice(2).length ? process.argv.slice(2) : ["#228B22", "#800000", "#663399", "#C0C0C0"];
  console.log("one color, six per-axis systems  (Munsell ~approx):\n");
  for (const hex of inputs) {
    const t = canonicalizeTyped(hex), s = systems(t);
    console.log("  " + hex);
    console.log("    OKLCh   L " + r(t.l) + "%  C " + r(t.c, 4) + "  H " + r(t.h) + "°");
    console.log("    CIELCh  L* " + r(s.cielch.L) + "  C* " + r(s.cielch.C) + "  h " + r(s.cielch.h) + "°");
    console.log("    CIELab  L* " + r(s.cielab.L) + "  a* " + r(s.cielab.a) + "  b* " + r(s.cielab.b));
    console.log("    HSL     H " + r(s.hsl.h) + "°  S " + r(s.hsl.Sl) + "%  L " + r(s.hsl.L) + "%");
    console.log("    HSV     H " + r(s.hsv.h) + "°  S " + r(s.hsv.Sv) + "%  V " + r(s.hsv.V) + "%");
    console.log("    Munsell ~" + s.munsell.fam + " " + s.munsell.V + "/" + s.munsell.C + "  (approx)");
    console.log("");
  }
}
