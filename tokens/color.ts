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

// ── sRGB + OKLab primitives — grounded facts, named (no bare coefficients) ─────────────────────
/** sRGB electro-optical transfer function constants (IEC 61966-2-1). */
const SRGB = { linThresh: 0.04045, linSlope: 12.92, alpha: 0.055, gamma: 2.4, invThresh: 0.0031308 } as const;
/** Rec. 709 / WCAG 2.x relative-luminance coefficients. */
const LUMINANCE_COEFF = [0.2126, 0.7152, 0.0722] as const;
/** The flare term in the WCAG contrast-ratio formula. */
const CONTRAST_FLARE = 0.05;
/** OKLab matrices (Ottosson 2020 / CSS Color 4 §oklab): lin-sRGB→LMS, LMS→Lab, and their inverses. */
const OKLAB_LMS = [[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]] as const;
const OKLAB_LAB = [[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]] as const;
const OKLAB_LMS_INV = [[1, 0.3963377774, 0.2158037573], [1, -0.1055613458, -0.0638541728], [1, -0.0894841775, -1.2914855480]] as const;
const OKLAB_RGB = [[4.0767416621, -3.3077115913, 0.2309699292], [-1.2684380046, 2.6097574011, -0.3413193965], [-0.0041960863, -0.7034186147, 1.7076147010]] as const;
/** sRGB-gamut search: declared numerical tolerance + iterations, and the OKLCh chroma ceiling (~0.4). */
const GAMUT = { epsilon: 0.001, chromaMax: 0.4, bisectIters: 24 } as const;
const dot = (row: readonly number[], v: readonly number[]): number => row[0] * v[0] + row[1] * v[1] + row[2] * v[2];

const hexToRgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
const toLinear = (c: number): number => (c <= SRGB.linThresh ? c / SRGB.linSlope : ((c + SRGB.alpha) / (1 + SRGB.alpha)) ** SRGB.gamma);
const fromLinear = (c: number): number => (c <= SRGB.invThresh ? SRGB.linSlope * c : (1 + SRGB.alpha) * c ** (1 / SRGB.gamma) - SRGB.alpha);

/** hex → OKLCh (l as %, c, h in degrees, alpha). */
export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const [l, m, s] = OKLAB_LMS.map((row) => Math.cbrt(dot(row, [r, g, b])));
  const [L, A, B] = OKLAB_LAB.map((row) => dot(row, [l, m, s]));
  const c = round(Math.hypot(A, B), 4);
  let h = Math.atan2(B, A) * 180 / Math.PI;
  if (h < 0) h += 360;
  // powerless hue: C rounds to 0 → the hue is meaningless, normalize to 0 (matches culori / the degenerate-point rule)
  return { l: round(L * 100, 2), c, h: c === 0 ? 0 : round(h, 2), alpha: 1 };
}

/** OKLCh → linear sRGB (for gamut + luminance). */
function oklchToLinear(L: number, C: number, h: number): [number, number, number] {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180), Ln = L / 100;
  const lms = OKLAB_LMS_INV.map((row) => dot(row, [Ln, a, b]) ** 3);
  return OKLAB_RGB.map((row) => dot(row, lms)) as [number, number, number];
}

const inGamut = (L: number, C: number, h: number): boolean => oklchToLinear(L, C, h).every((c) => c >= -GAMUT.epsilon && c <= 1 + GAMUT.epsilon);
/** Max in-gamut chroma at a given L and hue (the "lens"). */
export function chromaCeiling(L: number, h: number): number {
  let lo = 0, hi: number = GAMUT.chromaMax;
  for (let i = 0; i < GAMUT.bisectIters; i++) { const m = (lo + hi) / 2; inGamut(L, m, h) ? (lo = m) : (hi = m); }
  return lo;
}

/** OKLCh → hex, chroma clamped to the sRGB gamut ceiling so the color is always representable. */
export function oklchToHex(L: number, C: number, h: number): string {
  const c = Math.min(C, chromaCeiling(L, h));
  const rgb = oklchToLinear(L, c, h).map(fromLinear).map((x) => Math.round(clamp(x) * 255));
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}

const relLum = (rgb: readonly number[]): number => dot(LUMINANCE_COEFF, rgb);
const clamp = (c: number): number => Math.max(0, Math.min(1, c));
export const luminanceOklch = (L: number, C: number, h: number): number => relLum(oklchToLinear(L, C, h).map(clamp));
export const luminanceHex = (hex: string): number => relLum(hexToRgb(hex).map(toLinear));
export const contrast = (y1: number, y2: number): number => { const [hi, lo] = y1 >= y2 ? [y1, y2] : [y2, y1]; return (hi + CONTRAST_FLARE) / (lo + CONTRAST_FLARE); };

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

export type CvdType = keyof typeof CVD_MATRICES;
export const CVD_TYPES = Object.keys(CVD_MATRICES) as CvdType[];
/** Simulate a color under a color-vision deficiency → hex (Machado 2009, applied in linear RGB). */
export function cvdSimulate(hex: string, type: CvdType): string {
  const lin = hexToRgb(hex).map(toLinear), M = CVD_MATRICES[type];
  return "#" + M.map((row) => fromLinear(clamp(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]))).map((c) => Math.round(clamp(c) * 255).toString(16).padStart(2, "0")).join("");
}
/** ΔEOK — OKLab Euclidean distance between two hex colors (the perceptual JND metric). */
export function deltaEOK(a: string, b: string): number {
  const lab = (h: string) => { const o = hexToOklch(h); return [o.l / 100, o.c * Math.cos(o.h * Math.PI / 180), o.c * Math.sin(o.h * Math.PI / 180)]; };
  const [A, B] = [lab(a), lab(b)];
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/** Derived CAS name — the coordinate, inlined. */
export const casName = (o: Oklch): string => {
  const n = (x: number) => String(x).replace(/\./g, "_").replace(/^-/, "neg");
  return `oklch-${n(o.l)}-${n(o.c)}-${n(o.h)}-${n(o.alpha)}`;
};
export const oklchString = (o: Oklch): string => `oklch(${o.l}% ${o.c} ${o.h} / ${o.alpha})`;
/** The color as a CSS Typed OM CSSOKLCH internal representation (the generated spec type). */
export const cssOklch = (o: Oklch) => ({ $type: "CSSOKLCH" as const, l: o.l, c: o.c, h: o.h, alpha: o.alpha });
