// Dimension + type-scale constraints — pinned, paired. The WCAG 2.2 AAA floors/ceilings sit next
// to the scale's STRUCTURAL bounds (markdown's role count + human readability), because a real
// type scale is bounded on both: accessibility below, and perception + markup structure at the edges.
import { z } from "zod";

const W = "https://www.w3.org/TR/WCAG22/";

/** The accessibility floors/ceilings — each a WCAG success criterion. */
export const AAA_CONSTRAINTS = {
  "line-height": { sc: "1.4.8", level: "AAA", kind: "ratio-floor", min: 1.5, unit: "number", note: "body line-height ≥ 1.5", url: `${W}#visual-presentation` },
  "measure": { sc: "1.4.8", level: "AAA", kind: "length-ceiling", max: 80, unit: "ch", note: "line length ≤ 80 characters", url: `${W}#visual-presentation` },
  "target-size": { sc: "2.5.5", level: "AAA", kind: "length-floor", min: 2.75, unit: "rem", px: 44, note: "interactive target ≥ 44px", url: `${W}#target-size-enhanced` },
  "focus-outline": { sc: "2.4.11", level: "AAA", kind: "length-floor", min: 0.125, unit: "rem", px: 2, note: "focus indicator ≥ 2px + area", url: `${W}#focus-appearance` },
  "text-spacing": { sc: "1.4.12", level: "AA", kind: "ratio-floors", letterEm: 0.12, wordEm: 0.16, paragraphTimes: 2, lineHeight: 1.5, note: "user-overridable spacing", url: `${W}#text-spacing` },
  "resize": { sc: "1.4.4", level: "AA", kind: "unit", rule: "lengths in rem (relative), never px", url: `${W}#resize-text` },
} as const;

/** Heading hierarchy — DECLARE how many sizes so each maps 1:1 to a heading level, and no
 * "in-between" size tempts choosing by size and SKIPPING a level (h1→h3). This is the type
 * analogue of the contrast moat: declaring the count sets the moat width between sizes. */
export const HEADING_HIERARCHY = {
  sc: ["1.3.1", "2.4.10"],
  level: "A / AAA",
  rule: "Each type size maps 1:1 to a heading level (h1…hN) or body. DECLARE the heading depth so the scale has exactly one size per level — extra sizes tempt picking by appearance and skipping a level, which breaks the programmatic heading structure (1.3.1) and the section-heading organization (2.4.10 AAA).",
  url: `${W}#info-and-relationships`,
} as const;

/** Distinct sizes a range admits at a step ratio — the MOAT between sizes. Parallel to the
 * contrast band count `floor(1 + log(21)/log(ratio))`; here the range is ceiling/floor. */
export function bandCount(floor: number, ceiling: number, stepRatio: number): number {
  return Math.floor(1 + Math.log(ceiling / floor) / Math.log(stepRatio));
}

/** The scale's structural bounds — NOT from WCAG, but from markdown's role count + readability. */
export const TYPE_SCALE_BOUNDS = {
  maxRoles: 7, // markdown/CommonMark: h1–h6 + body — you can't express more type levels
  floorRem: 0.75, // readability floor (~12px); body sits at 1rem
  ceilingRem: 4, // reasonable content maximum (~64px)
  displayCeilingRem: 6, // display/hero maximum (~96px); past this it's a graphic
  stepRatioMin: 1.03, // Weber JND — no two sizes closer than ~3% (imperceptible)
  stepRatioTypical: 1.2, // practical modular step, well above the JND
  grounding: "markdown/CommonMark (role count) · Weber–Fechner (step) · readability convention (floor/ceiling)",
} as const;

/** Validate a rem type scale against BOTH the AAA floors and the structural bounds. */
export function checkScale(rems: readonly number[]): { ok: boolean; violations: string[] } {
  const v: string[] = [];
  const s = [...new Set(rems)].sort((a, b) => a - b);
  const B = TYPE_SCALE_BOUNDS;
  if (s.length > B.maxRoles) v.push(`${s.length} distinct sizes > ${B.maxRoles} — markdown only has h1–h6 + body`);
  if (s.length && s[0] < B.floorRem) v.push(`smallest ${s[0]}rem < ${B.floorRem}rem readability floor`);
  if (s.length && s[s.length - 1] > B.displayCeilingRem) v.push(`largest ${s[s.length - 1]}rem > ${B.displayCeilingRem}rem display ceiling`);
  for (let i = 1; i < s.length; i++) {
    const r = s[i] / s[i - 1];
    if (r < B.stepRatioMin) v.push(`${s[i - 1]}rem→${s[i]}rem is ${((r - 1) * 100).toFixed(1)}% — below the ~3% JND, an imperceptible step`);
  }
  return { ok: v.length === 0, violations: v };
}

export const DimensionConstraints = z.object({
  $description: z.string(),
  aaa: z.record(z.string(), z.record(z.string(), z.unknown())),
  typeScale: z.record(z.string(), z.union([z.number(), z.string()])),
});
export const DIMENSION_CONSTRAINTS = {
  $description: "Dimension + type-scale constraints, paired: WCAG 2.2 AAA floors/ceilings (accessibility) next to markdown/readability scale bounds (structure + perception) and the heading hierarchy (declare the count → no skipping). A scale is valid only inside all of them.",
  aaa: AAA_CONSTRAINTS,
  typeScale: TYPE_SCALE_BOUNDS,
  headingHierarchy: HEADING_HIERARCHY,
};
