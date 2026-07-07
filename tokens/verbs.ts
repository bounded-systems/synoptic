/**
 * @module
 * The color-token generators as VerbSpecs — one typed source projected to CLI (today) and
 * MCP/OpenAPI/Anthropic-tool (for free). AGNOSTIC: the palette is an input; the engine solves
 * any palette (Sudoku the *game*, not a particular puzzle). No brand is named here — a brand
 * supplies its own colors and gets its own tokens back.
 *
 * Run:  deno run verbs.ts primitives --palette.0 '#0C5A42' --palette.1 '#EDEAE1' …
 *       deno run --allow-read --allow-write build.ts <palette.json>   (batch a whole palette)
 */
import { z } from "zod";
import { defineVerb, dispatch, type Registry, render } from "verbspec";
import {
  casName,
  contrast,
  contrastCVD,
  hexToOklch,
  luminanceHex,
  merkleRoot,
  cssOklch,
  oklchString,
  oklchToHex,
  type Oklch,
  sha,
} from "./color.ts";

/** deriveSeedPalette — from ONE brand seed color, generate the full palette: warm neutrals faintly
 * tinted toward the seed hue + the accent ladder (vibrant fill + AA-clearing link). The brand seed
 * supplies the HUE; the constraints (AAA/AA lightnesses) generate the set. Sudoku the game. */
export function deriveSeedPalette(seed: string): string[] {
  const { h, c } = hexToOklch(seed);
  const tint = 0.014; // a faint neutral tint toward the brand hue — cohesion without color-cast
  return [
    oklchToHex(96, tint, h), // surface — warm cream
    oklchToHex(91, tint * 1.3, h), // wash / light-on-dark
    oklchToHex(55, tint * 1.6, h), // muted grey
    oklchToHex(20, tint * 1.2, h), // dark surface
    oklchToHex(13, tint, h), // text — near-black warm
    oklchToHex(62, Math.max(c, 0.15), h), // accent — the vibrant brand fill
    oklchToHex(46, Math.max(c * 0.9, 0.14), h), // link — a darker accent that clears AA on the surface
  ];
}
import { ColorPair, Dimension, Measure, NumberValue, PrimitiveColor, PropertyPair, PropertyToken, RootFontSize } from "./schema.ts";
import { TYPE_SCALE_BOUNDS } from "./dimension-constraints.ts";
import { hueName } from "./hue.ts";

/** The color-valued CSS properties, DERIVED from @webref/css (committed artifact). */
const DERIVED_PROPS: string[] = (JSON.parse(Deno.readTextFileSync(new URL("color-properties.derived.json", import.meta.url))) as { properties: { name: string }[] }).properties.map((p) => p.name);

// contrast role of a color property (see color-properties + the contrast-pairs classification)
type Role = "background" | "self-pair" | "exempt" | "text-fg" | "nontext-fg" | "fg-depends";
const roleOf = (p: string): Role =>
  /^(background-color|background)$/.test(p) ? "background"
  : /^scrollbar-color$/.test(p) ? "self-pair"
  : /^(box-shadow-color|flood-color|lighting-color|stop-color)$/.test(p) ? "exempt"
  : /^(color|-webkit-text-fill-color|-webkit-text-stroke-color|-webkit-text-stroke|text-decoration-color|text-emphasis-color|text-decoration|text-emphasis)$/.test(p) ? "text-fg"
  : /^(fill-color|stroke-color)$/.test(p) ? "fg-depends"
  : "nontext-fg";

/** The background bands (light / dark surfaces) DERIVED from the palette itself — the colors a
 * mark sits on. Agnostic: no brand, no fixed hexes. The engine is Sudoku the game, not a puzzle. */
function deriveBands(palette: readonly string[]): Record<string, string[]> {
  const withL = palette.map((h) => ({ h, l: hexToOklch(h).l }));
  let light = withL.filter((x) => x.l >= 80).map((x) => x.h);
  let dark = withL.filter((x) => x.l <= 25).map((x) => x.h);
  if (!light.length) light = [withL.reduce((a, b) => (a.l > b.l ? a : b)).h];
  if (!dark.length) dark = [withL.reduce((a, b) => (a.l < b.l ? a : b)).h];
  return { "light backgrounds": light, "dark backgrounds": dark };
}

