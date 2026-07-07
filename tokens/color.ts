// Color math, in TypeScript. OKLCh conversion, gamut ceiling, WCAG contrast, CVD simulation
// (Machado 2009), and content addressing (sha + merkle). Ported from the .mjs prototypes.
import { createHash } from "node:crypto";

export const sha = (s: string, n = 12): string => createHash("sha256").update(s).digest("hex").slice(0, n);
export const merkleRoot = (leaves: string[]): string => {
  if (leaves.length === 0) return sha("", 64);
  let lvl = [...leaves].sort();
  while (lvl.length > 1) {
    const nx: string[] = [];
    for (let i = 0; i < lvl.length; i += 2) nx.push(sha(lvl[i] + (lvl[i + 1] ?? lvl[i]), 64));
    lvl = nx;
  }
  return lvl[0];
};

export interface Oklch { l: number; c: number; h: number; alpha: number }
const round = (n: number, d = 4): number => { const f = 10 ** d; return Math.round(n * f) / f; };

const hexToRgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** hex → OKLCh (l as %, c, h in degrees, alpha). */
export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const c = round(Math.hypot(A, B), 4);
  let h = Math.atan2(B, A) * 180 / Math.PI;
  if (h < 0) h += 360;
  // powerless hue: C rounds to 0 → the hue is meaningless, normalize to 0 (matches culori / the degenerate-point rule)
  return { l: round(L * 100, 2), c, h: c === 0 ? 0 : round(h, 2), alpha: 1 };
}

/** OKLCh → linear sRGB (for gamut + luminance). */
function oklchToLinear(L: number, C: number, h: number): [number, number, number] {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180), Ln = L / 100;
  const l = (Ln + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (Ln - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (Ln - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const inGamut = (L: number, C: number, h: number): boolean => oklchToLinear(L, C, h).every((c) => c >= -0.001 && c <= 1.001);
/** Max in-gamut chroma at a given L and hue (the "lens"). */
export function chromaCeiling(L: number, h: number): number {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; inGamut(L, m, h) ? (lo = m) : (hi = m); }
  return lo;
}

const relLum = ([r, g, b]: number[]): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const clamp = (c: number): number => Math.max(0, Math.min(1, c));
export const luminanceOklch = (L: number, C: number, h: number): number => relLum(oklchToLinear(L, C, h).map(clamp));
export const luminanceHex = (hex: string): number => relLum(hexToRgb(hex).map(toLinear));
export const contrast = (y1: number, y2: number): number => { const [hi, lo] = y1 >= y2 ? [y1, y2] : [y2, y1]; return (hi + 0.05) / (lo + 0.05); };

// Machado 2009 dichromat matrices (severity 1.0), applied in linear RGB
const CVD_MATRICES = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
} as const;
const simLum = (hex: string, M: readonly (readonly number[])[]): number => {
  const lin = hexToRgb(hex).map(toLinear);
  return relLum(M.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]).map(clamp));
};
/** Worst-case contrast across the three common color-vision deficiencies. */
export const contrastCVD = (fg: string, bg: string): number =>
  Math.min(...Object.values(CVD_MATRICES).map((M) => contrast(simLum(fg, M), simLum(bg, M))));

/** Derived CAS name — the coordinate, inlined. */
export const casName = (o: Oklch): string => {
  const n = (x: number) => String(x).replace(/\./g, "_").replace(/^-/, "neg");
  return `oklch-${n(o.l)}-${n(o.c)}-${n(o.h)}-${n(o.alpha)}`;
};
export const oklchString = (o: Oklch): string => `oklch(${o.l}% ${o.c} ${o.h} / ${o.alpha})`;
