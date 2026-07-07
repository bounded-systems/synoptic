// The role-picker's PREFERENCES, formalized and typed — the answer to "is there a preference toward
// certain colors?" is YES, and here it is, explicit instead of scattered magic numbers. Each role
// declares its target lightness, whether it wants chroma (a brand accent) or stays a crisp neutral,
// its contrast tier + the role it must clear against, and (for accents) the CVD-safe hue field.
// Also: the SELECTORS and a Zero, as real named items (no bare strings/literals in the emitter).

export interface RoleSpec {
  // ── REQUIRED by WCAG — not negotiable once the target level is chosen ──────────
  /** contrast ratio this role must clear vs `on`: 7 = 1.4.6 (AAA) body text · 4.5 = 1.4.3 (AA) text · 3 = 1.4.11 non-text. */
  tier?: number;
  /** the role this must clear against — the contrast pair. */
  on?: Role;
  // ── DECISIONS — aesthetic knobs; WCAG fixes the ratio above, never these ───────
  /** where in the valid lightness range to sit (a look, not a rule). */
  targetL: number;
  /** brand accent (chroma) vs crisp neutral (a look). */
  chromatic: boolean;
  /** what reads as a light / dark ground (a decision). */
  minL?: number;
  maxL?: number;
  // ── GROUNDED-BUT-A-CHOICE — the constraint is spec, the value is the brand's ──
  /** chromatic hues share ONE CVD-safe field (1.4.1); WHICH field (warm/cool) is the brand's call. */
  field?: "warm" | "cool";
  /** if unsatisfiable, fall back to another already-valid role instead of failing. */
  fallback?: Role;
}

/** Picked in this order so a role can clear-against an earlier one. */
export const ROLE_ORDER = ["surface", "surface-dark", "text", "on-dark", "heading", "accent", "on-accent", "link", "muted", "border"] as const;
export type Role = typeof ROLE_ORDER[number];

export const ROLE_SPEC: Record<Role, RoleSpec> = {
  surface: { targetL: 94, chromatic: false, minL: 78 }, // lightest warm ground
  "surface-dark": { targetL: 18, chromatic: false, maxL: 35 }, // crisp dark ground, not brown
  text: { targetL: 12, chromatic: false, tier: 7, on: "surface" }, // crisp near-black, AAA
  "on-dark": { targetL: 94, chromatic: false, tier: 7, on: "surface-dark" }, // crisp light, AAA
  heading: { targetL: 12, chromatic: false, tier: 7, on: "surface", fallback: "text" }, // crisp dark
  accent: { targetL: 62, chromatic: true, field: "warm", fallback: "link" }, // the VIBRANT brand FILL (a background — no fg tier; contrast handled by on-accent)
  "on-accent": { targetL: 15, chromatic: false, tier: 4.5, on: "accent", fallback: "text" }, // dark text that clears ON the fill
  link: { targetL: 46, chromatic: true, tier: 4.5, on: "surface", field: "warm", fallback: "text" }, // a darker warm accent that clears AA as text
  muted: { targetL: 45, chromatic: false, tier: 4.5, on: "surface", fallback: "text" }, // dimmed neutral, AA
  border: { targetL: 65, chromatic: true, tier: 3, on: "surface-dark", fallback: "on-dark" }, // non-text 3:1
};

/** Selectors as named items — the emitter references SEL.body, never the bare string. */
export const SEL = {
  root: ":root", body: "body", h1: "h1", h2: "h2", h3: "h3", p: "p", a: "a",
  card: ".card", cardLast: ".card > :last-child", cardText: ".card h3, .card a", small: "small", button: "button",
} as const;
export type Selector = typeof SEL[keyof typeof SEL];