/** Plain-English description generated from the computed contrast (normal + CVD). */
function describe(hex: string, o: Oklch, bands: Record<string, string[]>): string {
  const shadeWord = o.l >= 88 ? "very light" : o.l >= 66 ? "light" : o.l >= 44 ? "mid-tone" : o.l >= 24 ? "dark" : "deep";
  let noun: string, useShade = true;
  if (o.c < 0.02) {
    if (o.l >= 98) { noun = "pure white"; useShade = false; } else if (o.l >= 86) { noun = "off-white"; useShade = false; } else if (o.l <= 6) { noun = "pure black"; useShade = false; } else if (o.l <= 24) { noun = "near-black"; useShade = false; } else noun = "grey";
  } else noun = `${(o.h >= 20 && o.h <= 110) ? "warm " : (o.h >= 195 && o.h <= 300) ? "cool " : ""}${hueName(o.h)}`;
  const article = /^[aeiou]/i.test(useShade ? shadeWord : noun) ? "An" : "A";
  const opener = useShade ? `${article} ${shadeWord} ${noun}.` : `${article} ${noun}.`;
  const pairs: { band: string; n: number; v: number; bar: number }[] = [];
  for (const [band, hexes] of Object.entries(bands)) {
    const usable = hexes.filter((g) => g.toLowerCase() !== hex.toLowerCase());
    if (!usable.length) continue;
    const n = Math.min(...usable.map((g) => contrast(luminanceHex(hex), luminanceHex(g))));
    const v = Math.min(...usable.map((g) => contrastCVD(hex, g)));
    if (n >= 3) pairs.push({ band, n, v, bar: n >= 4.5 ? 4.5 : 3 });
  }
  pairs.sort((a, b) => b.n - a.n);
  if (!pairs.length) return `${opener} It's a background surface — other colors sit on it, rather than it on them.`;
  const parts = pairs.map((p) => `As ${p.bar >= 4.5 ? "text" : "borders and dividers"} on ${p.band} it reaches ${p.n.toFixed(1)} to 1 — past ${p.bar >= 4.5 ? "the 4.5:1 minimum for readable text" : "the 3:1 minimum for non-text"} — and still holds ${p.v.toFixed(1)} to 1 for color-blind readers`);
  return `${opener} ${parts.join("; ")}. So it stays legible for everyone, including the three common kinds of color-blindness.`;
}

/** LAYER: primitive — real colors, derived names, generated descriptions. */
export function derivePrimitives(palette: readonly string[]): Record<string, z.infer<typeof PrimitiveColor>> {
  const bands = deriveBands(palette);
  const out: Record<string, z.infer<typeof PrimitiveColor>> = {};
  for (const hex of palette) {
    const o = hexToOklch(hex);
    out[casName(o)] = { $type: "color", $value: cssOklch(o), $sha: sha(oklchString(o)), $description: describe(hex, o, bands) };
  }
  return out;
}

/** Plain-English description of a rem dimension: its size, the AAA floors it meets, why rem. */
function describeDim(rem: number): string {
  const px = Math.round(rem * 16 * 100) / 100;
  const meets: string[] = [];
  if (rem >= 2.75) meets.push("large enough for a 44px minimum target (WCAG 2.5.5 AAA)");
  else if (rem >= 0.125) meets.push("clears the 2px minimum focus outline (WCAG 2.4.11)");
  const note = meets.length ? " " + meets.join("; ") + "." : "";
  return `${rem}rem — ${px}px at the default root (font-size: medium), and it scales with the user's setting.${note} A rem, so it resizes and reflows (1.4.4 / 1.4.10) by construction — never a fixed px.`;
}

/** LAYER: dimension — rem atoms on a GEOMETRIC step function. Size JND is a Weber ratio (~2-3%),
 * so steps are a fixed ratio (default 1.2, well above the JND), anchored at the root's 1rem — like
 * a type scale. Values within one JND collapse to the same step. px/em/ch are unconstructable. */
export function deriveDimensions(scale: readonly number[], ratio = 1.2): Record<string, z.infer<typeof Dimension>> {
  const snap = (r: number) => (r <= 0 ? 0 : Math.round(ratio ** Math.round(Math.log(r) / Math.log(ratio)) * 1000) / 1000);
  const out: Record<string, z.infer<typeof Dimension>> = {};
  for (const raw of scale) {
    const v = snap(raw);
    const value = { $type: "CSSUnitValue" as const, value: v, unit: "rem" };
    out[`rem-${String(v).replace(/\./g, "_")}`] = { $type: "dimension", $value: value, $sha: sha(`${v}rem`), $description: describeDim(v) };
  }
  return out;
}

/** GENERATE the complete valid type scale — the bounds FORCE the ratio (like the color constraints
 * force the palette): given the floor, ceiling, and markdown's role count, the geometric ratio is
 * DETERMINED, not chosen. Returns the distinct rem sizes, snapped to the geometric grid. */
