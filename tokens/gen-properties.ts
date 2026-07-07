// Generate the CSS property names as typed Zod enums, from @webref/css. CssProperty = every
// property; ColorProperty = those whose value grammar reaches <color> (resolved transitively).
// Also writes color-properties.derived.json (the color set, with single/compound). This is the
// authoritative STATIC source; a headless computedStyleMap().keys() cross-check confirms it.
// Run: deno run --allow-read --allow-write --allow-env --allow-net gen-properties.ts
import css from "npm:@webref/css";

const d = await css.listAll() as { properties: { name: string; syntax?: string }[]; types?: { name: string; syntax?: string; value?: string }[] };
const propSyntax: Record<string, string> = {}, typeSyntax: Record<string, string> = {};
for (const p of d.properties) propSyntax[p.name] = (propSyntax[p.name] ? propSyntax[p.name] + " | " : "") + (p.syntax ?? "");
for (const t of d.types ?? []) if (t.name) typeSyntax[t.name] = (typeSyntax[t.name] ? typeSyntax[t.name] + " | " : "") + (t.syntax ?? t.value ?? "");

const refs = (s: string): string[] => [...String(s ?? "").matchAll(/<([a-zA-Z][\w-]*)>|<'([\w-]+)'>/g)].map((m) => m[1] ? `<${m[1]}>` : `<'${m[2]}'>`);
const hasColor = new Set<string>(["<color>"]);
for (const n of Object.keys(typeSyntax)) if (/^<[\w-]*color[\w-]*>$/i.test(n)) hasColor.add(n);
let changed = true;
while (changed) {
  changed = false;
  for (const [name, syn] of Object.entries(typeSyntax)) {
    if (hasColor.has(name)) continue;
    if (/<color>/.test(syn) || refs(syn).some((r) => hasColor.has(r))) { hasColor.add(name); changed = true; }
  }
}
const reaches = (syn: string) => /<color>/.test(syn) || refs(syn).some((r) => hasColor.has(r));
const KW = /^(auto|currentcolor|none|transparent|normal|<'[\w-]+'>)$/i;
const single = (syn: string) => { const alts = syn.split("|").map((s) => s.trim()).filter(Boolean); return alts.some((a) => a === "<color>") && alts.every((a) => a === "<color>" || KW.test(a)); };

const appliesTo: Record<string, string> = {};
for (const p of d.properties as { name: string; appliesTo?: string }[]) if (p.appliesTo && !appliesTo[p.name]) appliesTo[p.name] = p.appliesTo;
const allProps = Object.keys(propSyntax).sort();
const colorProps: { name: string; single: boolean; appliesTo: string }[] = [];
for (const [name, syn] of Object.entries(propSyntax)) {
  let hit = reaches(syn);
  if (!hit) for (const r of refs(syn)) { const m = r.match(/^<'([\w-]+)'>$/); if (m && propSyntax[m[1]] && reaches(propSyntax[m[1]])) hit = true; }
  if (hit) colorProps.push({ name, single: single(syn.trim()), appliesTo: appliesTo[name] ?? "see individual properties" });
}
colorProps.sort((a, b) => a.name.localeCompare(b.name));

const out = `// GENERATED from @webref/css by gen-properties.ts — do not edit by hand.\nimport { z } from "zod";\n\n` +
  `/** Every CSS property name (webref). */\nexport const CssProperty = z.enum(${JSON.stringify(allProps)} as [string, ...string[]]);\nexport type CssProperty = z.infer<typeof CssProperty>;\n\n` +
  `/** Properties whose value grammar reaches <color> (resolved transitively). */\nexport const ColorProperty = z.enum(${JSON.stringify(colorProps.map((c) => c.name))} as [string, ...string[]]);\nexport type ColorProperty = z.infer<typeof ColorProperty>;\n`;
Deno.writeTextFileSync(new URL("properties.ts", import.meta.url), out);
Deno.writeTextFileSync(new URL("color-properties.derived.json", import.meta.url), JSON.stringify({ $source: "@webref/css", count: colorProps.length, singleCount: colorProps.filter((c) => c.single).length, properties: colorProps }, null, 2) + "\n");
console.log(`generated properties.ts — CssProperty (${allProps.length}) + ColorProperty (${colorProps.length}); color-properties.derived.json rewritten.`);
