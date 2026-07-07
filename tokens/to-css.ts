// Style a bare page FROM the derived tokens — TYPE-DRIVEN. Every declaration is a typed (property,
// CSSStyleValue) pair; serialize() (the Typed OM stringifier) is the ONLY place a string appears.
// Colors are @property-registered so the browser reifies them as typed CSSOKLCH. Roles are picked
// from the palette by a brand-preference KNOB (chroma vs contrast-fit), not hand-assigned.
// Run: deno run --allow-read --allow-write to-css.ts <palette.json> <outDir> [brandBias 0..1]
import { serialize, syntaxOf, varRef } from "./serialize.ts";
import { deriveMeasure, derivePrimitives, generateScale } from "./verbs.ts";
import { contrast, luminanceOklch } from "./color.ts";

const palette = JSON.parse(Deno.readTextFileSync(Deno.args[0])) as string[];
const outDir = Deno.args[1] ?? ".";
const brandBias = Number(Deno.args[2] ?? "0.7"); // KNOB: 0 = max-contrast neutrals (black/white), 1 = max brand chroma (greens)

const prims = derivePrimitives(palette);
interface A { cas: string; value: { $type: "CSSOKLCH"; l: number; c: number; h: number; alpha: number }; l: number; c: number; Y: number }
const atoms: A[] = Object.entries(prims).map(([cas, p]) => ({ cas, value: p.$value as A["value"], l: p.$value.l, c: p.$value.c, Y: luminanceOklch(p.$value.l, p.$value.c, p.$value.h) }));

const clears = (fg: A, bg: A, r: number) => contrast(fg.Y, bg.Y) >= r;
// score a candidate: brandBias weights chroma (brand identity), (1-brandBias) weights lightness-fit
const score = (a: A, targetL: number) => brandBias * Math.min(a.c / 0.15, 1) * 100 + (1 - brandBias) * (100 - Math.abs(a.l - targetL));
const pick = (cands: A[], targetL: number): A | null => (cands.length ? [...cands].sort((x, y) => score(y, targetL) - score(x, targetL))[0] : null);
const fail = (m: string): never => { console.error(`✗ unsatisfiable role — ${m}. The palette can't build a valid design; surfacing rather than emitting an invalid style.`); Deno.exit(1); };

const lightest = atoms.reduce((a, b) => (a.l > b.l ? a : b));
const darkest = atoms.reduce((a, b) => (a.l < b.l ? a : b));
// surface/surfaceDark carry no contrast tier — the light/dark extreme is always a valid ground.
const surface = pick(atoms.filter((a) => a.l >= 78), 92) ?? lightest;
const surfaceDark = pick(atoms.filter((a) => a.l <= 35), 20) ?? darkest;
// text MUST clear AAA on the surface. No fallback — if nothing clears, the palette fails, loudly.
const text = pick(atoms.filter((a) => clears(a, surface, 7)), 25) ?? fail("no color clears AAA text on the surface");
const onDark = pick(atoms.filter((a) => clears(a, surfaceDark, 7)), 90) ?? fail("no color clears AAA text on the dark surface");
// the rest fall back only to ANOTHER VALID ROLE (never a non-clearing color).
const heading = pick(atoms.filter((a) => clears(a, surface, 7)), 40) ?? text;
const link = pick(atoms.filter((a) => a.c > 0.04 && clears(a, surface, 7)), 45) ?? text;
const muted = pick(atoms.filter((a) => clears(a, surface, 4.5) && a.l < surface.l - 20), 50) ?? text;
const border = pick(atoms.filter((a) => clears(a, surfaceDark, 3) && a.c > 0.01), 65) ?? onDark;

// typed value constructors — the only literals; everything below is a typed object
const rem = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "rem" });
const vw = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "vw" });
const num = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "number" });
const kw = (v: string) => ({ $type: "CSSKeywordValue" as const, value: v });
const rootFont = { $type: "CSSMathClamp" as const, lower: rem(1), value: { $type: "CSSMathSum" as const, values: [rem(0.5), vw(0.5)] }, upper: rem(1.25) };
const measure = deriveMeasure().$value;
const scale = generateScale(0.75, 3, 6);
const sizeOf = (role: string) => Object.values(scale).find((d) => d.$description.includes(`role: ${role}`))?.$value ?? rem(1);