export function generateScale(floor: number = TYPE_SCALE_BOUNDS.floorRem, ceiling: number = TYPE_SCALE_BOUNDS.ceilingRem, roles: number = TYPE_SCALE_BOUNDS.maxRoles): Record<string, z.infer<typeof Dimension>> {
  const ratio = (ceiling / floor) ** (1 / (roles - 1)); // forced by [floor, ceiling] and the role count
  const sizes = Array.from({ length: roles }, (_, i) => Math.round(floor * ratio ** i * 1000) / 1000);
  const dims = deriveDimensions(sizes, ratio);
  // tag each size with its heading level — one size per level, so the declared count == no skipping
  const sorted = Object.values(dims).sort((a, b) => b.$value.value - a.$value.value);
  let h = 1;
  for (const dim of sorted) {
    const v = dim.$value.value;
    const role = v > 1.03 ? `h${h++}` : Math.abs(v - 1) < 0.06 ? "body" : "small";
    dim.$description += ` Heading role: ${role} — one size per level; declaring the count avoids skipping (WCAG 1.3.1 / 2.4.10).`;
  }
  return dims;
}

/** The ROOT font-size — the reference every rem floats on. Fluid = clamp() with a rem floor. */
export function deriveRoot(fluid = true): z.infer<typeof RootFontSize> {
  const rem = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "rem" });
  if (!fluid) {
    return { $type: "root-font-size", $css: "medium", $floor: rem(1), $fluid: false, $description: "Root = the CSS keyword `medium` — the user's default font-size, and the anchor of the absolute-size keyword scale. Every rem floats on it; resizes with the user (1.4.4) by construction." };
  }
  return { $type: "root-font-size", $css: "clamp(1rem, 0.5rem + 0.5vw, 1.25rem)", $floor: rem(1), $cap: rem(1.25), $fluid: true, $description: "Root = clamp(1rem, 0.5rem + 0.5vw, 1.25rem) — a CSSMathClamp. Fluid with the viewport, but FLOORED at the user's 1rem (respects Resize 1.4.4) and capped at 1.25rem. Half the preferred term is rem, so it also scales with the user's own font-size setting." };
}

/** LAYER: number — a unitless ratio (line-height, scale ratio). The 1.5 line-height floor is AAA. */
function describeNumber(n: number): string {
  const note = n >= 1.5 ? " Meets the 1.5 minimum line-height for body text (WCAG 1.4.8 AAA)." : n >= 1 ? " Below 1.5 — fine for headings/large text, not body copy." : "";
  return `A unitless ratio of ${n}.${note} Applied to a length (e.g. line-height × font-size), so it scales with whatever it multiplies.`;
}
export function deriveNumbers(ratios: readonly number[], ratio = 1.06): Record<string, z.infer<typeof NumberValue>> {
  // GEOMETRIC step (Weber JND ~2-3% on the rendered line-box), but PIN 1.5 — the AAA body
  // line-height floor (1.4.8): a value at/just above 1.5 snaps to exactly 1.5, never below.
  const snap = (r: number) => {
    if (r <= 0) return 0;
    if (r >= 1.5 && r < 1.5 * ratio) return 1.5;
    return Math.round(ratio ** Math.round(Math.log(r) / Math.log(ratio)) * 1000) / 1000;
  };
  const out: Record<string, z.infer<typeof NumberValue>> = {};
  for (const raw of ratios) {
    const v = Math.round(snap(raw) * 100) / 100;
    const value = { $type: "CSSUnitValue" as const, value: v, unit: "number" };
    out[`n-${String(v).replace(/\./g, "_")}`] = { $type: "number", $value: value, $sha: sha(`${v}number`), $description: describeNumber(v) };
  }
  return out;
}

