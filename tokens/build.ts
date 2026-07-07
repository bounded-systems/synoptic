// Write the four token files from a palette. Agnostic: the palette is data, passed in — the
// engine names no brand. Run: deno run --allow-read --allow-write build.ts <palette.json> [outDir]
// palette.json is a JSON array of hex strings, e.g. ["#0C5A42", "#EDEAE1", …].
import { deriveContrastPairs, deriveDimensions, derivePrimitivePairs, derivePrimitives, derivePropertyTokens, deriveRoot } from "./verbs.ts";

const paletteFile = Deno.args[0];
if (!paletteFile) { console.error("usage: build.ts <palette.json> [outDir] [scale.json]"); Deno.exit(1); }
const outDir = Deno.args[1] ?? ".";
const palette = JSON.parse(Deno.readTextFileSync(paletteFile)) as string[];
const scaleFile = Deno.args[2] ?? new URL("examples/example.scale.json", import.meta.url);
const scale = JSON.parse(Deno.readTextFileSync(scaleFile)) as number[];

const pp = derivePrimitivePairs(palette);
const write = (name: string, obj: unknown) => Deno.writeTextFileSync(`${outDir}/${name}`, JSON.stringify(obj, null, 2) + "\n");

write("primitives.derived.json", {
  primitive: { $description: "Derived primitives — a palette's real colors, names derived from their oklch coordinates, descriptions generated from computed contrast under normal + deuteranopia/protanopia/tritanopia vision. No brand named; the name IS the color; the doc is computed from the value so it cannot drift.", ...derivePrimitives(palette) },
});
write("dimensions.derived.json", {
  dimension: { $description: "Derived dimensions — rem atoms LOCKED to rem (px/em/ch unconstructable: they fail Resize 1.4.4 / Reflow 1.4.10), snapped to a 0.25rem grid. $root is the fluid clamp() every rem floats on. AAA floors noted per atom (2.75rem target 2.5.5, 0.125rem focus 2.4.11).", $root: deriveRoot(true), ...deriveDimensions(scale) },
});
write("primitive-pairs.json", {
  "primitive-pairs": { $description: "Contrast pairs between the derived atoms — a merkle over the PRE-VALIDATED set. Only valid pairs (>=3:1 normally AND under CVD). Each has a $pairSha; an un-validated combination has none, so it is unconstructable.", $merkleRoot: pp.$merkleRoot, $leafCount: pp.$leafCount, ...pp.pairs },
});
write("property.tokens.json", {
  property: { $description: "Property tokens — keyed by the full CSS property that reaches <color> (StylePropertyMapReadOnly.keys()), DERIVED from @webref/css. $value is the short SHA of a derived atom, chosen by the property's contrast role.", ...derivePropertyTokens(palette) },
});
write("contrast-pairs.json", {
  "contrast-pairs": {
    $description: "Valid contrast pairs, keyed by the two CSS color properties in alphabetical order joined with '<>'. Only foregrounds that require contrast against background-color. Derived from the webref color-property set — palette-independent.",
    $tierResolution: "The tier (text vs non-text) is NOT fixed by the property — it comes from the NODE carrying the foreground: text? size (large → 4.5:1)? text-element or shape?",
    $treeResolution: "Use RESOLVED colors per node — not the cascade. A concrete pair is a parent→child edge whose resolved colors DIFFER; equal colors = no pair. Background = parent's resolved background-color; foreground = child's resolved color.",
    $claimStatus: "RESOLVED (single determinable colors) or INCONCLUSIVE (adjacent region indeterminate: positioning, z-index, overlap, image/gradient, opacity/blend, transforms, filters). For INCONCLUSIVE we CLAIM THE SHORTCOMING, not fix it.",
    $containment: "CONTAINED pairs (mark on the element's own background) always resolvable. SPAN pairs (border/outline vs adjacent) resolvable for a solid painted parent, else inconclusive.",
    ...deriveContrastPairs(),
  },
});
console.log(`wrote 5 token files → ${outDir} (${palette.length} colors → ${pp.$leafCount} valid pairs, merkle ${pp.$merkleRoot.slice(0, 12)}…)`);
