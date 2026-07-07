// Style a bare page FROM a BRAND CONFIG (the seed) — nothing hardcoded. TYPE-DRIVEN, TOKEN-DRIVEN,
// FULL INDIRECTION: element rules hold no direct values (every value a var() to a :root token, incl.
// --zero); roles come from the typed ROLE_SPEC (with per-brand overrides); selectors + properties
// are real named items (SEL, CssProperty). Colors @property-registered → reified as typed CSSOKLCH.
// Run: deno run -RW to-css.ts <brand.json> <outDir>
import { z } from "zod";
import { serialize, syntaxOf, varRef } from "./serialize.ts";
import { deriveDimensions, deriveMeasure, derivePrimitives, deriveSeedPalette, generateScale } from "./verbs.ts";
import { deriveWeights } from "./extras.ts";
import { CssProperty } from "./properties.ts";
import { isWarm } from "./hue.ts";
import { contrast, luminanceOklch } from "./color.ts";
import { ROLE_ORDER, ROLE_SPEC, type Role, type RoleSpec, SEL, type Selector } from "./roles.ts";
import { loadBrand } from "./config.ts";

const brand = loadBrand(Deno.args[0]);
const outDir = Deno.args[1] ?? ".";
const brandBias = brand.brandBias;
const palette = brand.palette ?? deriveSeedPalette(brand.seed); // derive the palette from the seed unless overridden

// ── color atoms + role picks (driven by ROLE_SPEC + brand overrides) ───────────
const prims = derivePrimitives(palette);
interface A { cas: string; value: { $type: "CSSOKLCH"; l: number; c: number; h: number; alpha: number }; l: number; c: number; h: number; Y: number }
const atoms: A[] = Object.entries(prims).map(([cas, p]) => ({ cas, value: p.$value as A["value"], l: p.$value.l, c: p.$value.c, h: p.$value.h, Y: luminanceOklch(p.$value.l, p.$value.c, p.$value.h) }));
const clears = (fg: A, bg: A, r: number) => contrast(fg.Y, bg.Y) >= r;
const score = (a: A, t: number) => brandBias * Math.min(a.c / 0.15, 1) * 100 + (1 - brandBias) * (100 - Math.abs(a.l - t));
const pick = (cs: A[], t: number): A | null => (cs.length ? [...cs].sort((x, y) => score(y, t) - score(x, t))[0] : null); // chroma-preferring accents
const pickN = (cs: A[], t: number): A | null => (cs.length ? [...cs].sort((x, y) => (Math.abs(x.l - t) - Math.abs(y.l - t)) || (x.c - y.c))[0] : null); // crisp neutrals
const fail = (m: string): never => { console.error(`✗ unsatisfiable role — ${m}. Surfacing rather than emitting an invalid style.`); Deno.exit(1); };
const lightest = atoms.reduce((a, b) => (a.l > b.l ? a : b)), darkest = atoms.reduce((a, b) => (a.l < b.l ? a : b));

const roles = {} as Record<Role, A>;
for (const role of ROLE_ORDER) {
  const spec: RoleSpec = { ...ROLE_SPEC[role], ...(brand.roleOverrides[role] ?? {}) };
  const cands = atoms.filter((a) =>
    (spec.minL === undefined || a.l >= spec.minL) &&
    (spec.maxL === undefined || a.l <= spec.maxL) &&
    (!spec.on || !spec.tier || clears(a, roles[spec.on], spec.tier)) &&
    (!spec.chromatic || a.c > 0.06) &&
    (spec.field !== "warm" || isWarm(a.h)));
  roles[role] = (spec.chromatic ? pick : pickN)(cands, spec.targetL) ??
    (spec.fallback ? roles[spec.fallback] : role === "surface" ? lightest : role === "surface-dark" ? darkest : fail(`${role} clears no color at its tier`));
}

// ── dimension + weight tokens (type scale from the brand config) ───────────────
const ts = brand.typeScale;
const typeScale = generateScale(ts.floorRem, ts.ceilingRem, ts.roles);
const spacing = deriveDimensions([0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.75, 3], 1.5);
const dimTokens = { ...spacing, ...typeScale };
const dimList = Object.entries(dimTokens).map(([cas, dm]) => ({ cas, v: (dm.$value as { value: number }).value }));
const sizeOf = (role: string) => { const e = Object.entries(typeScale).find(([, x]) => x.$description.includes(`role: ${role}`)); return e ? varRef(`--${e[0]}`) : varRef("--zero"); };
const weights = deriveWeights();

