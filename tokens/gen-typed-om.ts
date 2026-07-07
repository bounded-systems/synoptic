// Generate the CSS Typed OM value types as Zod schemas, from @webref/idl (css-typed-om) — so our
// color/dimension/keyword shapes ARE the spec's interfaces, not hand-asserted. Writes typed-om.ts.
// Run: deno run --allow-read --allow-write --allow-env gen-typed-om.ts
import idl from "npm:@webref/idl";

const all = await idl.parseAll() as Record<string, { type: string; name: string; inheritance?: string; members?: { type: string; name: string; idlType?: { idlType?: string } }[] }[]>;
const ifaces: Record<string, typeof all[string][number]> = {};
for (const node of all["css-typed-om"]) if (node.type === "interface") ifaces[node.name] = node;

function attrs(name: string): { name: string; type: string }[] {
  const node = ifaces[name];
  if (!node) return [];
  const base = node.inheritance ? attrs(node.inheritance) : [];
  const own = (node.members ?? []).filter((m) => m.type === "attribute").map((m) => ({ name: m.name, type: String(m.idlType?.idlType ?? "any") }));
  return [...base, ...own];
}
const zodOf = (t: string): string =>
  /Operator/i.test(t) ? "z.string()"                              // CSSMathOperator enum
  : /Array/i.test(t) ? "z.array(z.unknown())"                     // CSSNumericArray
  : /NumericValue|Numberish/i.test(t) ? "z.unknown()"             // a nested typed value (recursive)
  : /Percent|Angle|ColorNumber|Numeric|double|float|long/i.test(t) ? "z.number()"
  : /String|Keywordish/i.test(t) ? "z.string()"
  : t === "boolean" ? "z.boolean()"
  : "z.unknown()";

// the value types a design token can hold: colors, dimensions, keywords, var refs — AND the math
// tree (calc), because a DERIVATION (one axis, multiply-only) is a CSSMathProduct/Sum/Clamp.
const VALUE_TYPES = ["CSSOKLCH", "CSSOKLab", "CSSLCH", "CSSLab", "CSSRGB", "CSSHSL", "CSSHWB", "CSSColor", "CSSUnitValue", "CSSKeywordValue", "CSSUnparsedValue", "CSSVariableReferenceValue", "CSSNumericValue", "CSSMathSum", "CSSMathProduct", "CSSMathNegate", "CSSMathInvert", "CSSMathMin", "CSSMathMax", "CSSMathClamp", "CSSImageValue", "CSSTransformValue"];

// the color value types are CSS Typed OM Level 2; the base/numeric/math types are Level 1
const L2 = new Set(["CSSColorValue", "CSSOKLCH", "CSSOKLab", "CSSLCH", "CSSLab", "CSSRGB", "CSSHSL", "CSSHWB", "CSSColor"]);
const L1_URL = "https://drafts.css-houdini.org/css-typed-om/";
const L2_URL = "https://drafts.css-houdini.org/css-typed-om-2/";
const specOf = (name: string) => (L2.has(name) ? { level: "Typed OM 2", url: `${L2_URL}#${name.toLowerCase()}` } : { level: "Typed OM 1", url: `${L1_URL}#${name.toLowerCase()}` });

let out = `// GENERATED from @webref/idl (css-typed-om) by gen-typed-om.ts — do not edit by hand.\n` +
  `// The CSS Typed OM value interfaces, projected to Zod. Every type is grounded in the spec:\n` +
  `//   CSS Typed OM Level 1: ${L1_URL}  (CSSStyleValue, CSSUnitValue, CSSKeywordValue, CSSNumericValue, CSSMath*)\n` +
  `//   CSS Typed OM Level 2: ${L2_URL}  (CSSColorValue, CSSOKLCH, CSSColor, …)\n` +
  `// Our color token's $value IS a CSSOKLCH (Typed OM 2 §color); a value's identity includes its\n` +
  `// [[associatedProperty]] (Typed OM 1 §cssstylevalue) — which is our property-token layer.\n` +
  `import { z } from "zod";\n\n`;
const names: string[] = [];
for (const name of VALUE_TYPES) {
  if (!ifaces[name]) continue;
  const fields = attrs(name).map((a) => `  ${a.name}: ${zodOf(a.type)},`).join("\n");
  const s = specOf(name);
  out += `/** CSS ${s.level} \`${name}\`${ifaces[name].inheritance ? " : " + ifaces[name].inheritance : ""} — generated from IDL. ${s.url} */\nexport const ${name} = z.object({\n  $type: z.literal("${name}"),\n${fields}\n});\nexport type ${name} = z.infer<typeof ${name}>;\n\n`;
  names.push(name);
}
out += `/** Any Typed OM value a token can hold. */\nexport const CSSStyleValue = z.discriminatedUnion("$type", [${names.join(", ")}]);\nexport type CSSStyleValue = z.infer<typeof CSSStyleValue>;\n`;
Deno.writeTextFileSync(new URL("typed-om.ts", import.meta.url), out);
console.log(`generated typed-om.ts — ${names.length} Typed OM value types from IDL: ${names.join(", ")}`);
