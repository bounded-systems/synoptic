// The BRAND SEED as one typed config passed to the engine — nothing hardcoded. A brand is its
// palette + a handful of knobs; everything downstream (roles, scale, weights) derives from this.
// Validated by Zod so a malformed brand fails at the door.
import { z } from "zod";
import { RolePref } from "./roles.ts";

export const BrandConfig = z.object({
  name: z.string(),
  /** the brand SEED — one color; the engine derives the whole palette (neutrals + accent ladder) from its hue */
  seed: z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex seed color"),
  /** optional explicit palette override; when absent the palette is derived from `seed` */
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex color")).min(2).optional(),
  /** 0 = max-contrast neutrals, 1 = max brand chroma; biases accent role-picking */
  brandBias: z.number().min(0).max(1).default(0.7),
  /** type scale: rem floor, rem ceiling, number of heading roles (bounds force the ratio) */
  typeScale: z.object({ floorRem: z.number(), ceilingRem: z.number(), roles: z.number().int() }).default({ floorRem: 0.75, ceilingRem: 3, roles: 6 }),
  /** font-weight roles */
  weights: z.object({ body: z.number(), heading: z.number() }).default({ body: 400, heading: 600 }),
  /** font stack (reifies to a generic CSSStyleValue) */
  font: z.string().default("system-ui, sans-serif"),
  /** measure ceiling in ch (≤80, WCAG 1.4.8) */
  measure: z.number().max(80).default(66),
  /** the PREFERENCE layer, pushed to the config: per-role decisions (targetL / chroma / field / …)
   * deep-merged onto DEFAULT_ROLE_PREFS. The REQUIRED WCAG tiers stay in roles.ts (ROLE_CONTRACT). */
  roles: z.record(z.string(), RolePref.partial()).default({}),
});
export type BrandConfig = z.infer<typeof BrandConfig>;

/** Parse + validate a brand config file. */
export function loadBrand(path: string): BrandConfig {
  return BrandConfig.parse(JSON.parse(Deno.readTextFileSync(path)));
}