interface Decl { selector: string; property: string; value: unknown }
const decls: Decl[] = [
  // :root — the typed root font-size, the primitive atoms, and the role variables
  { selector: ":root", property: "font-size", value: rootFont },
  ...atoms.map((a): Decl => ({ selector: ":root", property: `--${a.cas}`, value: a.value })),
  { selector: ":root", property: "--surface", value: varRef(`--${surface.cas}`) },
  { selector: ":root", property: "--surface-dark", value: varRef(`--${surfaceDark.cas}`) },
  { selector: ":root", property: "--text", value: varRef(`--${text.cas}`) },
  { selector: ":root", property: "--heading", value: varRef(`--${heading.cas}`) },
  { selector: ":root", property: "--link", value: varRef(`--${link.cas}`) },
  { selector: ":root", property: "--muted", value: varRef(`--${muted.cas}`) },
  { selector: ":root", property: "--on-dark", value: varRef(`--${onDark.cas}`) },
  { selector: ":root", property: "--border", value: varRef(`--${border.cas}`) },
  // elements — every value a var() to a role token or a typed size/keyword
  { selector: "body", property: "background-color", value: varRef("--surface") },
  { selector: "body", property: "color", value: varRef("--text") },
  { selector: "body", property: "max-inline-size", value: measure },
  { selector: "body", property: "line-height", value: num(1.5) },
  { selector: "body", property: "font-family", value: kw("system-ui, sans-serif") },
  { selector: "body", property: "margin-block", value: rem(2) },
  { selector: "body", property: "margin-inline", value: kw("auto") },
  { selector: "body", property: "padding-inline", value: rem(1) },
  { selector: "h1", property: "font-size", value: sizeOf("h1") },
  { selector: "h1", property: "color", value: varRef("--heading") },
  { selector: "h1", property: "line-height", value: num(1.2) },
  { selector: "h2", property: "font-size", value: sizeOf("h2") },
  { selector: "h2", property: "color", value: varRef("--heading") },
  { selector: "h3", property: "font-size", value: sizeOf("h3") },
  { selector: "a", property: "color", value: varRef("--link") },
  { selector: ".card", property: "background-color", value: varRef("--surface-dark") },
  { selector: ".card", property: "color", value: varRef("--on-dark") },
  { selector: ".card", property: "border-width", value: rem(0.125) },
  { selector: ".card", property: "border-style", value: kw("solid") },
  { selector: ".card", property: "border-color", value: varRef("--border") },
  { selector: ".card", property: "border-radius", value: rem(0.5) },
  { selector: ".card", property: "padding", value: rem(1) },
  { selector: ".card h3", property: "color", value: varRef("--on-dark") },
  { selector: ".card a", property: "color", value: varRef("--on-dark") },
  { selector: "small", property: "font-size", value: sizeOf("small") },
  { selector: "small", property: "color", value: varRef("--muted") },
  { selector: "button", property: "background-color", value: varRef("--link") },
  { selector: "button", property: "color", value: varRef("--surface") },
  { selector: "button", property: "min-block-size", value: rem(2.75) },
  { selector: "button", property: "padding-block", value: rem(0.75) },
  { selector: "button", property: "padding-inline", value: rem(1.5) },
  { selector: "button", property: "border-radius", value: rem(0.25) },
];

// serialize — the ONLY place a typed value becomes a string
const reg = atoms.map((a) => `@property --${a.cas} { syntax: "${syntaxOf(a.value)}"; inherits: true; initial-value: ${serialize(a.value)}; }`).join("\n");
const bySelector = new Map<string, Decl[]>();
for (const d of decls) (bySelector.get(d.selector) ?? bySelector.set(d.selector, []).get(d.selector)!).push(d);
const rules = [...bySelector].map(([sel, ds]) => `${sel} {\n${ds.map((d) => `  ${d.property}: ${serialize(d.value)};`).join("\n")}\n}`).join("\n\n");

const css = `/* GENERATED from the derived tokens by to-css.ts — TYPE-DRIVEN (serialize() is the only string). */\n/* Each color is @property-registered → computedStyleMap() reifies it as a typed CSSOKLCH. */\n${reg}\n\n${rules}\n`;
Deno.writeTextFileSync(`${outDir}/style.css`, css);
console.log(`generated ${outDir}/style.css — brandBias ${brandBias}: surface ${surface.cas}, text ${text.cas}, heading ${heading.cas}, link ${link.cas}, on-dark ${onDark.cas}, border ${border.cas}`);
