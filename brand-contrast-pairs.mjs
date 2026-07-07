#!/usr/bin/env node
// Build the contrast PAIRS as property pairs. A pair is two CSS color properties whose colors
// must clear a ratio; its key is the two FULL property names in alphabetical order joined by
// "<>" (e.g. background-color<>color). ONLY valid pairs: a foreground that requires contrast on
// its background. background-color is the ground (never a foreground); exempt properties
// (flood/lighting/stop/box-shadow-color) form no pair. Derived from the webref color-property set.
import { readFileSync } from "node:fs";
const derived = JSON.parse(readFileSync("/tmp/synoptic/tokens/color-properties.derived.json","utf8")).properties.map(p=>p.name);

const BG=/^(background-color|background)$/, SELF=/^scrollbar-color$/, EXEMPT=/^(box-shadow-color|flood-color|lighting-color|stop-color)$/;
const ALWAYS_TEXT=/^(color|-webkit-text-fill-color|-webkit-text-stroke-color|-webkit-text-stroke|text-decoration-color|text-emphasis-color|text-decoration|text-emphasis)$/;
const DEPENDS=/^(fill-color|stroke-color)$/;             // text element vs shape — the node decides
const roleOf=(p)=> BG.test(p)?"background": SELF.test(p)?"self": EXEMPT.test(p)?"exempt": ALWAYS_TEXT.test(p)?"text-fg": DEPENDS.test(p)?"fg-depends":"nontext-fg";
// what the property proposes; the NODE that carries it resolves the actual tier + ratio
const candidate={ "text-fg":"text (only ever paints text)", "nontext-fg":"non-text (never text)", "fg-depends":"depends — text on a <text> node, non-text on a shape" };

const pairs={};
for (const p of derived) {
  const r=roleOf(p);
  if (r==="text-fg" || r==="nontext-fg" || r==="fg-depends") {
    const props=[p,"background-color"].sort();            // alphabetical
    pairs[props.join("<>")]={ "$type":"contrast-pair", "$properties":props, "$foreground":p, "$background":"background-color",
      "$tierFrom":"node", "$candidate":candidate[r],
      "$note":`The tier (text 7:1/4.5:1 or non-text 3:1) and the exact ratio come from the NODE carrying \`${p}\`: does it render text, and at what size (large text → 4.5:1)? The property only proposes the candidate.`,
      "$check":`Use RESOLVED colors. A concrete pair is a parent→child edge where the resolved \`${p}\` differs from the parent's resolved background-color; equal colors are skipped (nothing to distinguish).` };
  } else if (r==="self") {
    pairs["scrollbar-color<>scrollbar-color"]={ "$type":"contrast-pair", "$properties":["scrollbar-color"],
      "$note":"self-contained — thumb color vs track color, both in one property; non-text, 3:1", "$tierFrom":"property (fixed)", "$candidate":"non-text" };
  }
  // background-color and exempt properties form no pair
}
const doc={ "contrast-pairs":{
  "$description":"Valid contrast pairs, keyed by the two CSS color properties in alphabetical order joined with '<>'. Only foregrounds that require contrast against background-color; exempt properties (flood/lighting/stop/box-shadow-color) omitted. Derived from the webref color-property set.",
  "$tierResolution":"The tier (text vs non-text) is NOT fixed by the property — it comes from the NODE carrying the foreground: does it render text, at what size (large → 4.5:1), text-element or shape? The property only proposes a candidate.",
  "$treeResolution":"Use RESOLVED (computed) colors per node — not the cascade/inheritance chain. A concrete pair is a parent→child edge whose resolved colors DIFFER; if parent and child resolve to the same color there is no pair (nothing to distinguish). The background side is the parent's resolved background-color, the foreground the child's resolved color.",
  "$claimStatus":"A pair on a real node resolves to one of: RESOLVED — foreground and background are single determinable colors (contained pairs always; span pairs when the neighbour is a solid painted parent); or INCONCLUSIVE — the adjacent painted region cannot be determined from computed style + tree alone: absolute/fixed positioning, z-index stacking, overlapping siblings, background-image/gradient (no single color), opacity / mix-blend-mode, transforms, filters. For INCONCLUSIVE cases we CLAIM THE SHORTCOMING (record an honest 'adjacent-region-indeterminate' limitation) rather than fix it — that would need full layout + rendering, out of scope. HTML will not always be perfect here; the claim is the deliverable, not a fix.",
  "$containment":"CONTAINED pairs (color/text/marks/paint on the element's own background) are always RESOLVED. SPAN pairs (border/outline vs the adjacent region) are RESOLVED for a solid painted parent, else INCONCLUSIVE.",
  ...pairs } };
if (process.argv.includes("--json")) { console.log(JSON.stringify(doc,null,2)); process.exit(0); }

const names=Object.keys(pairs);
const grp=(re)=>names.filter(n=>re.test(pairs[n].$candidate||""));
const text=grp(/^text/), nontext=grp(/^non-text/), dep=grp(/^depends/);
console.log(`${names.length} valid contrast pairs (alphabetical keys); tier resolves from the node, so these are candidates:\n`);
console.log(`  candidate TEXT — ${text.length}:`); for(const n of text) console.log("      "+n);
console.log(`\n  candidate NON-TEXT — ${nontext.length}:`); for(const n of nontext) console.log("      "+n);
console.log(`\n  candidate DEPENDS-ON-NODE — ${dep.length}:`); for(const n of dep) console.log("      "+n);
