// Style a bare page FROM a BRAND CONFIG (the seed) — nothing hardcoded. TYPE-DRIVEN, TOKEN-DRIVEN,
// FULL INDIRECTION: element rules hold no direct values (every value a var() to a :root token, incl.
// --zero); roles come from the typed ROLE_SPEC (with per-brand overrides); selectors + properties
// are real named items (SEL, CssProperty). Colors @property-registered → reified as typed CSSOKLCH.
// Run: deno run -RW to-css.ts <brand.json> <outDir>
import { z } from "zod";
import { serialize, syntaxOf, varRef } from "./serialize.ts";
import { deriveDimensions, deriveMeasure, generateScale } from "./verbs.ts";
import { deriveWeights } from "./extras.ts";
import { CssProperty, PROP } from "./properties.ts";
import { ROLE_ORDER, type Role, SEL, type Selector } from "./roles.ts";
import { HAIRLINE_REM, LINE_HEIGHT_BODY, LINE_HEIGHT_HEADING, ROOT_FONT, SPACE, SPACING_RATIO, SPACING_STOPS, TARGET_MIN_REM } from "./constants.ts";
import { deriveAtoms, deriveRoles } from "./derive.ts";
import { loadBrand } from "./config.ts";

const brand = loadBrand(Deno.args[0]);
const outDir = Deno.args[1] ?? ".";
// ── THE DERIVATION (shared with to-tokens.ts) ──
const atoms = deriveAtoms(brand);
const roles = deriveRoles(atoms, brand);
const fail = (m: string): never => { console.error(`✗ ${m}`); Deno.exit(1); };

// ── dimension + weight tokens (type scale from the brand config) ───────────────
const ts = brand.typeScale;
const typeScale = generateScale(ts.floorRem, ts.ceilingRem, ts.roles);
const spacing = deriveDimensions([...SPACING_STOPS], SPACING_RATIO);
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
const rootFont = tok("root-font", { $type: "CSSMathClamp" as const, lower: rem(ROOT_FONT.floorRem), value: { $type: "CSSMathSum" as const, values: [rem(ROOT_FONT.baseRem), vw(ROOT_FONT.slopeVw)] }, upper: rem(ROOT_FONT.ceilRem) });
const measure = tok("measure", deriveMeasure(brand.measure).$value);
const lhBody = tok("lh-body", num(LINE_HEIGHT_BODY)), lhTight = tok("lh-tight", num(LINE_HEIGHT_HEADING));
const font = tok("font-sans", kw(brand.font));
const wBody = varRef(`--w-${brand.weights.body}`), wHead = varRef(`--w-${brand.weights.heading}`);
const kSolid = tok("kw-solid", kw("solid")), kUnderline = tok("kw-underline", kw("underline")), kAuto = tok("kw-auto", kw("auto")), kBlock = tok("kw-block", kw("block"));
const targetMin = tok("target-min", rem(TARGET_MIN_REM));