/** LAYER: primitive-pair — every valid color pair, merkle-committed. */
export function derivePrimitivePairs(palette: readonly string[]): { $merkleRoot: string; $leafCount: number; pairs: Record<string, z.infer<typeof ColorPair>> } {
  const oks = palette.map((h) => ({ hex: h, o: hexToOklch(h) }));
  const colorSha = Object.fromEntries(oks.map(({ hex, o }) => [casName(o), sha(oklchString(o))]));
  const pairs: Record<string, z.infer<typeof ColorPair>> = {};
  for (let i = 0; i < oks.length; i++) {
    for (let j = i + 1; j < oks.length; j++) {
      const n = contrast(luminanceHex(oks[i].hex), luminanceHex(oks[j].hex)), v = contrastCVD(oks[i].hex, oks[j].hex);
      if (n < 3 || v < 3) continue;
      const clears: ("non-text-3" | "text-AA-4.5" | "text-AAA-7")[] = [];
      if (n >= 3 && v >= 3) clears.push("non-text-3");
      if (n >= 4.5 && v >= 4.5) clears.push("text-AA-4.5");
      if (n >= 7 && v >= 7) clears.push("text-AAA-7");
      const cs = [casName(oks[i].o), casName(oks[j].o)].sort() as [string, string];
      const pairSha = sha(cs.map((c) => colorSha[c]).sort().join(":"));
      pairs[cs.join("<>")] = { $type: "color-pair", $pairSha: pairSha, $colors: cs, $colorShas: Object.fromEntries(cs.map((c) => [c, colorSha[c]])), $ratio: Math.round(n * 100) / 100, $cvd: Math.round(v * 100) / 100, $clears: clears };
    }
  }
  return { $merkleRoot: merkleRoot(Object.values(pairs).map((p) => p.$pairSha)), $leafCount: Object.keys(pairs).length, pairs };
}

/** LAYER: property — every color-valued CSS property → a derived atom by SHA, chosen by role. */
export function derivePropertyTokens(palette: readonly string[]): Record<string, z.infer<typeof PropertyToken>> {
  const prims = derivePrimitives(palette);
  const atoms = Object.keys(prims).map((cas) => ({ cas, l: parseFloat(cas.split("-")[1].replace(/_/g, ".")) }));
  const byL = [...atoms].sort((a, b) => a.l - b.l);
  const darkest = byL[0].cas, lightest = byL[byL.length - 1].cas;
  const mid = [...atoms].sort((a, b) => Math.abs(a.l - 55) - Math.abs(b.l - 55))[0].cas;
  const ATOM: Record<Role, string> = { "text-fg": darkest, "background": lightest, "nontext-fg": mid, "self-pair": mid, "exempt": lightest, "fg-depends": mid };
  const TIER: Record<Role, string> = { "text-fg": "text, pairs with background-color at 7:1 AAA", "background": "the ground — the background side of every pair", "nontext-fg": "non-text, pairs with background-color at 3:1", "self-pair": "a self-contained pair (thumb vs track) at 3:1", "exempt": "decorative — no contrast pair", "fg-depends": "non-text or text — the node decides (text element vs shape)" };
  const out: Record<string, z.infer<typeof PropertyToken>> = {};
  for (const prop of DERIVED_PROPS) {
    const role = roleOf(prop), atom = ATOM[role];
    out[prop] = { $type: "color", $value: prims[atom].$sha, $resolvesTo: atom, $role: role, $description: `CSS \`${prop}\` — ${TIER[role]}. Points to any color with content hash ${prims[atom].$sha} (currently ${atom}).` };
  }
  return out;
}

/** LAYER: property-pair — the contrast relation, keyed by the two property names alphabetically. */
export function deriveContrastPairs(): Record<string, z.infer<typeof PropertyPair>> {
  const candidate: Record<string, string> = { "text-fg": "text (only ever paints text)", "nontext-fg": "non-text (never text)", "fg-depends": "depends — text on a <text> node, non-text on a shape" };
  const out: Record<string, z.infer<typeof PropertyPair>> = {};
  for (const p of DERIVED_PROPS) {
    const r = roleOf(p);
    if (r === "text-fg" || r === "nontext-fg" || r === "fg-depends") {
      const props = [p, "background-color"].sort();
      out[props.join("<>")] = { $type: "contrast-pair", $properties: props, $foreground: p, $background: "background-color", $tierFrom: "node", $candidate: candidate[r], $note: `The tier and ratio come from the NODE carrying \`${p}\` (text? size? shape?); the property only proposes the candidate.`, $check: `Use RESOLVED colors; a concrete pair is a parent→child edge where the resolved \`${p}\` differs from the parent's resolved background-color; equal colors are skipped.` };
    } else if (r === "self-pair") {
      out["scrollbar-color<>scrollbar-color"] = { $type: "contrast-pair", $properties: ["scrollbar-color"], $tierFrom: "property (fixed)", $candidate: "non-text", $note: "self-contained — thumb vs track, both colors in one property; 3:1." };
    }
  }
  return out;
}

const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/i, "hex color");
const PaletteInput = z.object({ palette: z.array(HexColor).min(2) });

export const primitivesVerb = defineVerb({
  id: "primitives",
  summary: "Derive a brand's primitive color tier (real colors, CAS names, generated CVD descriptions).",
  actor: "brand",
  input: PaletteInput,
  output: z.record(z.string(), PrimitiveColor),
  run: ({ palette }) => derivePrimitives(palette),
});

