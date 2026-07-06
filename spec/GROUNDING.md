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
