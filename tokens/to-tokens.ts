// Emit the derived tokens as interchange formats from the SAME derivation as to-css.ts:
//   1. tokens.dtcg.json — W3C Design Tokens Community Group format ($type/$value + aliases). The
//      standard Style Dictionary v4, Figma, and Tokens Studio all read.
//   2. tokens.sd.json — Style Dictionary's native shape (category/type + value), for SD v3 builds.
// Roles ALIAS the primitives (the JSON analogue of the CSS var() indirection). One derivation, many
// outputs — a hand-edit can't drift them because they're generated together.
// Run: deno run -RW to-tokens.ts <brand.json> <outDir>
import { serialize } from "./serialize.ts";
import { deriveDimensions, deriveMeasure, generateScale } from "./verbs.ts";
import { deriveWeights } from "./extras.ts";
import { deriveAtoms, deriveRoles } from "./derive.ts";
import { ROLE_ORDER } from "./roles.ts";
import { LINE_HEIGHT_BODY, LINE_HEIGHT_HEADING, SPACE, SPACING_RATIO, SPACING_STOPS } from "./constants.ts";
import { loadBrand } from "./config.ts";

const brand = loadBrand(Deno.args[0]);
const outDir = Deno.args[1] ?? ".";
const atoms = deriveAtoms(brand);
const roles = deriveRoles(atoms, brand);
const typeScale = generateScale(brand.typeScale.floorRem, brand.typeScale.ceilingRem, brand.typeScale.roles);
const spacing = deriveDimensions([...SPACING_STOPS], SPACING_RATIO);
const weights = deriveWeights();
const measureCh = deriveMeasure(brand.measure).$value.value;
const remOf = (dm: unknown) => `${(dm as { $value: { value: number } }).$value.value}rem`;
const sizeRole = (cas: string) => (Object.entries(typeScale).find(([k]) => k === cas)?.[1].$description.match(/role: (\S+)/)?.[1]) ?? cas;

// ── 1. W3C DTCG — $type/$value; roles alias the primitives by reference ──
const dtcg = {
  $description: `Design tokens for brand "${brand.name}", derived from seed ${brand.seed}. W3C DTCG format.`,
  color: {
    $type: "color",
    primitive: Object.fromEntries(atoms.map((a) => [a.cas, { $value: serialize(a.value) }])),
    role: Object.fromEntries(ROLE_ORDER.map((r) => [r, { $value: `{color.primitive.${roles[r].cas}}` }])),
  },
  dimension: {
    $type: "dimension",
    space: Object.fromEntries(Object.entries(SPACE).map(([k, v]) => [k, { $value: `${v}rem` }])),
    size: Object.fromEntries(Object.entries(typeScale).map(([cas, dm]) => [sizeRole(cas), { $value: remOf(dm) }])),
    measure: { $value: `${measureCh}ch` },
  },
  fontWeight: { $type: "fontWeight", ...Object.fromEntries(Object.entries(weights).map(([w, wt]) => [w, { $value: (wt.$value as { value: number }).value }])) },
  number: { $type: "number", "line-height-body": { $value: LINE_HEIGHT_BODY }, "line-height-heading": { $value: LINE_HEIGHT_HEADING } },
};

// ── 2. Style Dictionary native (category/type/item + value) ──
const sd = {
  color: {
    primitive: Object.fromEntries(atoms.map((a) => [a.cas, { value: serialize(a.value) }])),
    role: Object.fromEntries(ROLE_ORDER.map((r) => [r, { value: `{color.primitive.${roles[r].cas}.value}` }])),
  },
  size: {
    space: Object.fromEntries(Object.entries(SPACE).map(([k, v]) => [k, { value: `${v}rem` }])),
    font: Object.fromEntries(Object.entries(typeScale).map(([cas, dm]) => [sizeRole(cas), { value: remOf(dm) }])),
    measure: { value: `${measureCh}ch` },
  },
  font: { weight: Object.fromEntries(Object.entries(weights).map(([w, wt]) => [w, { value: (wt.$value as { value: number }).value }])) },
};

Deno.writeTextFileSync(`${outDir}/tokens.dtcg.json`, JSON.stringify(dtcg, null, 2) + "\n");
Deno.writeTextFileSync(`${outDir}/tokens.sd.json`, JSON.stringify(sd, null, 2) + "\n");
console.log(`generated ${outDir}/tokens.dtcg.json (W3C DTCG) + tokens.sd.json (Style Dictionary) — ${atoms.length} primitives, ${ROLE_ORDER.length} roles, all aliased.`);
