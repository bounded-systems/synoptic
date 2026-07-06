# Namespaces — the semantic frame for a name

A **namespace** is to a *name* what a *color space* is to a *color*: the frame that makes
it unambiguous. `root` means nothing until a namespace says *whose* `root`; `--color-ink`
collides until a prefix says *whose* ink. Same shape as: `colorSpace : color`,
`cascade-stage : value`, `namespace : name` — the frame gives the data meaning.

Grounded in the namespace mechanisms (one idea, many surfaces):

| Surface | Mechanism | Spec · status |
|---|---|---|
| XML (our sitemap ext) | `xmlns:prefix="URI"` | **XML Namespaces 1.0** · REC — w3.org/TR/xml-names/ |
| CSS selectors | `@namespace prefix url(URI)` | **CSS Namespaces 3** · CR — w3.org/TR/css-namespaces/ |
| JSON-LD / RDF | `@context` (term → IRI) | **JSON-LD 1.1** · REC — w3.org/TR/json-ld11/ |
| CSS custom properties | `--prefix-*` (convention, not formal) | **CSS Variables 1** · CR — w3.org/TR/css-variables-1/ |
| identifiers | absolute URI | **RFC 3986** — datatracker.ietf.org/doc/html/rfc3986 |

## Our namespace registry (the `@context` of our vocabulary)

| Prefix | URI | Defines | Ground |
|---|---|---|---|
| `synoptic` | https://bounded.tools/schemas/synoptic/1.0 | sitemap ext (`root`), our vocab | XML Namespaces + `synoptic-sitemap.xsd` |
| `schema` | https://schema.org/ | graph node types | JSON-LD `@context` |
| `intoto` | https://in-toto.io/Statement/v1 | attestations | in-toto |
| `spdx` | https://spdx.dev/ | the claims SBOM | SPDX 2.3 |
| `claim` | https://bounded.tools/synoptic/claim/1.0 | predicates (`is-a`, `alias-of`, `derived-from`, …) | **TODO: give the predicate vocab a URI** |
| `--bs-` | (prefix) https://bounded.tools/tokens/ | design tokens | CSS Variables convention |

## Consequence for the tokens (from the live audit)

bounded.tools mixes **namespaced** tokens (`--bs-color-paper`, `--bs-font-display`,
`--bs-space-4`) with **bare** ones (`--color-ink`, `--site-dark`). The bare ones live in
the global custom-property namespace and *collide* — the audit found `--site-dark` and
`--color-ink` are the same canonical `oklch` under two un-namespaced names. **Fix:
namespace every token (`--bs-*`)**, so a token's name carries its frame — no collisions,
one canonical color per name.

## Rule

Every term we mint (claim predicate, token, extension element, schema $id) gets a
**namespace URI**, so names never collide across vocabularies and each term resolves to
its authority — the naming discipline that matches the grounding discipline.
