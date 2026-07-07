// Mock DOMs (resolved trees) that exercise the node-pair resolver end to end. No browser needed:
// each test builds a small ResolvedNode tree (what the computedStyleMap adapter would produce) and
// asserts the resolver's verdict — valid pair, un-validated pair, inconclusive, same-color skip.
import { assert, assertEquals } from "jsr:@std/assert@^1";
import { cssOklch, hexToOklch } from "./color.ts";
import { derivePrimitivePairs } from "./verbs.ts";
import { checkTextSpacing, loadPairSet, type ResolvedNode, resolveTree } from "./resolve.ts";

const palette: string[] = JSON.parse(Deno.readTextFileSync(new URL("examples/example.palette.json", import.meta.url)));
const set = loadPairSet({ "primitive-pairs": derivePrimitivePairs(palette).pairs as Record<string, unknown> });
const ok = (hex: string) => cssOklch(hexToOklch(hex));
const node = (id: string, o: Partial<ResolvedNode>): ResolvedNode => ({ id, color: null, bg: null, bgIndeterminate: false, children: [], ...o });
const UNSET = "0".repeat(12);

// example palette contains #0A1620 (deep), #FFFFFF (white), #7FA0B5 (mid blue), #EAF0F4 (near-white)
Deno.test("valid pair — deep text on white → resolved + validated (pairSha in merkle)", () => {
  const tree = node("page", { bg: ok("#FFFFFF"), children: [node("body", { color: ok("#0A1620") })] });
  const pairs = resolveTree(tree, set);
  assertEquals(pairs.length, 1);
  assertEquals(pairs[0].$status, "resolved");
  assert(pairs[0].$pairSha !== UNSET, "a validated pair carries its real $pairSha");
});

Deno.test("invalid pair — low-contrast mid-blue on near-white → resolved but NOT validated", () => {
  const tree = node("page", { bg: ok("#EAF0F4"), children: [node("hint", { color: ok("#7FA0B5") })] });
  const pairs = resolveTree(tree, set);
  assertEquals(pairs.length, 1);
  assertEquals(pairs[0].$status, "resolved");
  assertEquals(pairs[0].$pairSha, UNSET, "un-validated combination has no $pairSha — a claim that does not hold");
});

Deno.test("inconclusive — indeterminate background → claimed, not fixed", () => {
  const tree = node("page", { bg: ok("#FFFFFF"), bgIndeterminate: true, children: [node("hero", { color: ok("#0A1620") })] });
  assertEquals(resolveTree(tree, set)[0].$status, "inconclusive");
});

Deno.test("same color — parent bg equals child color → no pair (nothing to distinguish)", () => {
  const tree = node("page", { bg: ok("#FFFFFF"), children: [node("ghost", { color: ok("#FFFFFF") })] });
  assertEquals(resolveTree(tree, set).length, 0);
});

Deno.test("disabled node — exempt from contrast (1.4.3 inactive exception)", () => {
  const tree = node("page", { bg: ok("#FFFFFF"), children: [node("btn", { color: ok("#7FA0B5"), disabled: true })] });
  const p = resolveTree(tree, set)[0];
  assertEquals(p.$status, "exempt");
  assertEquals(p.$concern, "1.4.3");
});

Deno.test("focus outline — thin outline fails the 2.4.11 area check", () => {
  const tree = node("page", { bg: ok("#FFFFFF"), children: [node("link", { outline: { color: ok("#0A1620"), widthPx: 1 } })] });
  const focus = resolveTree(tree, set).find((p) => p.$concern === "2.4.11");
  assert(focus && /< 2px/.test(focus.$reason ?? ""), "a 1px outline is flagged for insufficient area");
});

Deno.test("nested tree — walks parent→child recursively across a re-painted surface", () => {
  const tree = node("page", {
    bg: ok("#FFFFFF"),
    children: [node("card", { bg: ok("#0A1620"), color: ok("#0A1620"), children: [node("title", { color: ok("#FFFFFF") })] })],
  });
  const pairs = resolveTree(tree, set); // page→card (dark on white) and card→title (white on dark)
  assertEquals(pairs.length, 2);
  assert(pairs.every((p) => p.$status === "resolved" && p.$pairSha !== UNSET), "both are validated pairs");
});

Deno.test("text-spacing (1.4.12) — resilient vs clipping", () => {
  assertEquals(checkTextSpacing({ id: "p", overflowsUnderSpacing: false }).status, "resilient");
  assertEquals(checkTextSpacing({ id: "card", overflowsUnderSpacing: true }).status, "fails");
});
