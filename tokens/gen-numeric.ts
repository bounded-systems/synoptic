// Generate the CSS Typed OM numeric TYPE SYSTEM as Zod, from @webref/idl: CSSNumericBaseType (the
// 7 unit types), CSSMathOperator, and every unit the `CSS` namespace mints — grouped by base type.
// This grounds our layers: rem/ch/em are LengthUnit, line-height is unitless (number). The spec's
// numeric type algebra (add/sub require matching types) is WHY rem-locking is type-safe.
// Run: deno run --allow-read --allow-write --allow-env --allow-net gen-numeric.ts
import idl from "npm:@webref/idl";

const all = await idl.parseAll() as Record<string, { type: string; name: string; values?: { value: string }[]; members?: { type: string; name: string; idlType?: { idlType?: string } }[] }[]>;
let baseTypes: string[] = [], mathOps: string[] = [];
const units: string[] = [];
for (const tree of Object.values(all)) {
  for (const n of tree) {
    if (n.type === "enum" && n.name === "CSSNumericBaseType") baseTypes = (n.values ?? []).map((v) => v.value);
    if (n.type === "enum" && n.name === "CSSMathOperator") mathOps = (n.values ?? []).map((v) => v.value);
    if (n.type === "namespace" && n.name === "CSS") for (const m of n.members ?? []) if (m.type === "operation" && m.idlType?.idlType === "CSSUnitValue") units.push(m.name);
  }
}
// base-type grouping (the IDL comments; length = everything not otherwise typed)
const NAMED: Record<string, string[]> = {
  number: ["number"], percent: ["percent"], angle: ["deg", "grad", "rad", "turn"],
  time: ["s", "ms"], frequency: ["Hz", "kHz"], resolution: ["dpi", "dpcm", "dppx"], flex: ["fr"],
};
const typed = new Set(Object.values(NAMED).flat());
const byType: Record<string, string[]> = { length: units.filter((u) => !typed.has(u)), ...NAMED };
const unitBaseType: Record<string, string> = {};
for (const [t, us] of Object.entries(byType)) for (const u of us) unitBaseType[u] = t;

const enumZod = (name: string, vals: string[], doc: string) => `/** ${doc} */\nexport const ${name} = z.enum(${JSON.stringify(vals)} as [string, ...string[]]);\nexport type ${name} = z.infer<typeof ${name}>;\n\n`;
let out = `// GENERATED from @webref/idl (css-typed-om §numeric) by gen-numeric.ts — do not edit.\n` +
  `// https://drafts.css-houdini.org/css-typed-om/#numeric-objects\nimport { z } from "zod";\n\n`;
out += enumZod("CssNumericBaseType", baseTypes, "The 7 numeric base types — a unit's dimension. A CSSNumericType is a vector over these.");
out += enumZod("CssMathOperator", mathOps, "CSSMathValue operators (calc tree).");
out += enumZod("CssUnit", units, `Every unit the CSS namespace mints (${units.length}).`);
out += enumZod("LengthUnit", byType.length, "Length units (rem, ch, em, vw, px, …) — our dimension/measure surface.");
out += enumZod("AngleUnit", byType.angle, "Angle units.");
out += `/** unit → its base type (rem → length, deg → angle, number → number, …). */\nexport const UNIT_BASE_TYPE: Record<string, string> = ${JSON.stringify(unitBaseType)};\n`;
Deno.writeTextFileSync(new URL("numeric.ts", import.meta.url), out);
console.log(`generated numeric.ts — CssNumericBaseType (${baseTypes.length}), CssMathOperator (${mathOps.length}), CssUnit (${units.length}); ${byType.length.length} length units, ${byType.angle.length} angle.`);
