# Plan — Declare All Leaves

## Goal

Every atom the sites are made of — each **content string** and each **design token** —
is **declared once**: an explicit, typed, content-addressed leaf in a single registry.
Nothing is authored inline; everything above a leaf (node → section → page → site) is a
Merkle composition of declared leaves. Supernova's model (one source of truth for design
tokens, referenced everywhere, documented, versioned) — generalized to **all** leaves,
content included.

Today leaves are *extracted* during projection (from `strings.json`, the registry, the
palette). The goal is to *declare* them: a leaf isn't a side effect of a build, it's a
first-class, addressed, reusable, provable unit.

## Why (what declaring buys us)

- **Leaf-sized change** (already proven in v0.9.5) becomes leaf-sized *authoring*: you
  edit a declared leaf, not a buried field.
- **One source of truth per atom.** Same string used in three places → one leaf, one
  address, one edit. Dedup is automatic (content-addressed).
- **Provability to the atom.** Every rendered string/token traces to a declared leaf;
  `verify-artifact` already checks the file, declaration adds "and it was *meant* to
  exist."
- **Management, Supernova-style.** A leaf browser, usage (where is this leaf used?),
  coverage (rendered but undeclared → fail), orphans (declared but unused → warn),
  versioning (a leaf's history is its digest chain).
- **Cross-site reuse + bridge.** A declared leaf can be shared between bounded.tools and
  bdelanghe (a shared token, a shared phrase) — the bridge at the leaf level.

## Name (pick one)

Botanical, matching `trellis` / `baobab`:
- **`herbarium`** *(recommended)* — a curated collection of pressed, **labeled leaf
  specimens**, each catalogued with an address. Exactly the thing: declared leaves.
- **`canopy`** — the totality of a tree's leaves.
- **`prism`** — one input split into its declared spectrum (less botanical).

## The leaf model

```
Leaf = { id, type, role?, value, address }
  type:   "token" | "string"
  role:   token → color|space|type|radius|… ; string → name|description|prose|label|…
  value:  the atom itself ("content store", "#0C5A42", "16px")
  address: sha256(value)  — the content address, the /cas key
```

- **Declaration** lives in the registry (below), not in `strings.json`/`registry.json`.
- **Reference**: a node/content field holds a leaf `id` (or address), never an inline
  value. Resolution replaces the ref with the declared leaf at compose time.
- **Composition** is unchanged from v0.9.5: node = Merkle(its leaf refs), section =
  Merkle(nodes), page = Merkle(sections), site = Merkle(pages).

## Phases

### Phase 1 — Inventory (extract → declare)
A `synoptic leaves inventory` verb that walks the current sites' evidence + the built
projection and emits the **initial declared set**: every distinct string and token, typed,
addressed, deduped. This is the bootstrap — it turns today's extracted leaves into
declared ones without hand-authoring. Output: `leaves/manifest.json` per site.

### Phase 2 — The registry (the core)
The declared manifest is the source of truth. Schema-validated (Zod), each leaf typed +
role-tagged. Dedup by address. Two scopes, like the bridge:
- **shared** — leaves used by both sites (org tokens, shared phrases).
- **site** — leaves local to one site.
`synoptic leaves` verbs: `list`, `show <id>`, `add`, `where <address>` (usage).

### Phase 3 — Reference model (de-inline)
Migrate content to reference leaves by id instead of inlining values. `strings.json`
`{$value}` becomes `{$leaf: "<id>"}`; registry taglines become leaf refs. A codemod does
the bulk; the graph plugins resolve refs → declared leaves at parse time. After this,
**no atom is authored in two places.**

### Phase 4 — Compose & project from declarations
`graph` + `build-site` consume declared leaves (they already Merkle-compose; the change
is that leaves come from the registry, resolved, not extracted). Every rendered
`data-cas` is a *declared* leaf's address. `/cas` becomes the declared leaf store.

### Phase 5 — Manage (Supernova surface)
A projected `/leaves` page (itself graph-projected, dogfooding): browse every declared
leaf, its value, type, address, and **usage** (which pages/nodes reference it). Plus
`synoptic leaves diff <a> <b>` (what leaves changed between two site roots — the
leaf-level changelog).

### Phase 6 — Enforce (the gate)
A conformance gate, both directions:
- **Coverage**: every rendered atom resolves to a *declared* leaf → else FAIL (no
  undeclared leaves shipping).
- **Orphans**: every declared leaf is referenced somewhere → else WARN (dead leaves).
This is the "data and validation stay separate" rule at the leaf level — you can't ship
an undeclared atom, and you can't hide a declaration that proves nothing.

## Deliverables

- `herbarium` (or chosen name) — the registry package: schema + `leaves/manifest.json` +
  the `synoptic leaves` verbs (inventory·list·show·where·diff).
- `graph`/`build-site` resolve leaf refs (Phase 4).
- `/leaves` projected management page (Phase 5).
- `leaf-coverage` gate (Phase 6).
- Migration codemod (`{$value}` → `{$leaf}`), run on both sites (Phase 3).

## Verification

- **Round-trip**: inventory a site → declare → re-project → byte-identical output
  (declaration changed nothing but the source of truth).
- **Dedup**: a string used N times has exactly one leaf/address.
- **Leaf-sized authoring**: editing one declared leaf moves exactly that leaf + its roots
  (the v0.9.5 property, now at the *authoring* layer).
- **Gate bites**: a rendered atom with no declaration fails coverage; an unused
  declaration warns as an orphan.
- **Bridge**: a shared leaf resolves identically on both sites (one address).

## Explicitly deferred

- A visual/WYSIWYG leaf editor (the registry is JSON + CLI first; a UI is later).
- Localization (a leaf → per-locale values) — the model allows it (`value` becomes a
  map) but it's not in scope now.
- Auto-suggesting leaf roles via NLP — roles are declared, not inferred, for now.
- Pulling leaves from external stores (Dolt/vault) — the registry is in-repo first; the
  content-external move is a separate initiative that plugs in at Phase 2.

## Sequencing note

Phases 1–2 are additive and safe (inventory + registry, nothing changes downstream).
Phase 3 (de-inline) is the one migration with churn — do it per site, behind the
round-trip check. Phases 4–6 are incremental once the registry exists. Nothing here is
big-bang: after v0.9.5 every step is leaf-sized, including this.
