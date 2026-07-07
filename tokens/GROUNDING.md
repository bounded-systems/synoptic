# Grounding — every layer cites its authoritative spec

Nothing in this engine is asserted; each part is **generated from** or **grounded in** a dated spec.
Generate types from the spec, name by grounded coordinate, make the invalid state unconstructable.

## Value types — CSS Typed OM
The value schemas in `typed-om.ts` are **generated from the CSS Typed OM WebIDL** (`@webref/idl`), not hand-written.
- **Level 1** — <https://drafts.css-houdini.org/css-typed-om/> — the base, numeric, and math types:
  `CSSStyleValue`, `CSSUnitValue`, `CSSKeywordValue`, `CSSNumericValue`, `CSSMath{Sum,Product,Negate,Invert,Min,Max,Clamp}`, `CSSUnparsedValue`, `CSSVariableReferenceValue`, `CSSImageValue`, `CSSTransformValue`, `StylePropertyMap(ReadOnly)`.
- **Level 2** — <https://drafts.css-houdini.org/css-typed-om-2/> — the color types:
  `CSSColorValue` and the concrete `CSSOKLCH`, `CSSOKLab`, `CSSLab`, `CSSLCH`, `CSSRGB`, `CSSHSL`, `CSSHWB`, `CSSColor`. **Our color token's `$value` IS a `CSSOKLCH`.** A dimension's `$value` is a `CSSUnitValue` locked to `rem`; a ratio is a `CSSUnitValue` `unit:"number"`; the fluid root is a `CSSMathClamp`.
- **`[[associatedProperty]]`** (Typed OM 1 §cssstylevalue) — a `CSSStyleValue`'s identity includes the property it was parsed for, and validity is enforced against it. **That is our property-token / property-pair layer** — the property is part of the value, per Houdini, not metadata we added. `CSSStyleValue.parse(property, cssText)` is the property-aware canonicalizer our Node `hexToOklch`/`oklchString` stand in for (it is `[Exposed=Window]`, so the real one runs in the browser resolver via `computedStyleMap()`).

## Property names — webref + Typed OM
- Every property + which accept `<color>` (resolved transitively) + `appliesTo` + `concerns`: **`@webref/css`** (the machine-readable CSS definitions). `CssProperty` (815), `ColorProperty` (42), in `properties.ts`.
- Runtime enumeration + cross-check: **`StylePropertyMapReadOnly.keys()`** (Typed OM 1).

## Color model — CSS Color 4
- OKLCh: <https://www.w3.org/TR/css-color-4/#ok-lab> (Ottosson, 2020).

## Accessibility — WCAG 2.2 (REC 2023-10-05, <https://www.w3.org/TR/WCAG22/>)
- Contrast: **1.4.3** (AA 4.5:1), **1.4.6** (AAA 7:1), **1.4.11** (non-text 3:1).
- Use of color / CVD-safety: **1.4.1**.
- Text: **1.4.8** (AAA — line-height ≥ 1.5, measure ≤ 80ch), **1.4.12** (text spacing).
- Size: **2.5.5** (AAA target ≥ 44px = 2.75rem), **2.4.11** (AAA focus ≥ 2px = 0.125rem, + area).
- Units: **1.4.4** (Resize), **1.4.10** (Reflow) ⇒ `rem`, never `px`; the root must have a `rem` floor.

## Perception
- **JND / geometric stepping** — Weber–Fechner: perception is logarithmic and the JND is a *ratio*, not an absolute (~2–3% for size, ΔEOK ≈ 0.02 for color). Dimension and number scales step geometrically, not linearly.
- **CVD simulation** — Machado, Oliveira & Fernandes (2009), dichromat matrices (deuteranopia/protanopia/tritanopia).
- **Type-scale bounds** — markdown/CommonMark caps the count (h1–h6 + body ≈ 7 roles); readability floors (~0.75rem) and reasonable ceilings (~3–4rem) bound the range.

## Units — normalize on `rem`, except in specific cases
We normalize on **`rem`** for anything with a *length* (sizes, spacing, widths, radii, focus, targets) — it's root-relative, flat, and resizes with the user by construction (1.4.4 / 1.4.10). `px` / `em` / `ch` are **unconstructable** in the `dimension` layer.

The exceptions are few and deliberate — each because that unit's *relativity is the requirement*, not a preference:
- **line-height → unitless `number`** — a ratio inherits correctly; a `px`/`em` line-height does not. (The `number` layer.)
- **letter / word-spacing → `em`** — spacing that must scale with the *text's own* size; WCAG **1.4.12** is itself written in `em`.
- **measure (line length) → `ch`** — relative to the character, so a ~66ch reading measure holds across sizes (**1.4.8**).
- **root font-size → `%` / keyword / `clamp(rem…)`** — the one place rem's *reference* is set; must keep a `rem` floor (`RootFontSize`).

So: **`rem` for lengths; a specific non-rem unit only where its relativity is the point** — `em` for text-relative spacing, `ch` for measure, unitless for line-height, `%`/`clamp` for the root. Everything else is `rem` or it is unconstructable.

## One line
Colors are coordinates (Color 4), values are Typed OM objects (Houdini L1/L2), properties are webref names bound by `[[associatedProperty]]`, constraints are WCAG SCs, steps are Weber ratios. **Nothing invented.**
