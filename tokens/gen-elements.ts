// Generate the HTML + SVG element names as Zod enums, from @webref/elements — so a node's tag is
// a typed value and appliesTo can resolve to a typed element set. Writes elements.ts.
// Run: deno run --allow-read --allow-write --allow-env --allow-net gen-elements.ts
import elements from "npm:@webref/elements";

const all = await elements.listAll() as Record<string, { elements?: { name: string; interface?: string }[] }>;
const html = new Set<string>(), svg = new Set<string>();
const iface: Record<string, string> = {};
for (const [spec, data] of Object.entries(all)) {
  for (const el of data.elements ?? []) {
    if (/^SVG/.test(spec)) svg.add(el.name);
    else if (spec === "html") html.add(el.name);
    if (el.interface && !iface[el.name]) iface[el.name] = el.interface;
  }
}
const H = [...html].sort(), S = [...svg].sort();
const out = `// GENERATED from @webref/elements by gen-elements.ts — do not edit by hand.\n` +
  `// HTML: https://html.spec.whatwg.org/  ·  SVG: https://www.w3.org/TR/SVG2/\nimport { z } from "zod";\n\n` +
  `/** Every HTML element name (webref). */\nexport const HtmlElement = z.enum(${JSON.stringify(H)} as [string, ...string[]]);\nexport type HtmlElement = z.infer<typeof HtmlElement>;\n\n` +
  `/** Every SVG element name (webref). */\nexport const SvgElement = z.enum(${JSON.stringify(S)} as [string, ...string[]]);\nexport type SvgElement = z.infer<typeof SvgElement>;\n\n` +
  `/** element name → its DOM interface. */\nexport const ElementInterface: Record<string, string> = ${JSON.stringify(iface)};\n`;
Deno.writeTextFileSync(new URL("elements.ts", import.meta.url), out);
console.log(`generated elements.ts — HtmlElement (${H.length}) + SvgElement (${S.length}) Zod enums.`);
