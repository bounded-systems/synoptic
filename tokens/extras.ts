// More token categories, same treatment as color/dimension: a typed value (Typed OM), a stepped
// scale, and bounds (min · max · step · readable floor). font-weight, opacity, and motion duration.
import { z } from "zod";
import { CSSUnitValue } from "./typed-om.ts";
import { sha } from "./color.ts";

const num = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "number" });
const ms = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "ms" });
const Unitless = CSSUnitValue.refine((v) => v.unit === "number", "unitless");
const Time = CSSUnitValue.refine((v) => v.unit === "ms" || v.unit === "s", "time (ms/s)");

// ── font-weight — a unitless number 100–900, stepped by 100 (the CSS named weights). Bold (≥700)
// shifts a heading to the large-text contrast tier. Grounded: CSS Fonts 4 §font-weight.
export const FontWeight = z.object({ $type: z.literal("font-weight"), $value: Unitless, $sha: z.string(), $description: z.string() });
export type FontWeight = z.infer<typeof FontWeight>;
export const WEIGHT_BOUNDS = { min: 100, max: 900, step: 100, readableFloor: 300, body: 400, bold: 700, grounding: "CSS Fonts 4 §font-weight; bold ≥700 → WCAG large-text tier (3:1)" } as const;
export function deriveWeights(): Record<string, FontWeight> {
  const out: Record<string, FontWeight> = {};
  for (let w: number = WEIGHT_BOUNDS.readableFloor; w <= WEIGHT_BOUNDS.max; w += WEIGHT_BOUNDS.step) {
    const role = w <= 300 ? "light" : w <= 400 ? "regular" : w <= 500 ? "medium" : w < 700 ? "semibold" : w === 700 ? "bold" : "black";
    const boldNote = w >= WEIGHT_BOUNDS.bold ? " Bold — a heading at this weight uses the large-text contrast tier (3:1, not 4.5:1)." : "";
    out[`w-${w}`] = { $type: "font-weight", $value: num(w), $sha: sha(`${w}weight`), $description: `Weight ${w} (${role}).${boldNote} Readable body floor ${WEIGHT_BOUNDS.readableFloor}; range ${WEIGHT_BOUNDS.min}–${WEIGHT_BOUNDS.max}, step ${WEIGHT_BOUNDS.step}.` };
  }
  return out;
}

// ── opacity — a unitless number 0–1. On TEXT, opacity < 1 lowers effective contrast, so the floor
// is where the (fg,bg) pair still clears its tier. Grounded: CSS Color 4 §transparency, WCAG 1.4.6.
export const Opacity = z.object({ $type: z.literal("opacity"), $value: Unitless, $sha: z.string(), $description: z.string() });
export type Opacity = z.infer<typeof Opacity>;
export const OPACITY_BOUNDS = { min: 0, max: 1, note: "on text the floor is dynamic — the opacity where the (fg,bg) pair still clears 1.4.6; below it, contrast fails", grounding: "CSS Color 4 §transparency; WCAG 1.4.6" } as const;

// ── motion duration — a time (ms). <100ms reads instant, >400ms sluggish; stepped geometrically.
// Every animation needs a prefers-reduced-motion off-ramp. Grounded: WCAG 2.3.3 (AAA) / 2.2.2.
export const Duration = z.object({ $type: z.literal("duration"), $value: Time, $sha: z.string(), $description: z.string() });
export type Duration = z.infer<typeof Duration>;
export const DURATION_BOUNDS = { minMs: 100, maxMs: 400, stepRatio: 1.5, grounding: "Perceptual: <100ms instant, >400ms sluggish. WCAG 2.3.3 / 2.2.2 — requires a prefers-reduced-motion off-ramp." } as const;
export function deriveDurations(): Record<string, Duration> {
  const out: Record<string, Duration> = {};
  for (let v = DURATION_BOUNDS.minMs; v <= DURATION_BOUNDS.maxMs + 1; v *= DURATION_BOUNDS.stepRatio) {
    const r = Math.round(v / 5) * 5;
    const feel = r < 150 ? "quick (UI feedback)" : r < 300 ? "standard (transitions)" : "deliberate (larger moves)";
    out[`d-${r}`] = { $type: "duration", $value: ms(r), $sha: sha(`${r}ms`), $description: `${r}ms — ${feel}. Range ${DURATION_BOUNDS.minMs}–${DURATION_BOUNDS.maxMs}ms (below 100 instant, above 400 sluggish); step ×${DURATION_BOUNDS.stepRatio}. Requires a prefers-reduced-motion off-ramp (WCAG 2.3.3).` };
  }
  return out;
}
