// Style a bare page FROM the derived tokens — TYPE-DRIVEN, TOKEN-DRIVEN, FULL INDIRECTION. Element
// rules hold NO direct values: every value is a var() to a :root token (colors from the palette,
// sizes/spacing from the dimension scale, and every other value registered once via tok()). Colors
// are @property-registered so the browser reifies them as typed CSSOKLCH. Properties are validated
// against the generated CssProperty enum. Run: deno run -RW to-css.ts <palette.json> <outDir> [bias]
import { serialize, syntaxOf, varRef } from "./serialize.ts";
import { deriveDimensions, deriveMeasure, derivePrimitives, generateScale } from "./verbs.ts";
import { CssProperty } from "./properties.ts";
import { contrast, luminanceOklch } from "./color.ts";

const palette = JSON.parse(Deno.readTextFileSync(Deno.args[0])) as string[];
const outDir = Deno.args[1] ?? ".";
const brandBias = Number(Deno.args[2] ?? "0.7");

// ── color tokens + role picks ─────────────────────────────────────────────
const prims = derivePrimitives(palette);
interface A { cas: string; value: { $type: "CSSOKLCH"; l: number; c: number; h: number; alpha: number }; l: number; c: number; h: number; Y: number }
const atoms: A[] = Object.entries(prims).map(([cas, p]) => ({ cas, value: p.$value as A["value"], l: p.$value.l, c: p.$value.c, h: p.$value.h, Y: luminanceOklch(p.$value.l, p.$value.c, p.$value.h) }));
const clears = (fg: A, bg: A, r: number) => contrast(fg.Y, bg.Y) >= r;
const score = (a: A, t: number) => brandBias * Math.min(a.c / 0.15, 1) * 100 + (1 - brandBias) * (100 - Math.abs(a.l - t));
const pick = (cands: A[], t: number): A | null => (cands.length ? [...cands].sort((x, y) => score(y, t) - score(x, t))[0] : null);
const fail = (m: string): never => { console.error(`✗ unsatisfiable role — ${m}. Surfacing rather than emitting an invalid style.`); Deno.exit(1); };
const lightest = atoms.reduce((a, b) => (a.l > b.l ? a : b)), darkest = atoms.reduce((a, b) => (a.l < b.l ? a : b));
const surface = pick(atoms.filter((a) => a.l >= 78), 92) ?? lightest;
const surfaceDark = pick(atoms.filter((a) => a.l <= 35), 20) ?? darkest;
const text = pick(atoms.filter((a) => clears(a, surface, 7)), 25) ?? fail("no color clears AAA text on the surface");
const onDark = pick(atoms.filter((a) => clears(a, surfaceDark, 7)), 90) ?? fail("no color clears AAA text on the dark surface");
const heading = pick(atoms.filter((a) => clears(a, surface, 7)), 40) ?? text;
const link = pick(atoms.filter((a) => a.c > 0.06 && (a.h < 90 || a.h > 330) && clears(a, surface, 4.5)), 45) ?? pick(atoms.filter((a) => a.c > 0.04 && clears(a, surface, 4.5)), 45) ?? text;
const muted = pick(atoms.filter((a) => clears(a, surface, 4.5) && a.l < surface.l - 20), 50) ?? text;
const border = pick(atoms.filter((a) => clears(a, surfaceDark, 3) && a.c > 0.01), 65) ?? onDark;
const roleVars: Record<string, A> = { surface, "surface-dark": surfaceDark, text, heading, link, muted, "on-dark": onDark, border };

// ── dimension tokens — one generated scale for sizes AND spacing; values SNAP to it ────────────
const typeScale = generateScale(0.75, 3, 6);
const spacing = deriveDimensions([0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.75, 3], 1.5);
const dimTokens = { ...spacing, ...typeScale };
const dimList = Object.entries(dimTokens).map(([cas, d]) => ({ cas, v: (d.$value as { value: number }).value }));
const d = (rmv: number) => varRef(`--${dimList.reduce((a, b) => (Math.abs(b.v - rmv) < Math.abs(a.v - rmv) ? b : a)).cas}`);
const sizeOf = (role: string) => { const e = Object.entries(typeScale).find(([, x]) => x.$description.includes(`role: ${role}`)); return e ? varRef(`--${e[0]}`) : d(1); };

// typed value constructors (only ever inside a :root token definition, never in an element rule)
const rem = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "rem" });
const vw = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "vw" });
const num = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "number" });
const kw = (v: string) => ({ $type: "CSSKeywordValue" as const, value: v });

interface Decl { selector: string; property: string; value: unknown }
const root: Decl[] = [
  ...atoms.map((a): Decl => ({ selector: ":root", property: `--${a.cas}`, value: a.value })),
  ...Object.entries(dimTokens).map(([cas, dm]): Decl => ({ selector: ":root", property: `--${cas}`, value: dm.$value })),
  ...Object.entries(roleVars).map(([role, a]): Decl => ({ selector: ":root", property: `--${role}`, value: varRef(`--${a.cas}`) })),
];
// register a value as a :root token ONCE, return its var — the only indirection primitive
const seen = new Set<string>();
const tok = (name: string, value: unknown) => { if (!seen.has(name)) { seen.add(name); root.push({ selector: ":root", property: `--${name}`, value }); } return varRef(`--${name}`); };
const rootFont = tok("root-font", { $type: "CSSMathClamp" as const, lower: rem(1), value: { $type: "CSSMathSum" as const, values: [rem(0.5), vw(0.5)] }, upper: rem(1.25) });
const measure = tok("measure", deriveMeasure().$value);
const lhBody = tok("lh-body", num(1.5)), lhTight = tok("lh-tight", num(1.2));
const font = tok("font-sans", kw("system-ui, sans-serif"));
const kSolid = tok("kw-solid", kw("solid")), kUnderline = tok("kw-underline", kw("underline")), kAuto = tok("kw-auto", kw("auto")), kBlock = tok("kw-block", kw("block"));
const targetMin = tok("target-min", rem(2.75));

