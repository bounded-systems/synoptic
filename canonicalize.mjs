// synoptic canonicalize — normalize a CSS value to a canonical, MODERN form so equal
// values dedupe to ONE atom regardless of how they were authored:
//   colors  → oklch(L% C H [/ a])   modern, perceptual, gamut-preserving
//   lengths → <n>rem                 one relative unit (px ÷ root), rounded (no float noise)
//   zero    → 0                      canonical
//   numbers → trimmed
import { NAMED } from "./named-colors.mjs";
import { SYSTEM } from "./system-colors.mjs";
// prefer culori (maintained color lib) when installed; fall back to the hand-rolled math
// (correct + tested, matches culori) when it isn't (e.g. this sandbox). Retire-to-fallback.
let culori = null; try { culori = await import("culori"); } catch { /* hand-rolled fallback */ }
const round = (n, d = 4) => { const f = 10 ** d; return Math.round(n * f) / f; };

// sRGB 0-255 → OKLCH
function rgbToOklch(r, g, b) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.782771766 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + Bb * Bb);
  let H = (Math.atan2(Bb, A) * 180) / Math.PI; if (H < 0) H += 360;
  return { L, C, H };
}
// emit canonical oklch (L given 0-100). The single output form for ALL colors, with the
// optional alpha ALWAYS set explicitly (no implicit default) — every color is L C H / a.
function emitOklch(L, C, H, a = 1) {
  // full transparency is DEGENERATE: at alpha 0 the color is unobservable (and premultiplied
  // interpolation zeroes its channels), so ALL alpha-0 colors collapse to one transparent
  // atom — L/C/H below the observability floor. CSS Color 4 §12.3 (premultiplied alpha).
  if (round(a, 3) === 0) return "oklch(0% 0 0 / 0)";                    // transparent: ALL axes gone
  if (round(L, 2) <= 0) return `oklch(0% 0 0 / ${round(a, 3)})`;        // black: L=0 forces C=0, H gone
  if (round(L, 2) >= 100) return `oklch(100% 0 0 / ${round(a, 3)})`;    // white: L=100 forces C=0, H gone
  return `oklch(${round(L, 2)}% ${round(C, 4)} ${round(C < 1e-4 ? 0 : H, 2)} / ${round(a, 3)})`;
}
function color(r, g, b, a = 1) {
  if (culori) { const o = culori.oklch({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 }); return emitOklch((o.l || 0) * 100, o.c || 0, o.h || 0, a); }
  const { L, C, H } = rgbToOklch(r, g, b); return emitOklch(L * 100, C, H, a);
}
// XYZ (D65) → OkLCh — the general path (used for wide-gamut inputs). CSS Color 4 §9.
function xyzToOklch(X, Y, Z) {
  const l = Math.cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z);
  const m = Math.cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z);
  const s = Math.cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.633851707 * Z);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.782771766 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI; if (H < 0) H += 360;
  return { L, C, H };
}
// display-p3 (0-1, sRGB transfer, DCI-P3 primaries, D65) → OkLCh. Wide gamut PRESERVED
// (chroma can exceed the sRGB range) — this is why oklch is the right canonical form.
function p3color(r, g, b, a = 1) {
  if (culori) { const o = culori.oklch({ mode: "p3", r, g, b }); return emitOklch((o.l || 0) * 100, o.c || 0, o.h || 0, a); }
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = 0.4865709486 * R + 0.2656676932 * G + 0.1982172852 * B;
  const Y = 0.2289745641 * R + 0.6917385218 * G + 0.0792869141 * B;
  const Z = 0.0 * R + 0.0451133819 * G + 1.0439443689 * B;
  const { L, C, H } = xyzToOklch(X, Y, Z);
  return emitOklch(L * 100, C, H, a);
}
function hslToRgb(h, s, l) {
  s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12;
  const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}
const hx = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join(""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; };
const alpha = (s) => (s == null ? 1 : s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));

