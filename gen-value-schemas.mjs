#!/usr/bin/env node
// synoptic gen-value-schemas — GENERATE value-type JSON Schemas FROM the CSS Typed OM
// WebIDL, so spec/value/* is DERIVED (proofType: derivable), not hand-asserted. Prefers
// @webref/idl (css-typed-om) when installed (nix/CI); falls back to the vendored
// spec/typed-om.webidl. A minimal WebIDL parse (interfaces + attributes) is enough for the
// Typed OM value subset; @webref/idl uses webidl2 for the full grammar.
//   node gen-value-schemas.mjs [--out spec/value/generated]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const outI = process.argv.indexOf("--out"); const OUT = outI >= 0 ? process.argv[outI + 1] : join(HERE, "spec/value/generated");

// --- get the WebIDL: prefer @webref/idl, else the vendored file ---
let idl = null, source = "vendored";
try { const w = await import("@webref/idl"); const p = await w.parse(); idl = p["css-typed-om"]?.idl ?? null; if (idl) source = "@webref/idl"; } catch { /* fallback */ }
if (!idl) idl = readFileSync(join(HERE, "spec/typed-om.webidl"), "utf8");

// --- minimal WebIDL parse: interfaces + (readonly) attributes ---
function parse(text) {
  const ifaces = {};
  const re = /interface\s+(\w+)(?:\s*:\s*(\w+))?\s*\{([\s\S]*?)\};/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const attrs = [];
    const are = /(?:readonly\s+)?attribute\s+([\w? ]+?)\s+(\w+)\s*;/g;
    let a; while ((a = are.exec(m[3])) !== null) attrs.push({ type: a[1].trim(), name: a[2] });
    ifaces[m[1]] = { name: m[1], parent: m[2] || null, attrs };
  }
  return ifaces;
}
// resolve inherited attributes up the interface chain
function allAttrs(ifaces, name) {
  const seen = {}, order = [];
  for (let n = name; n && ifaces[n]; n = ifaces[n].parent)
    for (const at of ifaces[n].attrs) if (!(at.name in seen)) { seen[at.name] = at; order.unshift(at); }
  return order;
}
const IDL_TO_JSON = { double: "number", "unrestricted double": "number", float: "number", long: "integer", "unsigned long": "integer", USVString: "string", DOMString: "string", ByteString: "string", boolean: "boolean" };

// map a Typed OM interface → our value $type + extra canonical constraints
const MAP = {
  CSSUnitValue: { $type: "dimension", note: "length in canonical unit rem", extra: { unit: { const: "rem" } } },
  CSSKeywordValue: { $type: "keyword", note: "a CSS keyword / <ident>" },
};

const ifaces = parse(idl);
mkdirSync(OUT, { recursive: true });
const made = [];
for (const [iface, map] of Object.entries(MAP)) {
  if (!ifaces[iface]) continue;
  const props = { $type: { const: map.$type } };
  const required = ["$type"];
  for (const at of allAttrs(ifaces, iface)) {
    props[at.name] = { ...(IDL_TO_JSON[at.type] ? { type: IDL_TO_JSON[at.type] } : {}), ...(map.extra?.[at.name] || {}) };
    required.push(at.name);
  }
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://bounded.tools/synoptic/spec/value/generated/${map.$type}.schema.json`,
    title: map.$type[0].toUpperCase() + map.$type.slice(1),
    description: `GENERATED from CSS Typed OM \`${iface}\` (${source}) — ${map.note}. Do not hand-edit; run gen-value-schemas.`,
    type: "object", additionalProperties: false, properties: props, required,
    "x-generatedFrom": { typedOM: iface, source },
  };
  writeFileSync(join(OUT, `${map.$type}.schema.json`), JSON.stringify(schema, null, 2) + "\n");
  made.push(`${map.$type} ← ${iface}`);
}
console.log(`gen-value-schemas — source: ${source}`);
console.log(`  parsed ${Object.keys(ifaces).length} interface(s): ${Object.keys(ifaces).join(", ")}`);
console.log(`  generated: ${made.join("  ·  ")}`);
console.log(`  → ${OUT}/`);