// ── element rules — EVERY value is a var(); nothing direct ──────────────────
const elems: Decl[] = [
  { selector: ":root", property: "font-size", value: rootFont },
  { selector: "body", property: "background-color", value: varRef("--surface") },
  { selector: "body", property: "color", value: varRef("--text") },
  { selector: "body", property: "max-inline-size", value: measure },
  { selector: "body", property: "line-height", value: lhBody },
  { selector: "body", property: "font-family", value: font },
  { selector: "body", property: "margin-block", value: d(2) },
  { selector: "body", property: "margin-inline", value: kAuto },
  { selector: "body", property: "padding-inline", value: d(1) },
  { selector: "h1", property: "font-size", value: sizeOf("h1") },
  { selector: "h1", property: "color", value: varRef("--heading") },
  { selector: "h1", property: "line-height", value: lhTight },
  { selector: "h1", property: "margin-block-start", value: d(0) },
  { selector: "h1", property: "margin-block-end", value: d(1) },
  { selector: "h2", property: "font-size", value: sizeOf("h2") },
  { selector: "h2", property: "color", value: varRef("--heading") },
  { selector: "h2", property: "line-height", value: lhTight },
  { selector: "h2", property: "margin-block-start", value: d(2) },
  { selector: "h2", property: "margin-block-end", value: d(0.75) },
  { selector: "h3", property: "font-size", value: sizeOf("h3") },
  { selector: "h3", property: "margin-block-start", value: d(0) },
  { selector: "h3", property: "margin-block-end", value: d(0.75) },
  { selector: "p", property: "margin-block-start", value: d(0) },
  { selector: "p", property: "margin-block-end", value: d(1) },
  { selector: "a", property: "color", value: varRef("--link") },
  { selector: "a", property: "text-decoration-line", value: kUnderline },
  { selector: "a", property: "text-decoration-color", value: varRef("--link") },
  { selector: "a", property: "text-underline-offset", value: d(0.125) },
  { selector: ".card", property: "background-color", value: varRef("--surface-dark") },
  { selector: ".card", property: "color", value: varRef("--on-dark") },
  { selector: ".card", property: "border-width", value: d(0.125) },
  { selector: ".card", property: "border-style", value: kSolid },
  { selector: ".card", property: "border-color", value: varRef("--border") },
  { selector: ".card", property: "border-radius", value: d(0.5) },
  { selector: ".card", property: "padding", value: d(1.5) },
  { selector: ".card", property: "margin-block", value: d(3) },
  { selector: ".card > :last-child", property: "margin-block-end", value: d(0) },
  { selector: ".card h3, .card a", property: "color", value: varRef("--on-dark") },
  { selector: "small", property: "font-size", value: sizeOf("small") },
  { selector: "small", property: "color", value: varRef("--muted") },
  { selector: "small", property: "display", value: kBlock },
  { selector: "small", property: "margin-block-start", value: d(1.5) },
  { selector: "button", property: "background-color", value: varRef("--link") },
  { selector: "button", property: "color", value: varRef("--surface") },
  { selector: "button", property: "min-block-size", value: targetMin },
  { selector: "button", property: "padding-block", value: d(0.75) },
  { selector: "button", property: "padding-inline", value: d(1.5) },
  { selector: "button", property: "border-radius", value: d(0.25) },
  { selector: "button", property: "margin-block-start", value: d(1.5) },
];

const decls = [...root, ...elems];
for (const de of decls) if (!de.property.startsWith("--") && !CssProperty.safeParse(de.property).success) fail(`unknown property "${de.property}"`);

const reg = atoms.map((a) => `@property --${a.cas} { syntax: "${syntaxOf(a.value)}"; inherits: true; initial-value: ${serialize(a.value)}; }`)
  .concat(Object.entries(dimTokens).map(([cas, dm]) => `@property --${cas} { syntax: "<length>"; inherits: true; initial-value: ${serialize(dm.$value)}; }`)).join("\n");
const bySelector = new Map<string, Decl[]>();
for (const de of decls) (bySelector.get(de.selector) ?? bySelector.set(de.selector, []).get(de.selector)!).push(de);
const rules = [...bySelector].map(([sel, ds]) => `${sel} {\n${ds.map((de) => `  ${de.property}: ${serialize(de.value)};`).join("\n")}\n}`).join("\n\n");

const css = `/* GENERATED by to-css.ts — FULL INDIRECTION: element rules hold no direct values, every value is a var() to a :root token. */\n${reg}\n\n${rules}\n`;
Deno.writeTextFileSync(`${outDir}/style.css`, css);
console.log(`generated ${outDir}/style.css — ${atoms.length} color + ${dimList.length} dim tokens + ${seen.size} value tokens; every element value is a var().`);
