// The appliesTo → node-types resolution, formalized. A property's `appliesTo` (webref prose)
// normalizes to a typed AppliesResolution: either an enumerable element set (tag decides) or a
// display/overflow predicate (computed style decides). appliesToNode() answers "does this property
// apply to this node?" — statically where the category is element-intrinsic, per-node otherwise.
import { z } from "zod";

/** A property's appliesTo, normalized to a typed resolution. */
export const AppliesResolution = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }), // every element (± text)
  z.object({ kind: z.literal("elements"), elements: z.array(z.string()), includesText: z.boolean() }), // tag decides
  z.object({ kind: z.literal("display"), property: z.enum(["display", "overflow"]), oneOf: z.array(z.string()) }), // computed style decides
  z.object({ kind: z.literal("text") }), // text runs
  z.object({ kind: z.literal("unknown"), note: z.string() }), // "see individual properties" — can't decide statically
]);
export type AppliesResolution = z.infer<typeof AppliesResolution>;

const SVG_SHAPES = ["rect", "circle", "ellipse", "line", "polygon", "polyline", "path"];
const BLOCKISH = ["block", "flow-root", "inline-block", "list-item", "table-cell", "flex", "grid", "table"];

/** Normalize a webref `appliesTo` string into a typed resolution. */
export function normalizeAppliesTo(prose: string): AppliesResolution {
  const p = prose.toLowerCase();
  if (/^all elements/.test(p)) return { kind: "all" };
  if (/text and svg shapes/.test(p)) return { kind: "elements", elements: ["text", ...SVG_SHAPES], includesText: true };
  if (/feflood.*fedropshadow/.test(p)) return { kind: "elements", elements: ["feFlood", "feDropShadow"], includesText: false };
  if (/fediffuselighting.*fespecularlighting/.test(p)) return { kind: "elements", elements: ["feDiffuseLighting", "feSpecularLighting"], includesText: false };
  if (/accept text input/.test(p)) return { kind: "elements", elements: ["input", "textarea"], includesText: true };
  if (/scroll containers/.test(p)) return { kind: "display", property: "overflow", oneOf: ["scroll", "auto"] };
  if (/block containers/.test(p)) return { kind: "display", property: "display", oneOf: ["block", "flow-root", "list-item", "table-cell", "inline-block"] };
  if (/(accept width or height)|(same as height and width)|(size containment)/.test(p)) return { kind: "display", property: "display", oneOf: BLOCKISH };
  if (/^text$/.test(p)) return { kind: "text" };
  return { kind: "unknown", note: prose };
}

/** A node's minimal context for resolving appliesTo — the tag + computed display/overflow. */
export const NodeContext = z.object({ tag: z.string(), display: z.string().optional(), overflow: z.string().optional() });
export type NodeContext = z.infer<typeof NodeContext>;

/** Does a property (via its resolution) apply to this node? */
export function appliesToNode(r: AppliesResolution, node: NodeContext): boolean {
  switch (r.kind) {
    case "all":
    case "text":
    case "unknown":
      return true; // applicable or can't reject statically
    case "elements":
      return r.elements.includes(node.tag);
    case "display":
      return r.property === "display" ? r.oneOf.includes(node.display ?? "") : r.oneOf.includes(node.overflow ?? "");
  }
}
