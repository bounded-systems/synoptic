# Grounding — every capability tied to its formal spec

Principle: **we don't assert formats or math, we ground them.** Each row cites the
authoritative spec (dated) it implements; where a machine schema exists we validate
against it. Spec-grounded work is `grounded` (basis: the spec), never `axiomatic`.

| Synoptic capability | Formal spec (dated) | URL | What we implement / validate |
|---|---|---|---|
| `canonicalize` colors | **CSS Color 4** (WD 2026-05) | w3.org/TR/css-color-4/ | oklch canonical form, lab/lch/oklab, display-p3 (§10.4), rgb/hsl/hex |
| color input syntaxes | **CSS Color 4** §6, §5 | w3.org/TR/css-color-4/ | 148 named colors, 19 `<system-color>` keywords |
| relative / mix (future) | **CSS Color 5** (WD 2026-05) | w3.org/TR/css-color-5/ | color-mix(), relative color |
| `canonicalize` lengths | **CSS Values 3/4** | w3.org/TR/css-values-3/ · css-values-4/ | canonical unit (rem), `<dimension>`, `<number>`, `<percentage>` |
| `value-stages.md` | **CSS Cascade 5** + **CSSOM** | w3.org/TR/css-cascade-5/ · cssom-1/ | declared→specified→computed→used→resolved (a derivation chain) |
| `spec/value/*.schema.json` | **DTCG** (2025.10) | designtokens.org/tr/2025.10/format/ | typed value tokens (color, dimension, number, fontFamily, …) |
| `contrast` | **WCAG 2.1** (REC) | w3.org/TR/WCAG21/ | AA/AAA contrast ratios, large-text thresholds |
| `sitemap.{json,xml}` | **sitemaps.org 0.9** + `sitemap.xsd` | sitemaps.org/protocol.html | urlset, strict-sort priority; xml VALIDATES vs the official XSD |
| sitemap `synoptic:` ext | **sitemaps.org** namespace extension | sitemaps.org/protocol.html#extending | `<synoptic:root>` (page Merkle root); declared in `synoptic-sitemap.xsd` |
| `robots.txt` | **robotstxt.org** | robotstxt.org | User-agent + Sitemap directive |
| `spec/claim.schema.json` | **in-toto**/**SLSA** + **W3C VC** | slsa.dev · w3.org/TR/vc-data-model/ | attestations / claims with proof + signer |
| `proof/*.lean` | **Lean 4** kernel | leanprover | kernel-verified reduction/merkle theorems |
| signing | **Sigstore** (Fulcio/Rekor/OIDC) | sigstore.dev | keyless axiom signatures |
| `graph` / `/json.ld` | **JSON-LD 1.1** + **schema.org** | w3.org/TR/json-ld11/ · schema.org | the normalized linked graph |
| `sbom` | **SPDX 2.3** | spdx.dev | the claims SBOM |

Search order for new work: https://www.w3.org/Style/CSS/specs.en.html (CSS index),
W3C TR, IETF RFCs, ISO. Pin a **dated** version; undated URLs move.
