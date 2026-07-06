# Epic — deploy the color work + design system to prod (both public sites)

Beads is not configured for this checkout (`prx beads` → no `.beads/`), so this stands in as
the epic. Convert to `bd` tasks in the execution session.

## Ground truth (from reconnaissance, 2026-07-06)
- **Design system EXISTS + is mature** — `bounded-systems/brand` v1.4.0 (npm-published, mint
  provenance). `@layer baobab` + `@property` typed tokens, Style Dictionary from `tokens.json`,
  semantic palette (forest/paper/ink/clay/amber + grade-* + on-dark), spacing/radius/control
  scales. Colors are **HEX**, not oklch.
- **a11y tooling EXISTS + exceeds ours** — `token-a11y.yml` (APCA/CVD/non-text/typography) +
  active branch `feat/check-contrast-dogfood-baobab` wiring **baobab** `checkContrast()`.
  Our `contrast.mjs` is WCAG-ratio only. **baobab is the checker; don't reinvent it.**
- **synoptic is the THEORY** — `spec/color-model.md`, the oklch/JND grounding, AAA-by-
  construction, the pinned scale, `proof/Contrast.lean`, and the blog. Complementary, not a
  replacement for brand or baobab.
- Both sites are **generated** (bounded.tools, robertdelanghe.dev — hermetic Nix); the
  `palette` plugin consumes `@bounded-systems/brand`'s tokens.css.

## Tasks (dependency order)
1. **[P0 context]** Reconcile the theory with the product. Decide what (if anything) the
   color-model work contributes to brand: e.g. migrate hex tokens → oklch (grounded,
   gamut/powerless-clean), and add AAA-by-construction as a brand *constraint* baobab can check
   — WITHOUT duplicating baobab. Land on the active `feat/check-contrast-dogfood-baobab` branch
   or a fresh one, respecting Style Dictionary (edit `tokens.json`, not the generated css).
2. **[brand]** If oklch migration is in scope: `tokens.json` hex → oklch, regenerate via
   Style Dictionary, ensure `token-a11y` + baobab checks stay green. PR → review → merge.
3. **[synoptic]** Publish the blog as a generated route (`blog/colors-are-coordinates.*`)
   through `build-site.mjs`, styled from the brand tokens (not the vendored copy).
4. **[bounded.tools]** Bump `@bounded-systems/brand`; add the blog route. PR + CI.
5. **[robertdelanghe.dev]** Same. PR + CI.
6. **[GATE ×2]** Prod deploys — CI green → **human approves** → live. NOT self-approved.

## Guardrails
- Reuse, don't reinvent: brand (tokens) + baobab (a11y) are the products; synoptic is theory.
- Style Dictionary owns the generated css — edit `tokens.json`.
- Respect the active branch; don't clobber in-progress contrast work.
- Prod deploys are gated; the agent prepares PRs, the human approves the gate.

## P0 reconcile — DONE (read-only audit of the real brand palette, 2026-07-06)

Ran the color-model tools on brand's actual tokens + its `contrast.contract.json`. Findings:
- **Exact duplicate**: `color-paper` == `color-card-alt` == `#EDEAE1` (two names, one color).
- **7 powerless hues** (sub-JND tint, name a hue the eye can't see): `color-paper`,
  `color-forest-tint`, `color-on-forest`, `color-clay-tint`, `grade-aspirational-bg`,
  `grade-aspirational-on-dark`, `color-card-alt`.
- **15 near-duplicate pairs** (ΔEOK < 0.02).
- brand's contract targets **AA (4.5:1)**, not AAA — our "AAA by construction" aimed higher
  than the product's own bar.
- The colors ARE bounded.tools' palette (`color-forest`→oklch 41.69/.0817/166; `color-ink`→
  oklch 23.84/.0204/162.6) — confirmed the site derives from brand.

**Conclusion — what the theory contributes (and what it must NOT duplicate):**
- **Contrast = baobab's job** (APCA/CVD/non-text > our WCAG-ratio). Do not reinvent.
- **Unique contribution = color HYGIENE** baobab doesn't cover: powerless-hue detection,
  near-dupe/exact-dupe merge, gamut — plus oklch grounding. Composes with baobab.

