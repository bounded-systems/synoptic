# Grounding — every capability tied to its formal spec

Principle: **we don't assert formats or math, we ground them.** Each capability cites the
authoritative spec (name · **status** · dated) it implements; where a machine schema
exists we validate against it. Spec-grounded work is `grounded` (basis: the spec), never
`axiomatic`.

**The master index — reference, don't enumerate.** There are ~150 CSS specs (+ levels):
`drafts.csswg.org/index.html` is the list, **csswg-drafts** (w3c/csswg-drafts) its source,
**webref** (`@webref/css`) its **machine-readable form** (every spec, status, term,
value-type). We do NOT hand-transcribe them — that's unbounded and instantly stale. This
registry is the small set we *implement*; the authoritative *space* is the index, and the
registry itself should be **derived from webref** (join "specs we use" against webref's
data), so grounding is a `derivable` view, auto-covering the index, not a hand-typed list.
The rows below are the current hand-maintained snapshot pending that derivation.

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
- **Status = grounding strength**, per the **W3C process** (grounded in
  w3.org/standards/types/ — the maturity levels are authoritative, not our labels). Check
  w3.org/Style/CSS/current-work for a CSS spec's status.

```
REC        Recommendation            a web standard, final, stable   ← strongest grounding
CR / CRD   Candidate Recommendation  (Snapshot | Draft) near-final, testable
WD / FPWD  Working Draft             in development, may change       ← pin the date, expect churn
ED         Editor's Draft            most provisional (csswg-drafts)
Note/Stmt  W3C Note / Statement      NOT a standard (informative)
Registry   Registry track           a maintained list
CG         Community Group Report    de-facto, not W3C track          (DTCG)
—          IETF RFC / ISO / de-facto other body's status             (sitemaps.org, SPDX)
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
| `contrast` | **WCAG 2.2** · **REC** (2023) | w3.org/TR/WCAG22/ | SC **1.4.3** Contrast (Minimum, AA 4.5/3) + **1.4.6** (Enhanced, AAA 7/4.5); large-text thresholds. 2.2 supersedes 2.1 (backward-compatible; adds Focus Appearance, Target Size, …) |
| `sitemap.{json,xml}` | **sitemaps.org 0.9** · de-facto + XSD | sitemaps.org/protocol.html | urlset, strict-sort priority; VALIDATES vs official XSD |
| sitemap `synoptic:` ext | **sitemaps.org** ext · de-facto | sitemaps.org/protocol.html#extending | `<synoptic:root>`; declared in `synoptic-sitemap.xsd` |
| `robots.txt` | **robotstxt.org** · de-facto | robotstxt.org | User-agent + Sitemap |
| `spec/claim.schema.json` | **in-toto/SLSA** + **W3C VC** · REC | slsa.dev · w3.org/TR/vc-data-model/ | attestations / claims + proof + signer |
| `proof/*.lean` | **Lean 4** kernel | leanprover | kernel-verified theorems |
| signing | **Sigstore** (Fulcio/Rekor/OIDC) | sigstore.dev | keyless axiom signatures |
| projections (all) | **CSS Syntax 3** · CR + **CommonMark** | w3.org/TR/css-syntax-3/ · commonmark.org | one graph → aligned surfaces; see PROJECTIONS.md |
| CRT / inline CSS (LATER) | **CSS Style Attributes** · REC | w3.org/TR/css-style-attr/ | critical-CSS sub-projection to inline <style> |
| `partition` (MECE audit) | **Selectors 3** · **REC** | w3.org/TR/selectors-3/ | signature buckets (tag+classes) partition the DOM; exhaustive + exclusive |
| responsive + reflow | **Media Queries 3** · REC / **5** · WD + **WCAG 2.2 SC 1.4.10** Reflow (AA) | w3.org/TR/mediaqueries-3/ · w3.org/TR/WCAG22/#reflow | audits are per-viewport; full surface = partition × breakpoints. REFLOW: render at **320 CSS px** width → assert no horizontal scroll (`scrollWidth ≤ clientWidth`), except content needing 2D layout (maps, data tables). Needs viewport control (tezcatl `--width`, or the pinned responsive engine) |
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

## Verification sources — grounding the grounding

Citing a spec is `grounded`; **validating against the machine-readable spec data is
stronger** (derivable, not asserted). The CSS WG ships the tooling:

| Source | What | Use |
|---|---|---|
| **webref** · `@webref/css` `@webref/idl` · w3c/webref | machine-readable terms / properties / value-types extracted from **all** web specs, versioned | **derive & verify** GROUNDING rows + our value-type coverage from the actual spec definitions — grounding becomes a **derivable** claim, not an axiom |
| **css-validator** · w3c/css-validator | the W3C CSS Validation Service (Java) | validate our **emitted** CSS projection |
| **csswg-test / WPT** · web-platform-tests | the official CSS conformance test suite | conformance-test a **pinned engine** (Stylo/Taffy) |
| **css-aam** · w3c/css-aam | CSS Accessibility API Mappings | ground the a11y layer (with `contrast`) |
| **ARIA APG** · w3c/aria-practices | WAI-ARIA Authoring Practices | accessibility patterns |
| **csswg-drafts** · w3c/csswg-drafts (Bikeshed) | the editor's drafts source | the *next-draft* text (trajectory table) |

**Meta:** *webref grounds the grounding.* Pull "CSS Color 4 defines `oklch`" from webref
(extracted from the spec) instead of hand-asserting it — then GROUNDING.md itself is
`derivable`, the loop is: cite spec → verify vs webref → conformance-test vs WPT →
validate output vs css-validator.

## Horizontal review — the cross-cutting concerns

W3C reviews every spec against **horizontal concerns**; so should our work. Grounded, with
relevance (privacy is low for CSS, per note):

| Concern | Authority | Relevance to us |
|---|---|---|
| **Accessibility** | **WAI** · w3.org/WAI/standards-guidelines/ — **WCAG 2.1/2.2** (content, REC) · **ARIA** (roles/states) · **ATAG** (authoring) · **UAAG** (user agents) · **css-aam** | **HIGH** — `contrast` (WCAG), ARIA roles in the graph/projection, css-aam mappings; a11y is a first-class projection concern |
| **Internationalization** | **W3C i18n** · w3.org/mission/internationalization/ — **CSS Writing Modes 3** (logical props, direction), character model, `lang`, bidi | **MEDIUM** — we already extract logical props (`border-block-end`, `padding-inline`); the projection must be direction-aware (`dir`, logical over physical) |
| **Security** | **W3C security** · w3.org/mission/security/ | **LOW** for CSS; **HIGH** for the claim/signing layer (Sigstore, in-toto, OIDC — already grounded), and `secret-scan` on the public projection |
| **Privacy** | **W3C privacy** · w3.org/mission/privacy/ | **LOW** for CSS (per note); relevant only if the graph carries PII — `secret-scan --allow email` already gates the projection |

**Rule:** for anything user-facing, run the horizontal check. A11y (WCAG/ARIA, logical
props) is first-class; security lives in the claim layer; privacy is guarded by
secret-scan. Prefer **logical** properties over physical, and keep the graph direction-
and language-aware.

## W3C groups — the concern owners ("groups as concerns")

Grounding organized by the W3C **group / task-force** that *owns* each area — the group is
the authority, its charter + repo define the current spec set. Machine-readable list:
github.com/w3c/groups.

| Concern | W3C group / TF | Owns | Our work |
|---|---|---|---|
| **CSS** | **CSS WG** · w3.org/groups/wg/css/ · w3c/csswg-drafts | all CSS modules (color, values, cascade, selectors, fonts, contain, …) | canonicalize, css-project, value types, hermetic-css, partition |
| **Accessibility** | **WAI**: **AG WG** (WCAG) · **APA WG** · **CSS-a11y TF** · w3.org/WAI/about/groups/task-forces/css-a11y/ · w3c/{wcag,css-a11y,css-aam} | WCAG 2.2, ARIA, css-aam | `contrast`, `reflow`, a11y projection — the CSS∩a11y intersection |
| **Internationalization** | **i18n WG** | writing modes, bidi, `lang`, character model | logical props, direction-aware projection |
| **Security / Privacy** | Security IG / Privacy IG (horizontal review) | cross-cutting review | claim/signing layer, `secret-scan` |
| **Linked Data** | **JSON-LD WG** | JSON-LD 1.1 | the graph / `/json.ld` |
| **Verifiable Credentials** | **VC WG** | claims + proofs | `claim.schema.json` |
| **spec tooling** | (CSS WG tools) · w3.org/groups/wg/css/tools/ · **webref** | test suites, webref, validators | verification sources |

**`reflow` note:** the CSS-a11y TF is where SC 1.4.10 lives (CSS∩a11y). Our `reflow` audit
is correct but **inconclusive** until a viewport-capable engine runs it (tezcatl `--width`
→ `--eval`, or the pinned responsive engine) — tracked in hermetic-css.md's engine section.

## Houdini & the spec source (the machine-readable substrate)

| Source | What | Use |
|---|---|---|
| **csswg-drafts** · github.com/w3c/csswg-drafts (Bikeshed) | the source of **every** CSS spec, in one repo, per-commit | **pin a commit** → hermetic grounding of the spec *text* itself (not just the dated /TR snapshot) |
| **CSS Typed OM** · Houdini · drafts.css-houdini.org/css-typed-om/ · WD | native typed CSS values: `CSSUnitValue{value,unit}`, `CSSKeywordValue`, `CSSNumericValue`, `CSSStyleValue` | this **IS** our value-type model, browser-native — `element.computedStyleMap()` returns typed values, no string-parsing. Validates `value/*.schema.json`; a cleaner extraction than `getComputedStyle` |
| **Properties & Values API** · Houdini · drafts.css-houdini.org/css-properties-values-api/ · CR | `@property { syntax; inherits; initial }` — typed, controlled-inheritance custom properties | grounds hermetic-css `@property inherits:false`; typed tokens with a declared `syntax` (`<color>`, `<length>`) |
| **Paint / Layout API** · Houdini | worklets that participate in render/layout | (later) a projection could ship a paint/layout worklet |

**Key alignment:** `getComputedStyle` → strings (we parse + type them). `computedStyleMap()`
→ **already-typed** `CSSStyleValue`s = our atoms, for free. Our `spec/value/*` is a
re-derivation of the Typed OM; grounding it there means the browser's own type system is
the authority. Migration path: extract via Typed OM, canonicalize (oklch/rem), CAS — same
pipeline, typed at the source.

### Houdini — more (box tree + Typed OM 2)

| Source | What | Use |
|---|---|---|
| **Box Tree API** · drafts.css-houdini.org/box-tree-api/ · ED | the native **box tree** (layout boxes, incl. anonymous + generated) — the *used-value structure* below the DOM | the browser-native version of `partition`: partition by **box**, not just element; the true layout tree for used values (post-layout `reflow`) |
| **CSS Typed OM 2** · drafts.css-houdini.org/css-typed-om-2/ · ED | next Typed OM — more `CSSStyleValue` types, richer `computedStyleMap()` | the forward target for typed extraction (track per next-drafts) |

**So the extraction has a native pair:** **Typed OM** (typed *values*) + **Box Tree API**
(the *boxes* they apply to). Together = typed atoms on real layout boxes, no string parsing
and no element-tree approximation — the hermetic, browser-native form of css-project +
partition. Both ED (provisional); tezcatl/WebKit support is partial, so this is the
*direction*, with `getComputedStyle` + element signatures the working path today.

### CSS WG process & community (informative — never grounds)

Apply the normative-vs-non-normative rule to the WG's *own* material:
- **csswg-wiki** · wiki.csswg.org — community docs, meeting notes, planning.
- **wiki/ideas** · wiki.csswg.org/ideas — future-feature brainstorming. **NOT specs** —
  never ground in these; they're pre-proposal.
- **wiki/spec** · wiki.csswg.org/spec — *how* CSS specs are authored (Bikeshed,
  conventions). A **model for how we write our own** spec docs (`spec/*.md`, the schemas):
  definitions first, normative markers, dated versions, conformance.
- **csswg-drafts issues** — where decisions are debated (the *why* / rationale).

These **inform** (process, rationale, authoring model); only the published **normative
spec** grounds.

## Prior art — reuse vs novel (so we don't reinvent)

Honest map: below the substrate, **use the library**; the substrate is where our energy goes.

**REUSE (commodity — prefer the existing implementation):**
- color math (rgb/p3→oklch, ΔE) → **colorjs.io** / **culori** (retire our hand-rolled matrices)
- typed values → **CSS Typed OM** `computedStyleMap()` (native; our `value/*` re-derives it)
- CSS parse / canonicalize → **lightningcss** · css-tree · postcss
- computed styles → **tezcatl** (WebKit) now / **Stylo + Taffy** (hermetic) later
- contrast / a11y → **axe-core** · pa11y (we rebuilt for a *hermetic* stack — deliberate)
- sitemap · robots · SBOM · DTCG → standard formats we **emit**, not reinvent

**OURS (novel — the actual contribution):**
- **CAS + claims + a PROOF LADDER over typed CSS values** — atoms, `merkle(key,value)`
  declarations, `axiom`/`derivable`. Perkeep-with-proofs, applied to a site. Nothing else
  does this.
- **One graph → aligned projections** (HTML/MD/JSON-LD/CSS/DTCG/sitemap) with
  `verify-artifact` provenance + a site Merkle root.
- **Grounding-as-proofType** — spec-grounding treated as `grounded` claims (this doc).

**Rule:** if a spec or a maintained library already does it, ground on / use that. Spend
our effort only on the substrate (CAS/claims/proof/graph) — the part that doesn't exist.

## Typed OM → JSON Schema (value/* is the projection)

The **CSS Typed OM** is our value model, native. `spec/value/*.schema.json` **is the
projection of the Typed OM WebIDL** — *derivable* (`webref` → `webidl2` → Zod → JSON
Schema), not hand-asserted. No standard Zod-over-Typed-OM exists; we **generate** it from
webref's IDL (`@webref/idl`).

| CSS Typed OM (WebIDL) | our schema |
|---|---|
| `CSSUnitValue { value: double, unit }` | `value/dimension` (unit `rem`) · `value/percentage` · `value/number` |
| `CSSKeywordValue { value }` | `value/keyword` (incl. system colors) |
| `CSSStyleValue` (color) | `value/color { colorSpace:oklch, l, c, h, alpha }` |
| `CSSNumericValue` / `CSSMathValue` | `value/number` (+ `calc()` later) |
| `CSSStyleValue` (composite) | `value/shadow` · `value/typography` — merkle of sub-atoms |

**Color generates too** (my earlier L1-only claim was wrong): CSS Typed OM **Level 2**
has the color interfaces — `CSSOKLCH { l, c, h, alpha }`, `CSSColor { colorSpace, channels,
alpha }`, `CSSRGB`/`CSSHSL`/`CSSLab`/`CSSLCH`/`CSSOKLab` — so `value/color` is GENERATED
from `CSSOKLCH` (see spec/value/generated/). Only the *composites* (`shadow`, `typography`)
and `fontFamily` stay grounded extensions (no distinct Typed OM interface). `var()` refs
are `CSSUnparsedValue`/`CSSVariableReferenceValue` (§5.3–5.4) — the authored token graph.

`canonicalizeTyped()` emits exactly this shape (the modern `{value, unit}` form, not
`"1rem"`); `element.computedStyleMap()` sources it natively in the browser. So: **extract
via Typed OM → typed atoms (schema = projected IDL) → canonicalize (oklch/rem, culori) →
CAS.** Color math via **culori** (nix-provided; hand-rolled fallback). The value layer is
now the browser's own type system, projected to JSON Schema and content-addressed.

## Content names — the name IS the value (Typed OM internal representation, inlined)

`name-values` names each distinct value by **inlining its value** — no namespace, no
bucketing. This projects the **CSS Typed OM internal representation**
(drafts.css-houdini.org/css-typed-om/#css-internal-representation — a color's
`{l,c,h,alpha}`, a length's `{value,unit}`) directly into the name:

```
oklch-23_84-0_0204-162_64-1   ← the color's internal representation, inlined
0_25rem · 1rem · 0            ← the dimension, inlined
space-grotesk--sans-serif    ← the font stack, inlined
normal · none                ← keywords are themselves
```

**The name is a human-readable content-address.** Two properties: (1) identical values →
identical names, always (unique per value — verified 107/107); (2) the value is *legible*
from the name (unlike the sha256 address). So each atom has two content-addresses: the
opaque `sha256:…` and the legible inlined name — both derived solely from content, neither
needing a namespace. Namespaces (`--bs-*`) disambiguate *authored* names that could
collide; content names *cannot* collide for the same value, so they need none. The `--bs-*`
tokens become *aliases* pointing at the content-named atom.

## Pinning the Typed OM WebIDL (Houdini = ED)

The Typed OM lives in **Houdini Editor'"'"'s Drafts** (drafts.css-houdini.org) — **ED, no W3C
maturity, they move.** So the vendored `spec/typed-om.webidl` is a **pinned snapshot**
(header carries spec + source + `vendored:` date), the same discipline as pinning a dated
`/TR` version. In CI, prefer **`@webref/idl`** (pins `css-typed-om` by release). Re-vendor
by copying the spec'"'"'s WebIDL, bumping the date, and re-running `gen-value-schemas` — the
generated `value/*` then updates from the new pin. Track next in the next-drafts table
(Typed OM 2 is where color/math land).

## Color spaces & derivation (CSS Color 5) — beyond oklch

oklch is our **canonical** space (perceptual, device-independent). CSS Color 5 adds two
layers we ground while keeping oklch as the comparison space:

**Wide / print spaces — the general `CSSColor` form.** Beyond sRGB/oklch, CSS has lab, lch,
oklab, xyz, wide-gamut RGB (display-p3, rec2020, a98, prophoto), and via **`@color-profile`**
(CSS Color 5 §5.4) arbitrary ICC profiles: **`device-cmyk`** (4-ink) and CMYKOGV (7-ink)
print (FOGRA/SWOP). A CMYK color resolves to a known Lab/oklch (**soft-proof**), so oklch
stays canonical; to *specify* print you carry profile + channels. `value/color`
**generalizes to Typed OM `CSSColor(colorSpace, channels, alpha)`** — `colorSpace: oklch`
default, `{profile, channels}` the escape hatch for print/wide, with an oklch soft-proof
alongside. Grounded: CSS Color 5 §5.4 · Typed OM `CSSColor`.

**Derived colors — the relationship layer (proofType `derivable`).** A color can be a
FUNCTION of others: `color-mix(in oklab, A, B 40%)` (§11.1, precise serialization) and
relative color `oklch(from A l c calc(h - 120))`. These are **derivations, not axioms** — a
mixed/rotated color is derivable from its inputs. In the proof ladder: a tonal ramp IS a
base at stepped L (relative), an accent IS a mix — so a 42-color palette compresses to a few
**base axioms + derivable claims**, signed only at the base. Grounded: CSS Color 5
(color-mix, relative color) · [[project_check_layers]] proof ladder.

## Color profiles as atoms (CSS Color 5 @color-profile / CMYK)

A **color profile** is content, so it's an atom: `{ name, src, renderingIntent, components }`
— exactly the **`CSSColorProfileRule`** CSSOM shape (§12.1, vendored). A profiled/CMYK/CMYKOGV
color decomposes into a **profile atom** + a **channels atom** `[c,m,y,k…]`; the color is a
*claim* `{profile-ref, channels}` + an oklch soft-proof.

- **Serialization = our canonicalization.** `color(--swop5c 0% 70.0% 20.00% .0%)` →
  `color(--swop5c 0 0.7 0.2 0)` (percentages→0–1 numbers, trailing zeros trimmed, 8-bit
  round-trip). Content-name: `swop5c-0-0_7-0_2-0`. Same inlined-value scheme as oklch atoms.
- **Rendering intent** (relative/absolute-colorimetric, perceptual, saturation — ICC) is a
  descriptor on the profile atom: *how* it gamut-maps.
- **Defaults** (§13): `:link { color: LinkText }` resolves via **system colors** (our role
  layer); `@color-profile device-cmyk` defaults to FOGRA39 with a **naive CMYK→sRGB
  fallback** (§14) — a `derivable` fallback vs the profile-accurate `grounded` ICC
  conversion (a proof-ladder call).

Grounded: CSS Color 5 §5.4/§11–14 · `CSSColorProfileRule`.

## Perceptual distance (JND) — the resolution of the value space

The principle under the whole engine: **every value dimension has a just-noticeable-
difference (JND)** — a threshold below which two values are perceptually identical, above
which they're distinct. This is *why* canonicalization + content-addressing are principled,
not arbitrary.

| dimension | perceptual distance | our use |
|---|---|---|
| color | **ΔEOK** (oklab distance); ~0.02 ≈ JND, CIEDE2000 ΔE≥1 "just visible" | near-dupe merge (`color-review`), powerless-hue cutoff (`color-health`) |
| lightness / readability | **WCAG contrast** — a *task* distance (readable, not just distinct) | `contrast`; the L-band/moat geometry |
| size / weight / spacing | a **ratio** (Weber–Fechner / Stevens: perception ∝ log stimulus) | type/space scales are ratios, not fixed steps |

Consequences:
1. **Sub-JND differences collapse to one atom** — canonicalization is exactly this (float
   noise, rounding, invisible tints all reduce to one content-address). A value is *real*
   only if ≥ 1 JND from its neighbors.
2. **The atom set is finite and small** — perception quantizes the space; the content atoms
   are the quanta (42 colors → 16 axioms approaches the count of genuinely distinct
   decisions).
3. **Task rules impose distances *larger* than the JND → structure.** "Distinguishable" is
   the JND floor; "readable" (contrast) → **bands**; "feels like a step" (type) → **scales/
   ratios**. Moats and ladders are perceptual minimums turned into design rules.

Grounded: color science (ΔE, CIEDE2000, OKLab), psychophysics (Weber–Fechner / Stevens),
WCAG (task-level contrast). See [[project_check_layers]] — sub-JND = no real distinction to
axiomatize.

### How many bands fit — the contrast/band formula

From a fixed floor (black, luminance 0), levels stack as **ratio steps** of the bar R. The
maximum possible contrast is **21:1** (white on black = (1+0.05)/(0+0.05)). So the number of
mutually-contrasting bands is **logarithmic** in the bar:

```
N_max = floor( 1 + log(21) / log(R) )        R = required contrast ratio
```

| R | | bands |
|---|---|---|
| 1.5:1 | subtle UI | 8 |
| 2:1 | | 5 |
| 3:1 | large text / UI | 3 |
| 4.5:1 | AA body | 3 |
| 7:1 | AAA body | 2 |
| 21:1 | white on black | 2 |

It's a **log** because contrast is a *ratio* — each band multiplies the last by R, and you're
partitioning the fixed 21× range into R-sized factors. Raising the bar doesn't shrink bands
linearly; it *compresses the ladder logarithmically*. This is the quantitative form of "L
bands always" — ≥ 2 bands at any bar, and exactly `floor(1 + log21/logR)` from a fixed floor.

### Derivations reduce to one primitive (relative-color)

`color-mix()` reaches a *line* between two colors (tint→white, shade→black, fade→transparent)
and always changes chroma toward the target. Relative-color `oklch(from base <l><c><h>/<a>)`
does arbitrary per-channel math — so **every color-mix is a special case of it** (a tint is
`calc(l * k + t) calc(c * k) h`; a fade is `l c h / calc(alpha * k)`). `derive-palette
--uniform` rewrites all derivations into that single form. So the palette is: **N signed
axioms + a proof tree of one universal operation** (color-mix is semantic sugar naming the
intent). What relative-color adds that mix can't: constant-chroma L steps and hue rotation.

### AAA and the chroma ceiling — accessibility mutes color (a gamut consequence)

WCAG constrains only **L** (AAA → 2 bands: dark surfaces + light text, mid-L moat forbidden).
C and H are free *of WCAG* — but the sRGB **chroma ceiling** (max in-gamut C by L) is a lens:
pinched at the extremes, fat in the middle.

```
L 24  Cmax 0.16   AAA dark band — LOW ceiling (can't be dark AND vivid)
L 50–67 Cmax ~0.30  the MOAT — most saturated, and FORBIDDEN for text/bg under AAA
L 90  Cmax 0.24   AAA light band — moderate
```

So AAA banishes you to the pinched ends and forbids the vivid middle → **AAA palettes are
inherently muted, dark surfaces most of all** (this is geometry, not taste — bounded.tools'
low chroma is *forced* by being AAA, not chosen). Design consequences: put color in the
*light* band (more room), keep dark surfaces near-neutral, reserve saturated mid-tones for
large-text/UI (3:1). Distinct-color budget per band = `π·Cmax² / JND²` ≈ 200 (dark) / 450
(light) colors — the scarcity is entirely in **L**; H and C have enormous unused room.

Grounded: OKLab/OKLCh axes + CSS scaling (CSS Color 4 §9.2; a,b ±0.4 = ±100%, C 0.4 = 100%),
sRGB gamut, WCAG contrast, JND. The trilogy: L = accessibility budget (bands), C = gamut-
capped at the L you're forced to, H = free.

### Derivations are per-axis affine maps (color-mix = the coupled slice)

Your insight, formalized: **every color derivation is a per-axis affine map** on
(L, C, H, α) — `channel' = k·channel + o`, one `(k, o)` per axis. That single form unifies
the "different call trees":

| derivation | L | C | H | α |
|---|---|---|---|---|
| tint | ×k +o | ×k | — | — |
| shade | ×k | ×k | — | — |
| fade | — | — | — | ×k |
| L-step | +o | — | — | — |
| hue-rotate | — | — | +o | — |

- **`color-mix(A, target, t)` = the SAME `t` on every axis** (one knob, coupled) — it moves
  along a straight line toward the target and can **never hold an axis**. That coupling is
  *exactly* why it drags chroma when it lifts lightness: tint/shade move L **and** C together.
- **relative-color `oklch(from A …)` = `(k, o)` chosen per axis** (four knobs), including
  **identity (—) = hold**. L-step holds C, H; hue-rotate holds L, C — impossible for mix.

So `color-mix` is the **diagonal (equal-`t`) slice** of the full per-axis affine group;
relative-color **is** the group. The canonical derivation record is just **4 (scale, offset)
pairs**; whether it renders as `color-mix` or `oklch(from …)` is a surface choice, not a
different operation. Grounded: CSS Color 5 (color-mix §11, relative color) · the palette
proof tree ([[project_check_layers]]).

### Degenerate points — where axes stop carrying information

Some regions of color space collapse axes; storing the collapsed axis is redundant noise.
Ordered by strength:

| condition | what collapses | canonical atom |
|---|---|---|
| **α = 0** (full transparency) | **everything** — L, C, H all unobservable; premultiplied interpolation zeroes the channels (CSS Color 4 §12.3) | ONE `oklch(0% 0 0 / 0)` — the compositing identity ("nothing") |
| **C = 0** (achromatic) | **H** — hue is *powerless* (CSS Color 4 §12.4) | one gray per (L, α) |
| **L = 0 / 100** (in-gamut ⇒ C→0) | H (and C) | black / white |

Full transparency IS valid — it's the identity element of compositing (`X` over transparent
= `X`) — but there is exactly **one** of it; all α=0 colors are the same value. `emitOklch`
now collapses every α=0 to the single transparent atom (the α-axis analog of the powerless-
hue collapse; the JND on all other axes is infinite when nothing is shown). Grounded: CSS
Color 4 §12.3 (premultiplied alpha) · §12.4 (powerless components) · [[project_check_layers]].

### What is a good JND? (and why hue count is chroma-weighted)

There is no single JND — it is **per-axis and context-dependent**. Grounded working values:

| axis | JND (just-noticeable) | note |
|---|---|---|
| overall color | **ΔEOK ≈ 0.02** | ≈ CIEDE2000 ΔE 1–2 ("just visible"); our dedup/health threshold |
| lightness L | ~1–2% | perceptually uniform, so absolute |
| chroma C | ~0.01–0.02 | absolute-ish |
| **hue H** | **≈ ΔEOK / C radians** = `0.02/C · 57.3°` | **scales with chroma** — the key one |

Hue is the trap: `perceptual hue distance ≈ C · Δh`, so at low chroma the hue JND explodes
(C 0.13 → 9°; C 0.05 → 23°; C 0.02 → 57°). A near-gray can drift almost any hue unseen.

**Consequence for "how many hues":** count only where chroma resolves hue. bounded.tools:
19 raw hue values → **2 perceptually-distinct hues** (a warm ~80° and a cool ~165°) + neutrals;
the other ~29 chromatic colors are desaturated members whose hue doesn't independently
resolve. Choosing the JND coarser (0.02 → 0.05) forces ffewer, more-distinct tokens — a
design lever, not just a dedup threshold. Grounded: CIEDE2000, OKLab geometry, psychophysics.

### References for the JND / perceptual-distance claims (dated authorities)

- **OKLab / OKLCh** — Björn Ottosson, *"A perceptual color space for image processing"*
  (2020-12-23) · https://bottosson.github.io/posts/oklab/ · (CSS use: CSS Color 4 §9.2,
  https://www.w3.org/TR/css-color-4/#ok-lab)
- **CIEDE2000 ΔE** — Sharma, Wu, Dalal, *"The CIEDE2000 Color-Difference Formula:
  Implementation Notes…"*, Color Res. Appl. 30(1) 21–30 (2005) · impl.:
  http://www2.ece.rochester.edu/~gsharma/ciede2000/ · standard: **CIE 15:2004** Colorimetry
- **Weber–Fechner law** — G. T. Fechner, *Elemente der Psychophysik* (1860) — JND ∝ stimulus
- **Stevens' power law** — S. S. Stevens, *"On the psychophysical law,"* Psychol. Rev.
  64(3) 153–181 (1957) · doi:10.1037/h0046162
- **Premultiplied alpha · powerless components** — CSS Color 4 §12.3 / §12.4 (CR) ·
  https://www.w3.org/TR/css-color-4/#interpolation-alpha ·
  https://www.w3.org/TR/css-color-4/#powerless
- **Contrast** — WCAG 2.2 (REC 2023) · https://www.w3.org/TR/WCAG22/ · APCA (WCAG 3 WD) ·
  https://www.w3.org/TR/wcag-3.0/

### Universal vs. specific: what "2 hues + neutrals" is (and isn't)

**Not a law — a design choice made visible.** bounded.tools *chose* a warm+cool+grays
palette; a vibrant brand could resolve 6+ hues. What **is** universal:
1. **The structure** — every palette = (resolvable hues) + neutrals + a per-hue (L%, C%, α%)
   lattice. Always.
2. **The method** — hue count is **chroma-weighted** (hue JND ≈ ΔEOK/C); low-chroma colors
   never add hues. Always.
3. **The bias toward few** — restraint is good design, **AAA mutes color** (pushes to
   neutrals + few hues, per the chroma-ceiling result), and JND collapses drift. So *low*
   hue counts are common — but the *number* is chosen, not forced.

So: the collapse *to* (hues + neutrals + lattice) always happens; **how many hues** is the
designer's, revealed by the chroma-weighted count — here, 2.