export const primitivePairsVerb = defineVerb({
  id: "primitive-pairs",
  summary: "Derive a brand's valid contrast pairs, merkle-committed (invalid pairs unconstructable).",
  actor: "brand",
  input: PaletteInput,
  output: z.object({ $merkleRoot: z.string(), $leafCount: z.number(), pairs: z.record(z.string(), ColorPair) }),
  run: ({ palette }) => derivePrimitivePairs(palette),
});

export const propertyTokensVerb = defineVerb({
  id: "property-tokens",
  summary: "Derive property tokens — every color-valued CSS property → a derived atom by SHA, by contrast role.",
  actor: "brand",
  input: PaletteInput,
  output: z.record(z.string(), PropertyToken),
  run: ({ palette }) => derivePropertyTokens(palette),
});

export const contrastPairsVerb = defineVerb({
  id: "contrast-pairs",
  summary: "Derive the property-pair relations (background-color<>color …), tier resolved by the node.",
  actor: "brand",
  input: z.object({}),
  output: z.record(z.string(), PropertyPair),
  run: () => deriveContrastPairs(),
});

/** The lone `measure` token — reading width in ch, capped at the 1.4.8 ceiling. */
export function deriveMeasure(ideal = 66, ceiling = 80): z.infer<typeof Measure> {
  const ch = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "ch" });
  const width = Math.min(ideal, ceiling);
  return { $type: "measure", $value: ch(width), $ceiling: ch(ceiling), $sha: sha(`${width}ch`), $description: `Reading width ${width}ch (max ${ceiling}ch — WCAG 1.4.8 AAA). In ch so ~${width} characters per line holds across font sizes; apply as max-width on text containers. One token, not a scale.` };
}

export const measureVerb = defineVerb({
  id: "measure",
  summary: "The reading-width token — ch-relative, ≤80ch (WCAG 1.4.8 AAA). One token, not a family.",
  actor: "brand",
  input: z.object({ ideal: z.number().positive().default(66), ceiling: z.number().positive().default(80) }),
  output: Measure,
  run: ({ ideal, ceiling }) => deriveMeasure(ideal, ceiling),
});

const ScaleInput = z.object({ scale: z.array(z.number().nonnegative()).min(1) });
export const dimensionsVerb = defineVerb({
  id: "dimensions",
  summary: "Derive the dimension tier — rem atoms (px/em/ch unconstructable), snapped to a 0.25rem grid; root is font-size: medium.",
  actor: "brand",
  input: ScaleInput,
  output: z.record(z.string(), Dimension),
  run: ({ scale }) => deriveDimensions(scale),
});

export const numbersVerb = defineVerb({
  id: "numbers",
  summary: "Derive the number tier — unitless ratios (line-heights, scale ratios). The 1.5 line-height floor is WCAG 1.4.8 AAA.",
  actor: "brand",
  input: z.object({ ratios: z.array(z.number().positive()).min(1) }),
  output: z.record(z.string(), NumberValue),
  run: ({ ratios }) => deriveNumbers(ratios),
});

export const typeScaleVerb = defineVerb({
  id: "type-scale",
  summary: "Generate the complete valid type scale — the bounds (floor, ceiling, markdown's 7 roles) FORCE the ratio; returns the derived rem sizes.",
  actor: "brand",
  input: z.object({ floor: z.number().positive().default(TYPE_SCALE_BOUNDS.floorRem), ceiling: z.number().positive().default(TYPE_SCALE_BOUNDS.ceilingRem), roles: z.number().int().min(2).max(7).default(TYPE_SCALE_BOUNDS.maxRoles) }),
  output: z.record(z.string(), Dimension),
  run: ({ floor, ceiling, roles }) => generateScale(floor, ceiling, roles),
});

export const rootVerb = defineVerb({
  id: "root",
  summary: "The root font-size every rem floats on — clamp() with a rem floor (fluid) or `medium`. A vw term without a rem floor is unconstructable (1.4.4).",
  actor: "brand",
  input: z.object({ fluid: z.boolean().default(true) }),
  output: RootFontSize,
  run: ({ fluid }) => deriveRoot(fluid),
});

export const VERBS: Registry = { primitives: primitivesVerb, "primitive-pairs": primitivePairsVerb, "property-tokens": propertyTokensVerb, "contrast-pairs": contrastPairsVerb, dimensions: dimensionsVerb, numbers: numbersVerb, "type-scale": typeScaleVerb, measure: measureVerb, root: rootVerb };

if (import.meta.main) {
  const result = await dispatch(VERBS, Deno.args, "deno run verbs.ts");
  console.log(result.kind === "help" ? result.text : render(result.output));
}
