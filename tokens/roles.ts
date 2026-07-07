// Roles: the REQUIRED contract (WCAG — an invariant, in code) split from the PREFERENCES (decisions
// — defaulted here, overridable per brand via the config layer). Everything is a typed enum, never a
// raw string. The answer to "are these decisions or required?" is encoded structurally.
import { z } from "zod";
import { HueField } from "./hue.ts";

// ── WCAG contrast tiers — the REQUIRED ratios, each citing its SC. The invariant, not a knob. ──
export const WcagTier = { aaaText: 7, aaText: 4.5, nonText: 3, none: 0 } as const;
export type WcagTierRatio = typeof WcagTier[keyof typeof WcagTier];
export const TIER_SC: Record<WcagTierRatio, string> = {
  7: "WCAG 1.4.6 (AAA) — body text",
  4.5: "WCAG 1.4.3 (AA) — text",
  3: "WCAG 1.4.11 — non-text (UI boundaries)",
  0: "— (a ground/fill; contrast borne by its paired role)",
};

// ── Roles, as an enum ──
export const ROLE_ORDER = ["surface", "surface-dark", "text", "on-dark", "heading", "accent", "on-accent", "link", "muted", "border"] as const;
export const Role = z.enum(ROLE_ORDER);
export type Role = z.infer<typeof Role>;

// ── REQUIRED contract: which tier a role must clear, against which role. Not negotiable. ──
export interface RoleContract { tier: WcagTierRatio; on?: Role }
export const ROLE_CONTRACT: Record<Role, RoleContract> = {
  surface: { tier: WcagTier.none },
  "surface-dark": { tier: WcagTier.none },
  text: { tier: WcagTier.aaaText, on: "surface" },
  "on-dark": { tier: WcagTier.aaaText, on: "surface-dark" },
  heading: { tier: WcagTier.aaaText, on: "surface" },
  accent: { tier: WcagTier.none }, // a fill — contrast borne by on-accent
  "on-accent": { tier: WcagTier.aaText, on: "accent" },
  link: { tier: WcagTier.aaText, on: "surface" },
  muted: { tier: WcagTier.aaText, on: "surface" },
  border: { tier: WcagTier.nonText, on: "surface-dark" },
};

// ── PREFERENCE layer: the DECISIONS. Defaulted here, overridable per brand from the config. ──
export const RolePref = z.object({
  /** where in the valid lightness range to sit (a look, not a rule) */
  targetL: z.number(),
  /** brand accent (chroma) vs crisp neutral (a look) */
  chromatic: z.boolean(),
  /** 1.4.1: chromatic hues share ONE CVD-safe field; WHICH field is the brand's call */
  field: HueField.optional(),
  /** what reads as a light / dark ground (a decision) */
  minL: z.number().optional(),
  maxL: z.number().optional(),
  /** fall back to another already-valid role instead of failing */
  fallback: Role.optional(),
});
export type RolePref = z.infer<typeof RolePref>;
export const DEFAULT_ROLE_PREFS: Record<Role, RolePref> = {
  surface: { targetL: 94, chromatic: false, minL: 78 },
  "surface-dark": { targetL: 18, chromatic: false, maxL: 35 },
  text: { targetL: 12, chromatic: false },
  "on-dark": { targetL: 94, chromatic: false },
  heading: { targetL: 12, chromatic: false, fallback: "text" },
  accent: { targetL: 62, chromatic: true, field: "warm", fallback: "link" },
  "on-accent": { targetL: 15, chromatic: false, fallback: "text" },
  link: { targetL: 46, chromatic: true, field: "warm", fallback: "text" },
  muted: { targetL: 45, chromatic: false, fallback: "text" },
  border: { targetL: 65, chromatic: true, fallback: "on-dark" },
};

// ── Selectors as named items (never a bare string in the emitter) ──
export const SEL = {
  root: ":root", body: "body", h1: "h1", h2: "h2", h3: "h3", p: "p", a: "a",
  card: ".card", cardLast: ".card > :last-child", cardText: ".card h3, .card a", small: "small", button: "button",
} as const;
export type Selector = typeof SEL[keyof typeof SEL];
