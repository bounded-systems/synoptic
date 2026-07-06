// synoptic canonicalize — normalize a CSS value to a canonical, MODERN form so equal
// values dedupe to ONE atom regardless of how they were authored:
//   colors  → oklch(L% C H [/ a])   modern, perceptual, gamut-preserving
//   lengths → <n>rem                 one relative unit (px ÷ root), rounded (no float noise)
//   zero    → 0                      canonical
//   numbers → trimmed
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
  return `oklch(${round(L, 2)}% ${round(C, 4)} ${round(C < 1e-4 ? 0 : H, 2)} / ${round(a, 3)})`;
}
function color(r, g, b, a = 1) { const { L, C, H } = rgbToOklch(r, g, b); return emitOklch(L * 100, C, H, a); }
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
  if ((m = v.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i))) {
    const a = m[4] ? (m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;
    return color(+m[1], +m[2], +m[3], a);
  }
  if (/^#[0-9a-f]{3,8}$/i.test(v)) { const [r, g, b, a] = hx(v); return color(r, g, b, a); }
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
