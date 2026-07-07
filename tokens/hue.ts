// Hues as TYPED CONSTANTS — the named oklch hue regions, their degree ranges, and the CVD field.
// Replaces magic degree literals (in describe(), the link picker, cvd-hues) with one grounded source.
import { z } from "zod";

/** The named hue regions (oklch). */
export const Hue = z.enum(["red", "clay", "amber", "gold", "lime", "green", "teal", "blue", "indigo", "magenta"]);
export type Hue = z.infer<typeof Hue>;

/** Upper-bound oklch degree for each named hue — the namer walks these in order. */
export const HUE_RANGES: readonly (readonly [number, Hue])[] = [
  [18, "red"], [45, "clay"], [78, "amber"], [105, "gold"], [140, "lime"],
  [172, "green"], [195, "teal"], [240, "blue"], [290, "indigo"], [335, "magenta"], [360, "red"],
] as const;
export const hueName = (deg: number): Hue => { for (const [max, name] of HUE_RANGES) if (deg <= max) return name; return "red"; };

/** The CVD-preserved fields: warm↔cool ride the yellow–blue axis red-green blindness keeps.
 * Chromatic hues should sit in ONE field so they never collapse for a color-blind viewer (1.4.1). */
export const HueField = z.enum(["warm", "cool"]);
export type HueField = z.infer<typeof HueField>;
export const HUE_FIELD: Record<HueField, readonly [number, number]> = { warm: [20, 110], cool: [195, 300] };
export const isWarm = (deg: number) => deg >= HUE_FIELD.warm[0] && deg <= HUE_FIELD.warm[1];
export const isCool = (deg: number) => deg >= HUE_FIELD.cool[0] && deg <= HUE_FIELD.cool[1];
/** Which CVD-safe field a hue belongs to (or "neutral-axis" — the red-green axis CVD deletes). */
export const hueField = (deg: number): HueField | "neutral-axis" => (isWarm(deg) ? "warm" : isCool(deg) ? "cool" : "neutral-axis");
