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

/** A resolved node: its computed foreground + effective background + the state the tier depends on. */
export interface ResolvedNode {
  id: string;
  color: CSSOKLCH | null; // resolved `color` (or null if it renders no text)
  bg: CSSOKLCH | null; // effective background-color (nearest painted ancestor)
  bgIndeterminate: boolean; // adjacent region can't be pinned (image/gradient/positioned/opacity)
  disabled?: boolean; // disabled/inactive → the pair is EXEMPT from contrast (1.4.3 exception)
  outline?: { color: CSSOKLCH | null; widthPx: number }; // focus indicator → 2.4.11 (contrast + area)
  children: ResolvedNode[];
}
const UNSET = "0".repeat(12);

/** Walk the resolved tree → concrete node-pairs: RESOLVED / INCONCLUSIVE / EXEMPT, each tagged
 * with the SC it concerns. Text pairs → 1.4.6; disabled → exempt (1.4.3); focus outline → 2.4.11
 * (contrast AND a >=2px area check the browser adapter reads). */
export function resolveTree(root: ResolvedNode, set: PairSet): NodePair[] {
  const out: NodePair[] = [];
  const visit = (node: ResolvedNode) => {
    for (const child of node.children) {
      // text pair — child.color on the effective background
      if (child.color && node.bg && !same(child.color, node.bg)) {
        if (child.disabled) {
          out.push({ $type: "node-pair", $nodes: [node.id, child.id], $pairSha: UNSET, $status: "exempt", $concern: "1.4.3", $reason: "disabled/inactive element — exempt from contrast" });
        } else if (node.bgIndeterminate) {
          out.push({ $type: "node-pair", $nodes: [node.id, child.id], $pairSha: UNSET, $status: "inconclusive", $concern: "1.4.6", $reason: "adjacent painted region indeterminate (image/gradient/positioning/opacity/filter)" });
        } else {
          const { pairSha, validated } = checkPair(child.color, node.bg, set);
          out.push({ $type: "node-pair", $nodes: [node.id, child.id], $pairSha: validated ? pairSha : UNSET, $status: "resolved", $concern: "1.4.6", $reason: validated ? undefined : "un-validated combination — no $pairSha in the merkle set (a claim that does not hold)" });
        }
      }
      // focus pair — outline color vs the adjacent background, PLUS the 2.4.11 area check
      if (child.outline?.color && node.bg && !child.disabled) {
        const { pairSha, validated } = checkPair(child.outline.color, node.bg, set);
        const areaOk = child.outline.widthPx >= 2;
        out.push({ $type: "node-pair", $nodes: [node.id, `${child.id}:focus`], $pairSha: validated && areaOk ? pairSha : UNSET, $status: "resolved", $concern: "2.4.11", $reason: !areaOk ? `focus outline ${child.outline.widthPx}px < 2px minimum area` : validated ? undefined : "focus outline color un-validated against its background" });
      }
      visit(child);
    }
  };
  visit(root);
  return out;
}

// ── text-spacing resilience (WCAG 1.4.12) — a CHECK, not tokens ──────────────────────────────
// The user may override spacing to these minimums; the requirement is that the layout survives
// (no clipping/overlap). There is nothing to mint — only to verify. The browser adapter applies
// the spacing and reports whether the node overflows; this core turns that into a claim.
export const TEXT_SPACING = { letterSpacing: "0.12em", wordSpacing: "0.16em", lineHeight: 1.5, paragraphSpacing: "2em" } as const;
export function checkTextSpacing(node: { id: string; overflowsUnderSpacing: boolean }): { node: string; status: "resilient" | "fails"; concern: "1.4.12"; reason?: string } {
  return node.overflowsUnderSpacing
    ? { node: node.id, status: "fails", concern: "1.4.12", reason: "content clips or overlaps when the user applies text-spacing (letter 0.12em / word 0.16em / line-height 1.5 / paragraph 2em)" }
    : { node: node.id, status: "resilient", concern: "1.4.12" };
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
