/**
 * @module
 * The color-token generators as VerbSpecs — one typed source projected to CLI (today) and
 * MCP/OpenAPI/Anthropic-tool (for free). Palette is an input, so the same verbs derive tokens
 * for bounded-systems and bdelanghe from each one's own colors.
 *
 * Run:  deno run verbs.ts primitives --brand bdelanghe
 *       deno run verbs.ts primitive-pairs --brand bounded-systems
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
  oklchString,
  type Oklch,
  sha,
} from "./color.ts";
import { ColorPair, PrimitiveColor } from "./schema.ts";

/** Each brand's raw palette (real colors, values unchanged). */
export const PALETTES: Record<string, readonly string[]> = {
  "bounded-systems": ["#0C5A42", "#073D2C", "#E2EBE6", "#D2E0D8", "#BBD1CA", "#58B196", "#5F8971", "#EDEAE1", "#FFFFFF", "#16221C", "#5C6B63", "#888374", "#9F3E2B", "#F9EDE9", "#8C5818", "#F3E8D6"],
  "bdelanghe": ["#0C5A42", "#073D2C", "#16221C", "#28664B", "#3FB984", "#45524A", "#5C6B63", "#665425", "#7E8C83", "#9FDCC2", "#A6432F", "#B5762A", "#BFC6C1", "#C8902F", "#D2E0D8", "#E2EBE6", "#E4C897", "#E4E0D4"],
};
const BANDS: Record<string, readonly string[]> = { "light backgrounds": ["#EDEAE1", "#FFFFFF"], "dark backgrounds": ["#0C5A42", "#073D2C", "#16221C"] };

/** Plain-English description generated from the computed contrast (normal + CVD). */
function describe(hex: string, o: Oklch): string {
  const hueName = (h: number): string => { for (const [deg, nm] of [[18, "red"], [45, "clay"], [78, "amber"], [105, "gold"], [140, "lime"], [172, "green"], [195, "teal"], [240, "blue"], [290, "indigo"], [335, "magenta"], [360, "red"]] as [number, string][]) if (h <= deg) return nm; return "red"; };
  const shadeWord = o.l >= 88 ? "very light" : o.l >= 66 ? "light" : o.l >= 44 ? "mid-tone" : o.l >= 24 ? "dark" : "deep";
  let noun: string, useShade = true;
  if (o.c < 0.02) {
    if (o.l >= 98) { noun = "pure white"; useShade = false; } else if (o.l >= 86) { noun = "off-white"; useShade = false; } else if (o.l <= 6) { noun = "pure black"; useShade = false; } else if (o.l <= 24) { noun = "near-black"; useShade = false; } else noun = "grey";
  } else noun = `${(o.h >= 20 && o.h <= 110) ? "warm " : (o.h >= 195 && o.h <= 300) ? "cool " : ""}${hueName(o.h)}`;
  const article = /^[aeiou]/i.test(useShade ? shadeWord : noun) ? "An" : "A";
  const opener = useShade ? `${article} ${shadeWord} ${noun}.` : `${article} ${noun}.`;
  const pairs: { band: string; n: number; v: number; bar: number }[] = [];
  for (const [band, hexes] of Object.entries(BANDS)) {
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
  const out: Record<string, z.infer<typeof PrimitiveColor>> = {};
  for (const hex of palette) {
    const o = hexToOklch(hex), value = oklchString(o);
    out[casName(o)] = { $type: "color", $value: value, $sha: sha(value), $description: describe(hex, o) };
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

const BrandInput = z.object({ brand: z.enum(["bounded-systems", "bdelanghe"]).default("bounded-systems") });

export const primitivesVerb = defineVerb({
  id: "primitives",
  summary: "Derive a brand's primitive color tier (real colors, CAS names, generated CVD descriptions).",
  actor: "brand",
  input: BrandInput,
  output: z.record(z.string(), PrimitiveColor),
  run: ({ brand }) => derivePrimitives(PALETTES[brand]),
});

export const primitivePairsVerb = defineVerb({
  id: "primitive-pairs",
  summary: "Derive a brand's valid contrast pairs, merkle-committed (invalid pairs unconstructable).",
  actor: "brand",
  input: BrandInput,
  output: z.object({ $merkleRoot: z.string(), $leafCount: z.number(), pairs: z.record(z.string(), ColorPair) }),
  run: ({ brand }) => derivePrimitivePairs(PALETTES[brand]),
});

export const VERBS: Registry = { primitives: primitivesVerb, "primitive-pairs": primitivePairsVerb };

if (import.meta.main) {
  const result = await dispatch(VERBS, Deno.args, "deno run verbs.ts");
  console.log(result.kind === "help" ? result.text : render(result.output));
}
