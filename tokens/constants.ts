// Every value the derivation would otherwise hardcode, formalized + grounded. Each cites its source:
// an OKLCH/gamut fact, Ottosson's ΔEOK JND, a WCAG SC (re-exported from dimension-constraints), or a
// declared typographic DECISION. Nothing in the derivation is a bare literal — it references here.
import { AAA_CONSTRAINTS, TYPE_SCALE_BOUNDS } from "./dimension-constraints.ts";

// ── OKLCH / perception ─────────────────────────────────────────────────────────
/** Reference chroma for "fully saturated" near mid-L in sRGB — normalizes the brand-bias score to
 * 0..1. ~ the sRGB chroma ceiling around L 60 (a gamut fact; cf. color.ts chromaCeiling). */
export const CHROMA_REF = 0.15;
/** A color reads as chromatic (vs a neutral) at/above this OKLCH chroma; below it hue is ~powerless. */
export const CHROMATIC_THRESHOLD = 0.06;
/** OKLab ΔE just-noticeable difference (Ottosson, "A perceptual color space", 2020). */
export const DELTA_E_JND = 0.02;

// ── WCAG dimension floors, surfaced as plain numbers for the derivation (single source of truth) ──
export const TARGET_MIN_REM = AAA_CONSTRAINTS["target-size"].min; //  2.75rem = 44px (2.5.5)
export const LINE_HEIGHT_BODY = AAA_CONSTRAINTS["line-height"].min; // 1.5 (1.4.8)
export const HAIRLINE_REM = AAA_CONSTRAINTS["focus-outline"].min; //   0.125rem = 2px (2.4.11)
export const MEASURE_MAX_CH = AAA_CONSTRAINTS["measure"].max; //       80ch (1.4.8)
/** Heading line-height — a typographic DECISION (tighter leading for large type); no SC. */
export const LINE_HEIGHT_HEADING = 1.2;
/** CSS initial root font-size — `font-size: medium` ≈ 16px (a CSS fact, for px-equivalent prose). */
export const PX_PER_REM = 16;
/** Ideal reading measure (declared decision) — comfortable line length, under the 80ch ceiling. */
export const MEASURE_IDEAL_CH = 66;

// ── Fluid root (CSS clamp) — the "normalize on rem, fluid base" story ──
export const ROOT_FONT = { floorRem: 1, baseRem: 0.5, slopeVw: 0.5, ceilRem: 1.25 } as const;

// ── Spacing stops (rem) — a modular ladder for rhythm; the derivation snaps to it ──
export const SPACING_STOPS = [HAIRLINE_REM, 0.25, 0.5, 0.75, 1, 1.5, 2, TARGET_MIN_REM, 3] as const;
export const SPACING_RATIO = TYPE_SCALE_BOUNDS.stepRatioTypical + 0.3; // geometric snap step (well above the JND)
/** Named rhythm steps (rem) — the derivation references SPACE.lg, never a bare 2. Values are the stops. */
export const SPACE = {
  none: 0, hair: SPACING_STOPS[0], xs: SPACING_STOPS[1], sm: SPACING_STOPS[2],
  snug: SPACING_STOPS[3], base: SPACING_STOPS[4], md: SPACING_STOPS[5], lg: SPACING_STOPS[6], xl: SPACING_STOPS[8],
} as const;

// ── Seed → palette: a neutral lightness ramp (tinted toward the hue) + chromatic accent shades ──
// FULLER than the roles need, so a brand can tune WHERE each role sits (softer/harder) via targetL
// without authoring a new palette. Every step is still gamut-clamped + the roles enforce the tiers.
export const SEED_NEUTRALS = [97, 92, 84, 70, 55, 40, 28, 18, 12] as const; // light → dark (OKLCH L)
export const SEED_ACCENTS = [64, 52, 44] as const; //                          fill · mid · link-dark (at the hue)
export const SEED_TINT = 0.014; //  faint neutral tint toward the brand hue — cohesion without a color cast
export const SEED_ACCENT_C_MIN = CHROMA_REF; // floor so the accent stays vibrant