**Concrete first brand PR (execution session):** a color-hygiene check — dedupe
`color-paper`/`color-card-alt`, flag the 7 powerless tints — edited in `tokens.json` (Style
Dictionary source), on the active `feat/check-contrast-dogfood-baobab` branch, kept green
through `token-a11y`. Small, real, non-duplicative. Then blog route → site bumps → gated deploy.

## Palette route — engine DONE, per-site config PENDING (both sites)

`build-site.mjs` now has `render: "palette"` (v0.19.0) — verified. To publish the palette on a
site, add ONE page to that site's `synoptic.config.json` → `build.pages`:

```json
{ "id": "palette", "title": "Palette", "route": "palette", "render": "palette",
  "query": { "type": "PropertyValue", "where": { "additionalType": "color" } } }
```

Then the site generates `/palette/` from ITS OWN brand tokens (bounded.tools →
@bounded-systems/brand; robertdelanghe.dev → @bdelanghe/brand), Merkle-rooted, in the grounded
form. **Do this in BOTH repos** (bounded.tools.git, robertdelanghe.dev) as PRs → CI → gated
prod deploy. The standalone `blog/palette.html` (gen-palette-page) is the static preview; the
route is the production form.

## Route + DTCG — engine DONE (v0.19.1); per-site deploy is a prx work unit

**Engine (synoptic, verified):**
- `render: "palette"` → the `/design/colors` page (swatch · oklch · per-axis name · value leaf).
- `/design/tokens.json` → **DTCG** projection (designtokens.org), grouped `color.*`/`space.*`.
- Route is just a config string: `"route": "design/colors"` (nests, no engine change).

**Per-site config (BOTH sites) — one page each:**
```json
{ "id": "design-colors", "title": "Colors", "route": "design/colors", "render": "palette",
  "query": { "type": "PropertyValue", "where": { "additionalType": "color" } } }
```

**OPEN reconnaissance (do FIRST in the execution session):**
- Verify HOW each site builds. `bounded.tools.git` looks like a **TS/Deno project** (package.json,
  tsconfig, content/strings.json) — confirm it actually runs synoptic `build-site.mjs` +
  `config.build.pages` before adding the route. Find `robertdelanghe.dev`'s repo (likely under
  `bdelanghe/`) and its build.
- Worktrees exist: `bounded.tools/mainx`, `brand/mainx` under `~/.local/state/git/worktrees/...`.

**Orchestration (gh-project-room helps here):** run as a `prx` work unit IN A WORK TREE —
`prx contract init` → `prx plan/implement/author` → `prx plan handoff`, source via `prx scout
source` (GH/beads/Notion). On merge, `scripts/deploy-notify-front-desk` posts to the board.
Two PRs (one per site) → CI (token-a11y stays green) → **gated prod deploy ×2 (human approves)**.

## ⛔ BLOCKER (recon correction, 2026-07-06) — wrong engine for deploy

**synoptic's `build-site.mjs` is NOT the production site generator.** Confirmed:
- No repo uses `synoptic.config.json` + `data/graph.json` at HEAD.
- The only production generator found is **`prx/packages/prx/scripts/build-site.ts`** (a
  separate TS implementation).
- `bounded.tools.git` = a **Bun GitHub-App webhook receiver** (`src/server.ts`: /health,
  /setup, /api/github/webhooks) — NOT the public site source. Where the public bounded.tools
  SITE is generated/deployed is still unlocated.
- `robertdelanghe.dev` = `bdelanghe.git` `_site/` + Nix flake; `_site/build.mjs` not at that
  path — build path unconfirmed.

**Consequence:** the `render:"palette"` + `/design/tokens.json` capability (synoptic v0.19.1)
is correct + verified but lives in the WRONG engine to deploy the live sites. It's a reference
implementation, not the production path.

