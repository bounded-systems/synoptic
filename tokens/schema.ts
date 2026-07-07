// The color-token layers, as enforceable Zod schemas. Each layer replaces a slice of what a
// "semantic" tier used to do — and because the schema is the spec, a token that doesn't conform
// cannot be emitted. Layers: primitive · primitive-pair · property · property-pair · node-pair.
import { z } from "zod";
import { CSSOKLCH, CSSUnitValue } from "./typed-om.ts"; // GENERATED from the CSS Typed OM IDL — the real spec types
import { ColorProperty } from "./properties.ts"; // GENERATED from @webref/css — the typed property names

// ── content addresses ────────────────────────────────────────────────
export const Sha8 = z.string().regex(/^[0-9a-f]{8}$/, "8-hex content address");
export const Sha12 = z.string().regex(/^[0-9a-f]{12}$/, "12-hex content address");
export const Sha64 = z.string().regex(/^[0-9a-f]{64}$/, "merkle root");
export const CasName = z.string().regex(/^oklch-/, "derived CAS name (name IS the coordinate)");

// ── LAYER: primitive — the color atom; $value IS a CSS Typed OM CSSOKLCH ──
export const PrimitiveColor = z.object({
  $type: z.literal("color"),
  $value: CSSOKLCH, // the Typed OM internal representation, generated from IDL — not hand-asserted
  $sha: Sha12,
  $description: z.string(),
});

// ── LAYER: dimension — a length, LOCKED to rem. The root is `font-size: medium` (the spec's
// keyword for the user's default — a CSSKeywordValue), so every rem floats on the user's size.
// px/em/ch are unconstructable here: they fail Resize (1.4.4) / Reflow (1.4.10).
export const Rem = CSSUnitValue.refine((v) => v.unit === "rem", "dimensions must be rem — px/em/ch fail 1.4.4/1.4.10");
export const Dimension = z.object({
  $type: z.literal("dimension"),
  $value: Rem, // a CSSUnitValue whose unit can only be "rem"
  $sha: Sha12,
  $description: z.string(),
});
export type Dimension = z.infer<typeof Dimension>;

// ── LAYER: number — a unitless ratio (line-height, scale ratio, text-spacing multiplier). A
// CSSUnitValue with unit "number". Applied to a dimension it becomes a length (line-height ×
// font-size), the way a contrast requirement pairs two colors. The 1.5 line-height floor is AAA.
export const Unitless = CSSUnitValue.refine((v) => v.unit === "number", "a ratio is unitless (unit: number)");
export const NumberValue = z.object({
  $type: z.literal("number"),
  $value: Unitless,
  $sha: Sha12,
  $description: z.string(),
});
export type NumberValue = z.infer<typeof NumberValue>;

// ── The ROOT font-size — the reference every rem floats on. Must have a rem FLOOR so the user's
// preference is always respected; a vw term without a rem floor is unconstructable (fails 1.4.4).
// The fluid form is a clamp() — a CSSMathClamp — with a rem floor and rem cap.
export const RootFontSize = z.object({
  $type: z.literal("root-font-size"),
  $css: z.string(), // the declaration: "medium", "100%", or "clamp(1rem, 0.5rem + 0.5vw, 1.25rem)"
  $floor: Rem, // the rem floor — REQUIRED; guarantees text never drops below the user's size
  $cap: Rem.optional(), // rem ceiling (fluid case)
  $fluid: z.boolean(),
  $description: z.string(),
}).refine((r) => !/\bvw\b/i.test(r.$css) || /rem/i.test(r.$css), "a vw term requires a rem floor (1.4.4)");
export type RootFontSize = z.infer<typeof RootFontSize>;
export type PrimitiveColor = z.infer<typeof PrimitiveColor>;

// ── LAYER: primitive-pair — two colors validated together (merkle leaf)
export const Tier = z.enum(["non-text-3", "text-AA-4.5", "text-AAA-7"]);
export const ColorPair = z.object({
  $type: z.literal("color-pair"),
  $pairSha: Sha12,                                  // hash(sorted color-hashes) — exists ONLY for a valid pair
  $colors: z.tuple([CasName, CasName]),
  $colorShas: z.record(CasName, Sha12),
  $ratio: z.number().min(1),
  $cvd: z.number().min(1),
  $clears: z.array(Tier).min(1),                    // a pair with no cleared tier is not valid → not emitted
});
export type ColorPair = z.infer<typeof ColorPair>;

// ── LAYER: property — a CSS property → a color (by its sha) ───────────
export const PropertyRole = z.enum(["text-fg", "nontext-fg", "background", "self-pair", "exempt", "fg-depends"]);
export const PropertyToken = z.object({
  $type: z.literal("color"),
  $value: Sha12,                                    // content address of the resolved color
  $resolvesTo: CasName,
  $role: PropertyRole,
  $description: z.string(),
});
export type PropertyToken = z.infer<typeof PropertyToken>;

// ── LAYER: property-pair — the contrast relation (two properties) ─────
export const PropertyPair = z.object({
  $type: z.literal("contrast-pair"),
  $properties: z.array(ColorProperty).min(1).max(2), // typed property names, not free strings
  $foreground: ColorProperty.optional(),
  $background: ColorProperty.optional(),
  $tierFrom: z.string(),                            // "node" — the tier is resolved by the node, not fixed
  $candidate: z.string(),
  $note: z.string().optional(),
  $check: z.string().optional(),
});
export type PropertyPair = z.infer<typeof PropertyPair>;

// ── LAYER: node-pair — the concrete parent<>child instance ───────────
// Valid ONLY by citing a validated ColorPair.$pairSha; an un-validated combination has none.
export const NodePair = z.object({
  $type: z.literal("node-pair"),
  $nodes: z.tuple([z.string(), z.string()]),        // parent, child (resolved, different colors)
  $pairSha: Sha12,                                  // MUST be a ColorPair.$pairSha in the merkle set
  $status: z.enum(["resolved", "inconclusive", "exempt"]), // exempt: disabled/inactive node (1.4.3 exception)
  $concern: z.string().optional(),                  // the SC this pair is about — 1.4.6 (text), 2.4.11 (focus), …
  $reason: z.string().optional(),                   // when inconclusive/exempt/failing: the explanation
});
export type NodePair = z.infer<typeof NodePair>;

// a tier document = $-prefixed metadata (strings/numbers) + named token entries
export const Meta = z.union([z.string(), z.number()]);
