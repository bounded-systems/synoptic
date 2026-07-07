// Style a bare page FROM the derived tokens. Emits style.css: every color/size custom property is
// registered with @property (syntax:"<color>"/"<length>"), so the browser reifies it as a typed
// CSSOKLCH / CSSUnitValue — our stored type becomes the runtime type (the Typed OM, via CSS). Roles
// (surface/text/link/…) are picked from the palette by lightness + contrast, not hand-assigned.
// Run: deno run --allow-read --allow-write to-css.ts <palette.json> <outDir>
import { deriveMeasure, derivePrimitives, deriveRoot, generateScale } from "./verbs.ts";
import { contrast, luminanceOklch } from "./color.ts";

const palette = JSON.parse(Deno.readTextFileSync(Deno.args[0])) as string[];
const outDir = Deno.args[1] ?? ".";
const prims = derivePrimitives(palette);

interface A { cas: string; l: number; c: number; Y: number; css: string }
const atoms: A[] = Object.entries(prims).map(([cas, p]) => {
  const v = p.$value;
  return { cas, l: v.l, c: v.c, Y: luminanceOklch(v.l, v.c, v.h), css: `oklch(${v.l}% ${v.c} ${v.h} / ${v.alpha})` };
});
const cr = (x: A, y: A) => contrast(x.Y, y.Y);
const clears = (fg: A, bg: A, r: number) => cr(fg, bg) >= r;
const surface = atoms.reduce((a, b) => (a.l > b.l ? a : b));
const surfaceDark = atoms.reduce((a, b) => (a.l < b.l ? a : b));
const text = atoms.filter((a) => clears(a, surface, 7)).reduce((a, b) => (a.l < b.l ? a : b), surfaceDark);
const link = atoms.filter((a) => a.c > 0.04 && clears(a, surface, 7)).sort((a, b) => b.c - a.c)[0] ?? text;
const muted = atoms.filter((a) => clears(a, surface, 4.5) && a.l < surface.l - 20).sort((a, b) => b.l - a.l)[0] ?? text;
const onDark = atoms.filter((a) => clears(a, surfaceDark, 7)).reduce((a, b) => (a.l > b.l ? a : b), surface);
const border = atoms.filter((a) => clears(a, surfaceDark, 3) && a.c > 0.02).sort((a, b) => b.c - a.c)[0] ?? onDark;

const scale = generateScale(0.75, 3, 6);
const sizes = Object.values(scale).map((d) => ({ role: d.$description.match(/Heading role: (\S+)/)?.[1] ?? "", v: d.$value.value }));
const sizeOf = (role: string) => sizes.find((s) => s.role === role)?.v ?? 1;

const reg = atoms.map((a) => `@property --${a.cas} { syntax: "<color>"; inherits: true; initial-value: ${a.css}; }`).join("\n");
const vars = atoms.map((a) => `  --${a.cas}: ${a.css};`).join("\n");
const css = `/* GENERATED from the derived tokens by to-css.ts — the page had NO CSS until this. */
/* Each color is @property-registered, so computedStyleMap() reifies it as a typed CSSOKLCH. */
${reg}

:root {
  font-size: ${deriveRoot(true).$css};
${vars}
  --surface: var(--${surface.cas}); --text: var(--${text.cas}); --link: var(--${link.cas}); --muted: var(--${muted.cas});
  --surface-dark: var(--${surfaceDark.cas}); --on-dark: var(--${onDark.cas}); --border: var(--${border.cas});
}
body { margin: 2rem auto; padding: 0 1rem; max-inline-size: ${deriveMeasure().$value.value}ch; line-height: 1.5;
  font-family: system-ui, sans-serif; background-color: var(--surface); color: var(--text); }
h1 { font-size: ${sizeOf("h1")}rem; line-height: 1.2; color: var(--text); }
h2 { font-size: ${sizeOf("h2")}rem; line-height: 1.2; color: var(--text); }
h3 { font-size: ${sizeOf("h3")}rem; color: var(--text); }
a { color: var(--link); }
.card { background-color: var(--surface-dark); color: var(--on-dark); border: 0.125rem solid var(--border); border-radius: 0.5rem; padding: 1rem; }
.card h3, .card a { color: var(--on-dark); }
small { font-size: ${sizeOf("small")}rem; color: var(--muted); }
button { background-color: var(--link); color: var(--surface); min-height: 2.75rem; padding: 0.75rem 1.5rem; border: 0; border-radius: 0.25rem; }
`;
Deno.writeTextFileSync(`${outDir}/style.css`, css);
console.log(`generated ${outDir}/style.css from ${atoms.length} tokens — surface ${surface.cas}, text ${text.cas}, link ${link.cas}, border ${border.cas}`);
