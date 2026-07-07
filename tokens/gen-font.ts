// Generate the font-family types from @webref/css: the generic families (serif … system-ui, ui-*)
// and the recommended OS system-font stacks. font-family reifies to a generic CSSStyleValue (a
// stack, not a single typed value) and has NO direct WCAG constraint — the a11y rules sit on size,
// spacing, and color, never the typeface. Run: deno run -A gen-font.ts
import css from "npm:@webref/css";

const d = await css.listAll() as { types?: { name: string; value?: string }[] };
const kw = (name: string) => (d.types?.find((t) => t.name === name)?.value ?? "").split("|").map((s) => s.trim()).filter((s) => /^[\w-]+$/.test(s));
// webref generic-font-complete + generic-font-incomplete (fall back to the spec list if unparsed)
let generics = [...kw("generic-font-complete"), ...kw("generic-font-incomplete")].sort();
if (generics.length === 0) generics = ["cursive", "fantasy", "math", "monospace", "sans-serif", "serif", "system-ui", "ui-monospace", "ui-rounded", "ui-sans-serif", "ui-serif"];

// the OS "default" system fonts on the web — system-ui first (the native UI font), with the classic
// stack behind it for older engines. These are the platform defaults: SF (Apple), Segoe UI
// (Windows), Roboto (Android), each surfaced by `system-ui`.
const SYSTEM_FONT_STACKS = {
  "sans": ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
  "serif": ["ui-serif", "Georgia", "Cambria", "Times New Roman", "Times", "serif"],
  "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
};

const out = `// GENERATED from @webref/css by gen-font.ts — do not edit by hand.\n` +
  `// font-family reifies to a generic CSSStyleValue (a stack); no direct WCAG rule constrains the\n` +
  `// typeface. https://drafts.csswg.org/css-fonts-4/#generic-font-families\nimport { z } from "zod";\n\n` +
  `/** CSS generic font families (incl. the OS-native ui-* + system-ui). */\nexport const GenericFontFamily = z.enum(${JSON.stringify(generics)} as [string, ...string[]]);\nexport type GenericFontFamily = z.infer<typeof GenericFontFamily>;\n\n` +
  `/** The OS "default" system-font stacks on the web — system-ui surfaces SF/Segoe UI/Roboto. */\nexport const SYSTEM_FONT_STACKS = ${JSON.stringify(SYSTEM_FONT_STACKS, null, 2)} as const;\n\n` +
  `/** A font-family token — a stack ending in a generic. Reifies to a generic CSSStyleValue. */\nexport const FontFamily = z.object({\n  $type: z.literal("font-family"),\n  $value: z.array(z.string()).min(1),\n  $generic: GenericFontFamily,\n  $reifiesTo: z.literal("CSSStyleValue"),\n  $description: z.string(),\n});\nexport type FontFamily = z.infer<typeof FontFamily>;\n\n` +
  `/** font-palette reification (CSS Fonts 4 §font-palette via Typed OM reify): normal|light|dark reify\n * to an IDENTIFIER (CSSKeywordValue); any other value (a <palette-identifier> like --brand) reifies to\n * a generic CSSStyleValue. */\nexport const FontPaletteKeyword = z.enum(["normal", "light", "dark"]);\nexport type FontPaletteKeyword = z.infer<typeof FontPaletteKeyword>;\nexport const FontPalette = z.object({\n  $type: z.literal("font-palette"),\n  $value: z.union([FontPaletteKeyword, z.string().regex(/^--/, "a <palette-identifier>")]),\n  $reifiesTo: z.union([z.literal("CSSKeywordValue"), z.literal("CSSStyleValue")]),\n  $description: z.string(),\n});\nexport type FontPalette = z.infer<typeof FontPalette>;\nexport const reifyFontPalette = (value: string): "CSSKeywordValue" | "CSSStyleValue" =>\n  FontPaletteKeyword.safeParse(value).success ? "CSSKeywordValue" : "CSSStyleValue";\n`;
Deno.writeTextFileSync(new URL("font.ts", import.meta.url), out);
console.log(`generated font.ts — GenericFontFamily (${generics.length}: ${generics.join(", ")}); system stacks: sans/serif/mono.`);
