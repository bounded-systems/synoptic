// THE DERIVATION — a pure function from a brand config to its atoms + role assignments. Both outputs
// (to-css.ts → CSS, to-tokens.ts → DTCG/Style-Dictionary) consume this ONE derivation, so the
// role-picking lives in exactly one place. Correct-by-construction: the REQUIRED tiers are enforced
// here (a role that can't clear its tier fails loudly), so downstream emitters never see invalid state.
import { contrast, luminanceOklch } from "./color.ts";
import { derivePrimitives, deriveSeedPalette } from "./verbs.ts";
import { hueField } from "./hue.ts";
import { DEFAULT_ROLE_PREFS, ROLE_CONTRACT, ROLE_ORDER, type Role } from "./roles.ts";
import { CHROMA_REF, CHROMATIC_THRESHOLD } from "./constants.ts";
import type { BrandConfig } from "./config.ts";

export interface Atom { cas: string; value: { $type: "CSSOKLCH"; l: number; c: number; h: number; alpha: number }; l: number; c: number; h: number; Y: number }

/** The brand's primitive colors — the palette (from the seed unless overridden), content-addressed. */
export function deriveAtoms(brand: BrandConfig): Atom[] {
  const palette = brand.palette ?? deriveSeedPalette(brand.seed);
  return Object.entries(derivePrimitives(palette)).map(([cas, p]) => ({ cas, value: p.$value as Atom["value"], l: p.$value.l, c: p.$value.c, h: p.$value.h, Y: luminanceOklch(p.$value.l, p.$value.c, p.$value.h) }));
}

/** Assign each role a color, enforcing the REQUIRED WCAG tier + the brand's preferences. */
export function deriveRoles(atoms: Atom[], brand: BrandConfig): Record<Role, Atom> {
  const bias = brand.brandBias;
  const clears = (fg: Atom, bg: Atom, r: number) => contrast(fg.Y, bg.Y) >= r;
  const score = (a: Atom, t: number) => bias * Math.min(a.c / CHROMA_REF, 1) * 100 + (1 - bias) * (100 - Math.abs(a.l - t));
  const pick = (cs: Atom[], t: number): Atom | null => (cs.length ? [...cs].sort((x, y) => score(y, t) - score(x, t))[0] : null);
  const pickN = (cs: Atom[], t: number): Atom | null => (cs.length ? [...cs].sort((x, y) => (Math.abs(x.l - t) - Math.abs(y.l - t)) || (x.c - y.c))[0] : null);
  const fail = (m: string): never => { console.error(`✗ unsatisfiable role — ${m}. Surfacing rather than emitting an invalid style.`); Deno.exit(1); };
  const lightest = atoms.reduce((a, b) => (a.l > b.l ? a : b)), darkest = atoms.reduce((a, b) => (a.l < b.l ? a : b));
  const roles = {} as Record<Role, Atom>;
  for (const role of ROLE_ORDER) {
    const pref = { ...DEFAULT_ROLE_PREFS[role], ...(brand.roles[role] ?? {}) };
    const { tier, on } = ROLE_CONTRACT[role];
    const cands = atoms.filter((a) =>
      (pref.minL === undefined || a.l >= pref.minL) &&
      (pref.maxL === undefined || a.l <= pref.maxL) &&
      (!on || !tier || clears(a, roles[on], tier)) &&
      (!pref.chromatic || a.c > CHROMATIC_THRESHOLD) &&
      (!pref.field || hueField(a.h) === pref.field));
    roles[role] = (pref.chromatic ? pick : pickN)(cands, pref.targetL) ??
      (pref.fallback ? roles[pref.fallback] : role === "surface" ? lightest : role === "surface-dark" ? darkest : fail(`${role} clears no color at its ${tier}:1 tier`));
  }
  return roles;
}
