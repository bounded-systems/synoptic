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
  type Oklch,
  sha,
} from "./color.ts";
import { ColorPair, PrimitiveColor, PropertyPair, PropertyToken } from "./schema.ts";

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
  const hueName = (h: number): string => { for (const [deg, nm] of [[18, "red"], [45, "clay"], [78, "amber"], [105, "gold"], [140, "lime"], [172, "green"], [195, "teal"], [240, "blue"], [290, "indigo"], [335, "magenta"], [360, "red"]] as [number, string][]) if (h <= deg) return nm; return "red"; };
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

export const VERBS: Registry = { primitives: primitivesVerb, "primitive-pairs": primitivePairsVerb, "property-tokens": propertyTokensVerb, "contrast-pairs": contrastPairsVerb };

if (import.meta.main) {
  const result = await dispatch(VERBS, Deno.args, "deno run verbs.ts");
  console.log(result.kind === "help" ? result.text : render(result.output));
}