**Do NOT deploy until resolved.** Real next steps (a proper investigation, its own unit):
1. Locate the ACTUAL generator + deploy for each public site (start: `prx build-site.ts`; find
   the bounded.tools site source; trace robertdelanghe.dev's Nix build).
2. Decide: port the palette capability to `prx`'s `build-site.ts`, OR have prx consume synoptic.
3. Only then: the per-site route + gated deploy.

**Honest note:** much of the session built color theory/tools in `synoptic` on the assumption
it was the production engine. The THEORY + tools (color-model, palette page, DTCG, Lean proof,
blog) are real and correct; the DEPLOY assumption was wrong. Verify the engine FIRST next time.

## ✓ RESOLVED — the real generator is `bounded-systems/site.git` (`bounded-tools-site`)

Not synoptic, not prx. `site.git` builds the public bounded.tools site:
- Custom `build.mjs` + `scripts/gen-*.mjs`; blog = `blog/*.md` via `scripts/gen-blog.mjs`;
  nav = `data/nav.jsonld`; brand tokens **vendored** (`brand/tokens/build-tokens.mjs`, Style
  Dictionary); NO synoptic/brand npm dep.
- Deploy = hermetic Nix (`nix build .#site`) → Sigstore keyless sign → signed OCI to GHCR →
  cosign-verify → `wrangler deploy` (Cloudflare). Heavy `check` gate suite (axe, a11y-heuristic,
  focus-budget, structure, SEO, semantic, link-graph, SBOM…).

**So the real ship (in `site.git`, its conventions):**
1. **Blog** — add `blog/colors-are-coordinates.md` (gen-blog renders it). Low risk.
2. **Palette page** — new `scripts/gen-palette.mjs` (oklch + axis-name over the vendored
   `brand/tokens`), wired into `build.mjs`, + a `data/nav.jsonld` entry. Must pass `npm run check`.
3. Branch → PR → CI (all gates green) → **gated Nix/Cloudflare deploy (human approves)**.

`robertdelanghe.dev` is a SEPARATE site (`bdelanghe.git` `_site/`, own Nix flake) — trace its
build the same way when its turn comes. The synoptic `render:"palette"`/DTCG work is a
reference implementation; the shipping logic gets re-expressed as a `site.git` gen-* script.

## STATUS (2026-07-06) — blog PR up; color system spec complete

**Blog PR: [bounded-systems/site#170](https://github.com/bounded-systems/site/pull/170)** —
"Colors Are Coordinates" (essay + the "A palette is a Sudoku" section). Content-complete,
2 files (`blog/colors-are-coordinates.md` + `data/audit/catalog.json`), clean off `main`.
Passes gen-blog, check-reader/seo/jargon/emphasis/outline, emit-catalog --check, semantic, axe,
conformance, contracts, site/site. **One gate red — `structure-audit`** (new page → structure.json
stale). Regen needs the Nix toolchain (vendored audit imports `linkedom` + pinned Node; won't
run in a sandbox). TO FINISH, in the site repo's Nix dev shell:
```
npm run build
STRUCTURE_BASELINE=integrity/structure-audit/structure.json node vendor/conformance-kit/integrity/structure-audit/audit.mjs dist
git add integrity/structure-audit/structure.json && git commit
```
Then CI green → merge → gated Nix/Cloudflare deploy.

**Real generator (corrected):** the public bounded.tools site is `bounded-systems/site.git`
(`bounded-tools-site`) — custom `build.mjs` + `scripts/gen-*.mjs`, blog = `blog/*.md`, vendored
`@bounded-systems/brand` (needs `npm install`), deploy = hermetic Nix → Sigstore → OCI → cosign
→ `wrangler` (Cloudflare). NOT synoptic's build-site.mjs (that's the reference impl).

**Color system — COMPLETE spec (in synoptic, pushed):** `spec/color-model.md` (theory) ·
`color-tokens.md` (values = typed objects, CAS-named, no roles) · `color-properties.{md,json}`
(keys = property names; constraint derived from property; tiers) · `constraints.json` (WCAG as
pinned content-addressed objects) · `color-as-constraint.md` (the capstone — constraints as
forces, palette as equilibrium, Sudoku) · `proof/Contrast.lean`. Nothing left to invent.

**Next (implementation, real PRs into mature repos):** brand `tokens.json` → the 31 typed-object
CAS atoms; `css-project` keys declarations by property; baobab reads `constraints.json` by
address; then the `/design/colors` route + DTCG per site (engine done in synoptic v0.19.x,
re-express as a `site.git` gen-* script). robertdelanghe.dev separate (`bdelanghe/_site` + Nix).