const rem = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "rem" });
const vw = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "vw" });
const num = (v: number) => ({ $type: "CSSUnitValue" as const, value: v, unit: "number" });
const kw = (v: string) => ({ $type: "CSSKeywordValue" as const, value: v });

type Prop = z.infer<typeof CssProperty> | `--${string}`;
interface Decl { selector: Selector; property: Prop; value: unknown }
const root: Decl[] = [
  ...atoms.map((a): Decl => ({ selector: SEL.root, property: `--${a.cas}`, value: a.value })),
  ...Object.entries(dimTokens).map(([cas, dm]): Decl => ({ selector: SEL.root, property: `--${cas}`, value: dm.$value })),
  ...Object.entries(weights).map(([w, wt]): Decl => ({ selector: SEL.root, property: `--${w}`, value: wt.$value })),
  ...ROLE_ORDER.map((role): Decl => ({ selector: SEL.root, property: `--${role}`, value: varRef(`--${roles[role].cas}`) })),
];
// register a value as a :root token ONCE, return its var — the only indirection primitive
const seen = new Set<string>();
const tok = (name: string, value: unknown) => { if (!seen.has(name)) { seen.add(name); root.push({ selector: SEL.root, property: `--${name}`, value }); } return varRef(`--${name}`); };
const zero = tok("zero", rem(0)); // even 0 is a var — no direct literal in an element rule
const d = (rmv: number) => (rmv === 0 ? zero : varRef(`--${dimList.reduce((a, b) => (Math.abs(b.v - rmv) < Math.abs(a.v - rmv) ? b : a)).cas}`));
const rootFont = tok("root-font", { $type: "CSSMathClamp" as const, lower: rem(1), value: { $type: "CSSMathSum" as const, values: [rem(0.5), vw(0.5)] }, upper: rem(1.25) });
const measure = tok("measure", deriveMeasure(brand.measure).$value);
const lhBody = tok("lh-body", num(1.5)), lhTight = tok("lh-tight", num(1.2));
const font = tok("font-sans", kw(brand.font));
const wBody = varRef(`--w-${brand.weights.body}`), wHead = varRef(`--w-${brand.weights.heading}`);
const kSolid = tok("kw-solid", kw("solid")), kUnderline = tok("kw-underline", kw("underline")), kAuto = tok("kw-auto", kw("auto")), kBlock = tok("kw-block", kw("block"));
const targetMin = tok("target-min", rem(2.75));

