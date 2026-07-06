# Grounding — every capability tied to its formal spec

Principle: **we don't assert formats or math, we ground them.** Each capability cites the
authoritative spec (name · **status** · dated) it implements; where a machine schema
exists we validate against it. Spec-grounded work is `grounded` (basis: the spec), never
`axiomatic`.

## How to read a spec (so the grounding is real)
Grounding means reading the spec *correctly*, not skimming it (cf. A List Apart, "How to
Read a W3C Spec"):
- **Normative vs non-normative.** Only *normative* sections bind. Examples, notes, and
  sections marked "This section is not normative" are informative — useful, not
  authoritative. Ground on the normative text.
- **RFC 2119 keywords.** **MUST / MUST NOT** = absolute; **SHOULD / SHOULD NOT** =
  recommended (deviate only with reason); **MAY** = optional. Our implementation MUST
  satisfy every MUST; note where we take a SHOULD/MAY.
- **Definitions first.** Terms have precise meanings (e.g. *computed* vs *resolved* value,
  *powerless* hue). Read the terminology before the rules.
- **Conformance section.** It says what "conforming" means and to whom — that's the bar
  we validate against.
- **Status = grounding strength.** Check https://www.w3.org/Style/CSS/current-work first.

```
REC   Recommendation            final, stable            ← strongest grounding
CR/CRD Candidate Recommendation  near-final, testable
WD    Working Draft             provisional, may change  ← pin the date, expect churn
ED    Editor's Draft            most provisional
CG    Community Group Report    de-facto, not W3C track  (DTCG)
—     de-facto / IETF / ISO     no W3C status
```

## Registry

| Capability | Spec · **status** · dated | URL | Implement / validate |
|---|---|---|---|
| `canonicalize` colors | **CSS Color 4** · CR | w3.org/TR/css-color-4/ | oklch canonical, lab/lch/oklab, display-p3 §10.4, rgb/hsl/hex |
| color input syntaxes | **CSS Color 4** · CR §5–6 | w3.org/TR/css-color-4/ | 148 named colors, 19 `<system-color>` keywords |
| relative / mix (future) | **CSS Color 5** · WD 2026-05 | w3.org/TR/css-color-5/ | color-mix(), relative color (provisional) |
| `canonicalize` lengths | **CSS Values 3** · CRD / **4** · WD | w3.org/TR/css-values-3/ · -4/ | canonical unit rem, `<dimension>`/`<number>`/`<percentage>` |
| hermetic cascade | **CSS Cascade 4/5/6** · CR/CR/WD | w3.org/TR/css-cascade-5/ | @layer, @scope, all:revert, @property — deterministic cascade; see hermetic-css.md |
| CSS engine (extraction) | **W3C CSS software** · index · **Stylo**/**Taffy**/**WeasyPrint** | w3.org/Style/CSS/software | tezcatl (WebKit) now; pinned standalone engine later (hermetic); see hermetic-css.md |
| containment (bounded scope) | **CSS Contain 1** · **REC** | w3.org/TR/css-contain-1/ | `contain`/`content-visibility` — browser-enforced bounded subtree = component = audit cell; see hermetic-css.md |
| `value-stages.md` | **CSS Cascade 5** · CR + **CSSOM** · WD | w3.org/TR/css-cascade-5/ · cssom-1/ | declared→…→resolved (derivation chain) |
| `value/color`      | **CSS Color 4** · CR | w3.org/TR/css-color-4/ | structured oklch { colorSpace, l, c, h, alpha } |
| `value/dimension`  | **CSS Values 4** · WD §6 | w3.org/TR/css-values-4/ | length, canonical unit rem |
| `value/number`     | **CSS Values 4** · WD §6.2 | w3.org/TR/css-values-4/ | unitless number |
| `value/percentage` | **CSS Values 4** · WD §6.3 | w3.org/TR/css-values-4/ | `<percentage>` |
| `value/fontFamily` | **CSS Fonts 4** · WD §5.1 | w3.org/TR/css-fonts-4/ | family stack + generic |
| `value/keyword`    | **CSS Values 4** / **Cascade 5** | w3.org/TR/css-values-4/ · css-cascade-5/ | `<ident>` + CSS-wide keywords |
| `value/shadow`     | **CSS Backgrounds 3** · CRD §7 | w3.org/TR/css-backgrounds-3/ | composite: merkle of color+dimensions |
| `value/typography` | **CSS Fonts 3/4** REC/WD + **DTCG** §9.8 | w3.org/TR/css-fonts-3/ · css-fonts-4/ | composite: merkle of fontFamily+size+weight+leading+tracking |
| all value types    | **DTCG** · CG · 2025.10 | designtokens.org/tr/2025.10/format/ | typed-token alignment (union in value.schema.json) |
| font resources (LATER) | **CSS Fonts 3** · REC (@font-face) | w3.org/TR/css-fonts-3/ | self-hosted font files as CAS atoms + @font-face claims |
| **layout** (LATER) | **CSS Display 3** · CR · **Flexbox 1** · CR · **Grid 2** · CR · **Box 3/4** · **Position 3** | w3.org/TR/css-display-3/ · css-flexbox-1/ · css-grid-2/ | display/flex/grid/position — mostly keyword+number+dimension atoms (already typed); grid track-lists are composites; not yet EXTRACTED (css-project KEYS are design, not structure) |
| basic UI (LATER) | **CSS UI 3** · REC | w3.org/TR/css-ui-3/ | box-sizing, outline, cursor, text-overflow, resize |
| logical props / i18n (LATER) | **CSS Writing Modes 3** · REC | w3.org/TR/css-writing-modes-3/ | block/inline logical properties, direction, orientation (we already see border-block-end / padding-inline in the extraction) |
| `contrast` | **WCAG 2.1** · **REC** | w3.org/TR/WCAG21/ | AA/AAA contrast, large-text thresholds |
| `sitemap.{json,xml}` | **sitemaps.org 0.9** · de-facto + XSD | sitemaps.org/protocol.html | urlset, strict-sort priority; VALIDATES vs official XSD |
| sitemap `synoptic:` ext | **sitemaps.org** ext · de-facto | sitemaps.org/protocol.html#extending | `<synoptic:root>`; declared in `synoptic-sitemap.xsd` |
| `robots.txt` | **robotstxt.org** · de-facto | robotstxt.org | User-agent + Sitemap |
| `spec/claim.schema.json` | **in-toto/SLSA** + **W3C VC** · REC | slsa.dev · w3.org/TR/vc-data-model/ | attestations / claims + proof + signer |
| `proof/*.lean` | **Lean 4** kernel | leanprover | kernel-verified theorems |
| signing | **Sigstore** (Fulcio/Rekor/OIDC) | sigstore.dev | keyless axiom signatures |
| projections (all) | **CSS Syntax 3** · CR + **CommonMark** | w3.org/TR/css-syntax-3/ · commonmark.org | one graph → aligned surfaces; see PROJECTIONS.md |
| CRT / inline CSS (LATER) | **CSS Style Attributes** · REC | w3.org/TR/css-style-attr/ | critical-CSS sub-projection to inline <style> |
| `partition` (MECE audit) | **Selectors 3** · **REC** | w3.org/TR/selectors-3/ | signature buckets (tag+classes) partition the DOM; exhaustive + exclusive |
| responsive (LATER) | **Media Queries 3** · REC / **5** · WD | w3.org/TR/mediaqueries-3/ · mediaqueries-5/ | audits are per-viewport; full surface = partition × breakpoints |
| namespaces (all) | **XML-Names** REC · **CSS-NS 3** CR · **JSON-LD** REC · **RFC 3986** | w3.org/TR/xml-names/ · css-namespaces/ | see NAMESPACES.md — our vocabulary registry |
| `graph` / `/json.ld` | **JSON-LD 1.1** · **REC** + schema.org | w3.org/TR/json-ld11/ | the normalized linked graph |
| `sbom` | **SPDX 2.3** · ISO/IEC 5962 | spdx.dev | the claims SBOM |

Pin a **dated** version; undated URLs move. Prefer higher-maturity specs; when only a WD
exists, say so and re-check on churn. Ground on the **normative** text and its **MUST**s.

## Next drafts — track the trajectory

Ground in the current stable level, but track the **next draft** (where new features and
breaking changes land); pin the dated snapshot and re-check on churn.

| Current (grounded) | Next draft (track) | What's coming |
|---|---|---|
| CSS Color 4 · CR | **CSS Color 5** · WD 2026-05 | `color-mix()`, relative color, `contrast-color()` |
| CSS Values 4 · WD | CSS Values 4 (calc ext) | more math (`round()`, `mod()`, trig) |
| CSS Cascade 5 · CR | **CSS Cascade 6** · WD | `@scope` |
| CSS Selectors 3 · REC | **CSS Selectors 4** · WD | `:has()`, `:is()`, `:where()`, `:not()` list |
| CSS Backgrounds 3 · CRD | CSS Backgrounds 4 · ED | |
| Media Queries 3 · REC | **Media Queries 4** · CR / **5** · WD | `prefers-*`, range syntax, custom MQ |
| CSS Writing Modes 3 · REC | CSS Writing Modes 4 · WD | |
| CSS UI 3 · REC | **CSS UI 4** · WD | `accent-color`, `caret`, wider `appearance` |
| CSS Fonts 4 · WD | CSS Fonts 5 · ED | |
| WCAG 2.1 · REC | **WCAG 2.2** · REC → **WCAG 3.0** · draft | new SC; a new scoring model (3.0) |
| JSON-LD 1.1 · REC | JSON-LD 1.2 · WD | |
| DTCG 2025.10 · CG | newer dated DTCG | typography/gradient type churn (ISSUE 102) |

**Rule:** grounding cites the *current* stable; this table names the *next* so we're not
surprised. When a next draft reaches CR/REC, re-ground and note the diff.