// ── element rules — EVERY value is a var(); every selector + property a named item ──
const elems: Decl[] = [
  { selector: SEL.root, property: PROP.fontSize, value: rootFont },
  { selector: SEL.body, property: PROP.backgroundColor, value: varRef("--surface") },
  { selector: SEL.body, property: PROP.color, value: varRef("--text") },
  { selector: SEL.body, property: PROP.maxInlineSize, value: measure },
  { selector: SEL.body, property: PROP.lineHeight, value: lhBody },
  { selector: SEL.body, property: PROP.fontFamily, value: font },
  { selector: SEL.body, property: PROP.fontWeight, value: wBody },
  { selector: SEL.body, property: PROP.marginBlock, value: d(SPACE.lg) },
  { selector: SEL.body, property: PROP.marginInline, value: kAuto },
  { selector: SEL.body, property: PROP.paddingInline, value: d(SPACE.base) },
  { selector: SEL.h1, property: PROP.fontSize, value: sizeOf("h1") },
  { selector: SEL.h1, property: PROP.color, value: varRef("--heading") },
  { selector: SEL.h1, property: PROP.fontWeight, value: wHead },
  { selector: SEL.h1, property: PROP.lineHeight, value: lhTight },
  { selector: SEL.h1, property: PROP.marginBlockStart, value: d(SPACE.none) },
  { selector: SEL.h1, property: PROP.marginBlockEnd, value: d(SPACE.base) },
  { selector: SEL.h2, property: PROP.fontSize, value: sizeOf("h2") },
  { selector: SEL.h2, property: PROP.color, value: varRef("--heading") },
  { selector: SEL.h2, property: PROP.fontWeight, value: wHead },
  { selector: SEL.h2, property: PROP.lineHeight, value: lhTight },
  { selector: SEL.h2, property: PROP.marginBlockStart, value: d(SPACE.lg) },
  { selector: SEL.h2, property: PROP.marginBlockEnd, value: d(SPACE.snug) },
  { selector: SEL.h3, property: PROP.fontSize, value: sizeOf("h3") },
  { selector: SEL.h3, property: PROP.fontWeight, value: wHead },
  { selector: SEL.h3, property: PROP.marginBlockStart, value: d(SPACE.none) },
  { selector: SEL.h3, property: PROP.marginBlockEnd, value: d(SPACE.snug) },
  { selector: SEL.p, property: PROP.marginBlockStart, value: d(SPACE.none) },
  { selector: SEL.p, property: PROP.marginBlockEnd, value: d(SPACE.base) },
  { selector: SEL.a, property: PROP.color, value: varRef("--link") },
  { selector: SEL.a, property: PROP.textDecorationLine, value: kUnderline },
  { selector: SEL.a, property: PROP.textDecorationColor, value: varRef("--link") },
  { selector: SEL.a, property: PROP.textUnderlineOffset, value: d(SPACE.hair) },
  { selector: SEL.card, property: PROP.backgroundColor, value: varRef("--surface-dark") },
  { selector: SEL.card, property: PROP.color, value: varRef("--on-dark") },
  { selector: SEL.card, property: PROP.borderWidth, value: d(SPACE.hair) },
  { selector: SEL.card, property: PROP.borderStyle, value: kSolid },
  { selector: SEL.card, property: PROP.borderColor, value: varRef("--border") },
  { selector: SEL.card, property: PROP.borderRadius, value: d(SPACE.sm) },
  { selector: SEL.card, property: PROP.padding, value: d(SPACE.md) },
  { selector: SEL.card, property: PROP.marginBlock, value: d(SPACE.xl) },
  { selector: SEL.cardLast, property: PROP.marginBlockEnd, value: zero },
  { selector: SEL.cardText, property: PROP.color, value: varRef("--on-dark") },
  { selector: SEL.small, property: PROP.fontSize, value: sizeOf("small") },
  { selector: SEL.small, property: PROP.color, value: varRef("--muted") },
  { selector: SEL.small, property: PROP.display, value: kBlock },
  { selector: SEL.small, property: PROP.marginBlockStart, value: d(SPACE.md) },
  { selector: SEL.button, property: PROP.backgroundColor, value: varRef("--accent") },
  { selector: SEL.button, property: PROP.color, value: varRef("--on-accent") },
  { selector: SEL.button, property: PROP.minBlockSize, value: targetMin },
  { selector: SEL.button, property: PROP.paddingBlock, value: d(SPACE.snug) },
  { selector: SEL.button, property: PROP.paddingInline, value: d(SPACE.md) },
  { selector: SEL.button, property: PROP.borderRadius, value: d(SPACE.xs) },
  { selector: SEL.button, property: PROP.marginBlockStart, value: d(SPACE.md) },
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
console.log(`generated ${outDir}/style.css — brand "${brand.name}" (bias ${brand.brandBias}): ${atoms.length} color + ${dimList.length} dim + ${Object.keys(weights).length} weight + ${seen.size} value tokens; surface ${roles.surface.cas}, text ${roles.text.cas}, link ${roles.link.cas}.`);
