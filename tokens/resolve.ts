/**
 * @module
 * The node-pair layer: turn property pairs into CONCRETE, checked instances. For each parent→child
 * edge whose RESOLVED colors differ, look the color-pair up in the merkle: RESOLVED if its
 * $pairSha is in the validated set, else the combination is un-validated (a claim that doesn't
 * hold). When the adjacent painted region can't be determined (gradient/image bg, positioning,
 * opacity, filters), the pair is INCONCLUSIVE — we claim the shortcoming, we don't fix it.
 *
 * The pure core (loadPairSet, checkPair, resolveTree) runs anywhere. The browser adapter
 * (computedStyleMap → ResolvedTree) runs in a browser / headless renderer — Deno has no
 * computedStyleMap, which is also where "resolved, not cascade" actually comes from.
 */
import { sha } from "./color.ts";
import type { CSSOKLCH } from "./typed-om.ts";
import type { ColorPair, NodePair } from "./schema.ts";

/** The validated pair set (from primitive-pairs.json): pairSha membership + content addressing. */
export interface PairSet {
  has(pairSha: string): boolean;
  colorSha(o: CSSOKLCH): string;
  pairSha(a: CSSOKLCH, b: CSSOKLCH): string;
}
export function loadPairSet(doc: { "primitive-pairs": Record<string, unknown> }): PairSet {
  const shas = new Set<string>();
  for (const [k, v] of Object.entries(doc["primitive-pairs"])) if (!k.startsWith("$")) shas.add((v as ColorPair).$pairSha);
  const colorSha = (o: CSSOKLCH) => sha(`oklch(${o.l}% ${o.c} ${o.h} / ${o.alpha})`);
  const pairSha = (a: CSSOKLCH, b: CSSOKLCH) => sha([colorSha(a), colorSha(b)].sort().join(":"));
  return { has: (s) => shas.has(s), colorSha, pairSha };
}

/** Pure core: is this concrete (fg on bg) a validated pair? */
export function checkPair(fg: CSSOKLCH, bg: CSSOKLCH, set: PairSet): { pairSha: string; validated: boolean } {
  const pairSha = set.pairSha(fg, bg);
  return { pairSha, validated: set.has(pairSha) };
}

const same = (a: CSSOKLCH, b: CSSOKLCH) => a.l === b.l && a.c === b.c && a.h === b.h && a.alpha === b.alpha;

/** A resolved node: its computed foreground + its effective background, produced by the adapter. */
export interface ResolvedNode {
  id: string;
  color: CSSOKLCH | null; // resolved `color` (or null if it renders no text)
  bg: CSSOKLCH | null; // effective background-color (nearest painted ancestor)
  bgIndeterminate: boolean; // true when the adjacent region can't be pinned (image/gradient/positioned/opacity)
  children: ResolvedNode[];
}

/** Walk the resolved tree → concrete node-pairs, each RESOLVED (valid/invalid) or INCONCLUSIVE. */
export function resolveTree(root: ResolvedNode, set: PairSet): NodePair[] {
  const out: NodePair[] = [];
  const visit = (node: ResolvedNode) => {
    for (const child of node.children) {
      if (child.color && node.bg && !same(child.color, node.bg)) { // a real pair only when colors differ
        if (node.bgIndeterminate) {
          out.push({ $type: "node-pair", $nodes: [node.id, child.id], $pairSha: "0".repeat(12), $status: "inconclusive", $reason: "adjacent painted region indeterminate (image/gradient/positioning/opacity/filter)" });
        } else {
          const { pairSha, validated } = checkPair(child.color, node.bg, set);
          out.push({ $type: "node-pair", $nodes: [node.id, child.id], $pairSha: validated ? pairSha : "0".repeat(12), $status: "resolved", $reason: validated ? undefined : "un-validated combination — no $pairSha in the merkle set (a claim that does not hold)" });
        }
      }
      visit(child);
    }
  };
  visit(root);
  return out;
}

// ── browser adapter (computedStyleMap) — runs in a browser / headless renderer ────────────────
// Deno has no computedStyleMap; this is the sketch of how the ResolvedTree is produced there.
// deno-lint-ignore no-explicit-any
type El = any;
/** Read an element's resolved `color`/`background-color` via computedStyleMap and build the tree. */
export function adaptDom(el: El, parse: (cssText: string) => CSSOKLCH | null): ResolvedNode {
  const map = el.computedStyleMap();
  const color = parse(map.get("color")?.toString() ?? "");
  const rawBg = map.get("background-color")?.toString() ?? "";
  const bgIndeterminate = (map.get("background-image")?.toString() ?? "none") !== "none" ||
    (map.get("opacity")?.toString() ?? "1") !== "1" ||
    ["absolute", "fixed"].includes(map.get("position")?.toString() ?? "static");
  // effective background: this element's painted bg, else walk ancestors
  let bg = parse(rawBg);
  if (!bg && el.parentElement) bg = adaptDom(el.parentElement, parse).bg; // nearest painted ancestor
  return { id: el.id || el.tagName?.toLowerCase() || "node", color, bg, bgIndeterminate, children: [...el.children].map((c: El) => adaptDom(c, parse)) };
}
