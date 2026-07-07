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

// the WCAG success criteria that apply to a color property, from its contrast role + what it paints on
function concernsFor(name: string): string[] {
  const c = new Set<string>();
  const isText = /^(color|-webkit-text-fill-color|-webkit-text-stroke-color|-webkit-text-stroke|text-decoration-color|text-emphasis-color|text-decoration|text-emphasis)$/.test(name);
  const isGround = /^(background-color|background)$/.test(name);
  const isExempt = /^(box-shadow-color|flood-color|lighting-color|stop-color)$/.test(name);
  if (isText) { c.add("1.4.3"); c.add("1.4.6"); } // text contrast (AA / AAA)
  else if (!isGround && !isExempt) c.add("1.4.11"); // non-text contrast
  if (/outline-color/.test(name)) { c.add("2.4.7"); c.add("2.4.11"); c.add("2.4.13"); } // focus visible / appearance
  if (/^(color|text-decoration-color|text-decoration)$/.test(name)) c.add("1.4.1"); // links / state not by color alone
  if (/^(accent-color|caret|caret-color)$/.test(name)) c.add("1.4.11"); // control parts (disabled → 1.4.3 inactive exception)
  if (/^(fill-color|stroke-color)$/.test(name)) c.add("1.1.1"); // meaningful graphics need a text alternative
  return [...c].sort();
}

const allProps = Object.keys(propSyntax).sort();
const colorProps: { name: string; single: boolean; appliesTo: string; concerns: string[] }[] = [];
for (const [name, syn] of Object.entries(propSyntax)) {
  let hit = reaches(syn);
  if (!hit) for (const r of refs(syn)) { const m = r.match(/^<'([\w-]+)'>$/); if (m && propSyntax[m[1]] && reaches(propSyntax[m[1]])) hit = true; }
  if (hit) colorProps.push({ name, single: single(syn.trim()), appliesTo: appliesTo[name] ?? "see individual properties", concerns: concernsFor(name) });
}
colorProps.sort((a, b) => a.name.localeCompare(b.name));

// length-reaching properties (the dimension surface) — same transitive closure as color, on <length>
const hasLength = new Set<string>(["<length>", "<length-percentage>"]);
for (const n of Object.keys(typeSyntax)) if (/^<length/.test(n)) hasLength.add(n);
let ch2 = true;
while (ch2) {
  ch2 = false;
  for (const [n, s] of Object.entries(typeSyntax)) {
    if (hasLength.has(n)) continue;
    if (/<length/.test(s) || refs(s).some((r) => hasLength.has(r))) { hasLength.add(n); ch2 = true; }
  }
}
const reachesLen = (syn: string) => /<length/.test(syn) || refs(syn).some((r) => hasLength.has(r));
const lengthProps = allProps.filter((n) => reachesLen(propSyntax[n])).sort();
// measure = the inline-sizing family only (container line-length); false-friends (stroke-width,
// border-image-width, contain-intrinsic-*) excluded by the strict name pattern.
const measureProps = allProps.filter((n) => /^(min-|max-)?(width|inline-size)$|^column-width$/.test(n)).sort();

const out = `// GENERATED from @webref/css by gen-properties.ts — do not edit by hand.\nimport { z } from "zod";\n\n` +
  `/** Every CSS property name (webref). */\nexport const CssProperty = z.enum(${JSON.stringify(allProps)} as [string, ...string[]]);\nexport type CssProperty = z.infer<typeof CssProperty>;\n\n` +
  `/** Properties whose value grammar reaches <color> (resolved transitively). */\nexport const ColorProperty = z.enum(${JSON.stringify(colorProps.map((c) => c.name))} as [string, ...string[]]);\nexport type ColorProperty = z.infer<typeof ColorProperty>;\n\n` +
  `/** Properties whose value grammar reaches <length> — the dimension surface. */\nexport const LengthProperty = z.enum(${JSON.stringify(lengthProps)} as [string, ...string[]]);\nexport type LengthProperty = z.infer<typeof LengthProperty>;\n\n` +
  `/** Inline-sizing properties a reading measure (ch) applies to — max-inline-size/width family; false-friends (stroke-width, …) excluded. */\nexport const MeasureProperty = z.enum(${JSON.stringify(measureProps)} as [string, ...string[]]);\nexport type MeasureProperty = z.infer<typeof MeasureProperty>;\n`;
Deno.writeTextFileSync(new URL("properties.ts", import.meta.url), out);

// ALWAYS formalize appliesTo — every derived property set carries the HTML nodes it applies to.
const withApplies = (names: string[]) => names.map((n) => ({ name: n, appliesTo: appliesTo[n] ?? "see individual properties" }));
Deno.writeTextFileSync(new URL("color-properties.derived.json", import.meta.url), JSON.stringify({ $source: "@webref/css", $reaches: "<color>", count: colorProps.length, singleCount: colorProps.filter((c) => c.single).length, properties: colorProps }, null, 2) + "\n");
Deno.writeTextFileSync(new URL("length-properties.derived.json", import.meta.url), JSON.stringify({ $source: "@webref/css", $reaches: "<length>", $note: "the dimension surface — every property whose value reaches <length>, with appliesTo", count: lengthProps.length, properties: withApplies(lengthProps) }, null, 2) + "\n");
Deno.writeTextFileSync(new URL("measure-properties.derived.json", import.meta.url), JSON.stringify({ $source: "@webref/css", $note: "inline-sizing (line-length) properties a ch measure applies to; false-friends (stroke-width, border-image-width, contain-intrinsic-*) excluded", count: measureProps.length, properties: withApplies(measureProps) }, null, 2) + "\n");
console.log(`generated properties.ts — CssProperty (${allProps.length}), ColorProperty (${colorProps.length}), LengthProperty (${lengthProps.length}), MeasureProperty (${measureProps.length}); *-properties.derived.json (each with appliesTo) rewritten.`);