// ── element rules — EVERY value is a var(); every selector + property a named item ──
const elems: Decl[] = [
  { selector: SEL.root, property: "font-size", value: rootFont },
  { selector: SEL.body, property: "background-color", value: varRef("--surface") },
  { selector: SEL.body, property: "color", value: varRef("--text") },
  { selector: SEL.body, property: "max-inline-size", value: measure },
  { selector: SEL.body, property: "line-height", value: lhBody },
  { selector: SEL.body, property: "font-family", value: font },
  { selector: SEL.body, property: "font-weight", value: wBody },
  { selector: SEL.body, property: "margin-block", value: d(2) },
  { selector: SEL.body, property: "margin-inline", value: kAuto },
  { selector: SEL.body, property: "padding-inline", value: d(1) },
  { selector: SEL.h1, property: "font-size", value: sizeOf("h1") },
  { selector: SEL.h1, property: "color", value: varRef("--heading") },
  { selector: SEL.h1, property: "font-weight", value: wHead },
  { selector: SEL.h1, property: "line-height", value: lhTight },
  { selector: SEL.h1, property: "margin-block-start", value: d(0) },
  { selector: SEL.h1, property: "margin-block-end", value: d(1) },
  { selector: SEL.h2, property: "font-size", value: sizeOf("h2") },
  { selector: SEL.h2, property: "color", value: varRef("--heading") },
  { selector: SEL.h2, property: "font-weight", value: wHead },
  { selector: SEL.h2, property: "line-height", value: lhTight },
  { selector: SEL.h2, property: "margin-block-start", value: d(2) },
  { selector: SEL.h2, property: "margin-block-end", value: d(0.75) },
  { selector: SEL.h3, property: "font-size", value: sizeOf("h3") },
  { selector: SEL.h3, property: "font-weight", value: wHead },
  { selector: SEL.h3, property: "margin-block-start", value: d(0) },
  { selector: SEL.h3, property: "margin-block-end", value: d(0.75) },
  { selector: SEL.p, property: "margin-block-start", value: d(0) },
  { selector: SEL.p, property: "margin-block-end", value: d(1) },
  { selector: SEL.a, property: "color", value: varRef("--link") },
  { selector: SEL.a, property: "text-decoration-line", value: kUnderline },
  { selector: SEL.a, property: "text-decoration-color", value: varRef("--link") },
  { selector: SEL.a, property: "text-underline-offset", value: d(0.125) },
  { selector: SEL.card, property: "background-color", value: varRef("--surface-dark") },
  { selector: SEL.card, property: "color", value: varRef("--on-dark") },
  { selector: SEL.card, property: "border-width", value: d(0.125) },
  { selector: SEL.card, property: "border-style", value: kSolid },
  { selector: SEL.card, property: "border-color", value: varRef("--border") },
  { selector: SEL.card, property: "border-radius", value: d(0.5) },
  { selector: SEL.card, property: "padding", value: d(1.5) },
  { selector: SEL.card, property: "margin-block", value: d(3) },
  { selector: SEL.cardLast, property: "margin-block-end", value: zero },
  { selector: SEL.cardText, property: "color", value: varRef("--on-dark") },
  { selector: SEL.small, property: "font-size", value: sizeOf("small") },
  { selector: SEL.small, property: "color", value: varRef("--muted") },
  { selector: SEL.small, property: "display", value: kBlock },
  { selector: SEL.small, property: "margin-block-start", value: d(1.5) },
  { selector: SEL.button, property: "background-color", value: varRef("--accent") },
  { selector: SEL.button, property: "color", value: varRef("--on-accent") },
  { selector: SEL.button, property: "min-block-size", value: targetMin },
  { selector: SEL.button, property: "padding-block", value: d(0.75) },
  { selector: SEL.button, property: "padding-inline", value: d(1.5) },
  { selector: SEL.button, property: "border-radius", value: d(0.25) },
  { selector: SEL.button, property: "margin-block-start", value: d(1.5) },
];

const decls = [...root, ...elems];
for (const de of decls) if (!de.property.startsWith("--") && !CssProperty.safeParse(de.property).success) fail(`unknown property "${de.property}"`);

const reg = atoms.map((a) => `@property --${a.cas} { syntax: "${syntaxOf(a.value)}"; inherits: true; initial-value: ${serialize(a.value)}; }`)
  .concat(Object.entries(dimTokens).map(([cas, dm]) => `@property --${cas} { syntax: "<length>"; inherits: true; initial-value: ${serialize(dm.$value)}; }`))
  .concat(Object.entries(weights).map(([w, wt]) => `@property --${w} { syntax: "<number>"; inherits: true; initial-value: ${serialize(wt.$value)}; }`)).join("\n");
const bySelector = new Map<string, Decl[]>();
for (const de of decls) (bySelector.get(de.selector) ?? bySelector.set(de.selector, []).get(de.selector)!).push(de);
const rules = [...bySelector].map(([sel, ds]) => `${sel} {\n${ds.map((de) => `  ${de.property}: ${serialize(de.value)};`).join("\n")}\n}`).join("\n\n");

const css = `/* GENERATED by to-css.ts from brand "${brand.name}" — FULL INDIRECTION: every element value is a var() to a :root token. */\n${reg}\n\n${rules}\n`;
Deno.writeTextFileSync(`${outDir}/style.css`, css);
console.log(`generated ${outDir}/style.css — brand "${brand.name}" (bias ${brandBias}): ${atoms.length} color + ${dimList.length} dim + ${Object.keys(weights).length} weight + ${seen.size} value tokens; surface ${roles.surface.cas}, text ${roles.text.cas}, link ${roles.link.cas}.`);