export function canonicalize(value, rootPx = 16) {
  let v = value.trim();
  // whole-value color forms
  let m;
  const lc = v.toLowerCase();
  if (SYSTEM[lc]) return SYSTEM[lc].name;                                 // system color: a semantic KEY, kept canonical (theme-resolved)
  if (Object.prototype.hasOwnProperty.call(NAMED, lc)) v = NAMED[lc];      // named color → its hex, then to oklch below
  if ((m = v.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i))) {
    const a = m[4] ? (m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;
    return color(+m[1], +m[2], +m[3], a);
  }
  if (/^#[0-9a-f]{3,8}$/i.test(v)) { const [r, g, b, a] = hx(v); return color(r, g, b, a); }
  // display-p3 (CSS Color 4 §10.4) — WIDE GAMUT, preserved through oklch (not clamped).
  if ((m = v.match(/^color\(\s*display-p3\s+([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i))) {
    const n = (x) => (x.endsWith("%") ? parseFloat(x) / 100 : parseFloat(x));
    return p3color(n(m[1]), n(m[2]), n(m[3]), alpha(m[4]));
  }
  // already oklch (CSS Color 4) → normalize precision/format to the one canonical form.
  if ((m = v.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)$/i)))
    return emitOklch(m[2] ? +m[1] : +m[1] * 100, +m[3], +m[4], alpha(m[5]));
  // hsl (CSS Color 4) → oklch
  if ((m = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%[ ,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i))) {
    const [r, g, b] = hslToRgb(+m[1], +m[2], +m[3]); return color(r, g, b, alpha(m[4]));
  }
  if (v === "transparent") return emitOklch(0, 0, 0, 0);
  // token-wise: rewrite lengths → rem, zero → 0, inside any multi-value (shadows, etc.)
  return v.replace(/(-?[\d.]+)(px|rem|em)\b/gi, (_, n, u) => {
    let px = parseFloat(n);
    if (u.toLowerCase() === "rem" || u.toLowerCase() === "em") px *= rootPx;
    if (px === 0) return "0";
    return `${round(px / rootPx, 4)}rem`;
  }).replace(/\brgba?\([^)]*\)/gi, (c) => { const p = c.match(/[\d.]+/g).map(Number); return color(p[0], p[1], p[2], p[3] ?? 1); });
}

// canonicalizeTyped — the MODERN, STRUCTURED form: a typed value atom per
// spec/value/*.schema.json, which IS the CSS Typed OM shape (CSSUnitValue {value,unit},
// CSSKeywordValue {value}, structured color). The string (canonicalize) is the
// serialization; this is the data. Units are {value, unit:"rem"}, not "1rem".
export function canonicalizeTyped(value, rootPx = 16) {
  const s = canonicalize(value, rootPx);
  let m;
  if ((m = s.match(/^oklch\(([\d.]+)% ([\d.]+) ([\d.]+) \/ ([\d.]+)\)$/))) return { $type: "color", colorSpace: "oklch", l: +m[1], c: +m[2], h: +m[3], alpha: +m[4] };
  if (s === "0") return { $type: "dimension", value: 0, unit: "rem" };
  if ((m = s.match(/^(-?[\d.]+)rem$/))) return { $type: "dimension", value: +m[1], unit: "rem" };
  if ((m = s.match(/^(-?[\d.]+)%$/))) return { $type: "percentage", value: +m[1], unit: "%" };
  if (/^-?[\d.]+$/.test(s)) return { $type: "number", value: +s };
  if (s.includes(",") || /^".*"/.test(s) || /\b(serif|sans-serif|monospace|system-ui)\b/.test(s)) {
    const list = s.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    const GEN = ["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji"];
    const g = list[list.length - 1];
    return { $type: "fontFamily", value: list, ...(GEN.includes(g) ? { generic: g } : {}) };
  }
  if (/^[A-Z]/.test(s)) return { $type: "keyword", value: s, system: true }; // system color keyword
  if (/^-?[a-z][a-z0-9-]*$/.test(s)) return { $type: "keyword", value: s };
  return { $type: "unknown", raw: s };
}
