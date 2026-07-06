# Plan — A CAS, and Claims Placed On It

The thing being built is **not** a design-token registry. It's a **content-addressed
atom store (CAS)** with a **claim layer** on top — closest in spirit to Perkeep (blobs +
signed claims), but with a **proof ladder** on the claims that Perkeep lacks. Tokens and
strings are just atoms; everything else — type, role, alias, set membership, provenance,
composition — is a *claim about an address*.

## Two primitives, nothing else

```
Atom   = immutable content-addressed bytes.        address = sha256(bytes).
         A string ("content store"), a token value ("#0C5A42"), a blob. This is /cas.

Claim  = a typed assertion ABOUT an address:
         { subject: <address>,           # the atom (or claim) it speaks about
           predicate,                    # is-a | role | alias-of | member-of | derived-from | …
           object,                       # an address, a literal, or another claim
           proofType,                    # axiom | grounded | derivable | proven
           signer? }                     # present ONLY for axioms
         A claim is itself serialized → hashed → an atom. So claims are addressable,
         and claims can be made about claims.
```

That's it. The CAS holds atoms; claims are the only way anything is said about them.

## Everything you already built is this

| Today | Is really |
|---|---|
| a string/token leaf in `/cas` | an **atom** |
| "this atom is a color token, role fg" | a **claim** (`is-a`, `role`), proofType axiom |
| `--space-8 = --space-4 × 2` | a **claim** (`derived-from`), proofType derivable |
| a node = Merkle of its string leaves | a **claim** (`composed-of`), derivable |
| `data-cas` on an element | the element **cites** an atom's address |
| an in-toto attestation | a **signed claim** about an address |
| the proof ladder (PROOF.md) | the **proofType** on every claim |
| "sign only claims with no basis" | **sign only axiom claims** |

Nothing new to invent — this is the substrate the whole site already rides on, named
properly and made first-class.

## DTCG is a proto-claim format (and becomes one view)

The W3C DTCG format is already "a value plus typed assertions" — it just names atoms by
*path* instead of *address*, and has no proof types. It maps onto the two primitives
almost perfectly, which is the sanity check that the model is right:

| DTCG | CAS + claims |
|---|---|
| `$value` (literal, e.g. `"#0C5A42"`) | an **atom** (the bytes; address = its hash). proofType **axiom** |
| `$value` alias `{color.blue}` / `$ref` | a **claim** `alias-of <address>`. proofType **derivable** |
| `$type: color` | a **claim** `is-a color`. (DTCG: MUST be declared, never inferred — same as us) |
| `$description`, `$deprecated`, `$extensions` | **claims** (metadata / vendor). |
| group `$type` inheritance | a **derivable** typing claim (type from parent/reference) |
| composite (`typography`, `shadow`) | an atom **composed-of** sub-atom claims (a Merkle node) |
| `$ref` JSON-Pointer into `…/components/0` | addressing a **sub-atom** of a composite (a leaf of that Merkle node) |
| circular alias = error | a claim cycle = invalid (same rule) |

So **DTCG export = `project(claims where is-a token)`**: path-name the token atoms, emit
`$value`/`$type`, resolve `alias-of` claims to `{refs}`. Being DTCG-conformant is one
*view* of the store, not the store's shape. Two rules we adopt straight from DTCG:
**type is always declared, never guessed** (a typing claim, so it's an axiom or derived —
never inferred from bytes), and **aliases resolve through chains to an explicit atom**
(exactly `derivable` reduction to an axiom).

## The proof ladder *is* the claim discipline

A claim carries how it's justified, and only the bottom needs trust:
- **axiom** — a raw atom's declaration ("this address's bytes *are* the value", or a
  human asserting a fact with no other basis). The **only** claims that are signed.
- **grounded** — points at a primary source address.
- **derivable** — recompute from other atoms/claims (aliases, calculations, Merkle
  composition). Carries its own basis; never signed.
- **proven** — a machine-checked term (Lean).

Goal restated in these terms: **minimize axiom claims; derive everything else.** Fewer
axioms = smaller trusted base. "Declare all leaves" was the shadow of this — the real
target is *declare the axiom atoms, and let every other claim derive.*

## Why CAS-first (vs a token registry)

- **One store, many views.** DTCG tokens, the JSON-LD graph, the SBOM, the rendered
  page — each is a *projection of a claim subset*, not a separate source. "Export DTCG" =
  "project claims where type=token." No format is primary.
- **Claims about claims.** Provenance, review, signing are just claims whose subject is
  another claim — so the audit trail is in the same store, addressable, not a side log.
- **Accretion, not mutation.** Like Datomic/Perkeep: you never edit an atom (it's its
  hash); you add a claim that supersedes. History is the claim set over time.
- **The proof ladder is orthogonal to the value** — you can strengthen a claim (axiom →
  grounded → proven) without touching the atom it's about.

## Phases

### Phase 1 — Name the primitives (make CAS + Claim first-class)
Today `/cas` exists and claims are implicit (in attestations, `data-cas`, the graph).
Phase 1 is a small library — working name **`herbarium`** or **`ledger`** — with exactly
two types (`Atom`, `Claim`), a `put(bytes) → address`, a `claim(subject, pred, obj,
proofType) → address`, and a `resolve(address)`. No new storage: atoms are `/cas` files,
claims are `/cas` files whose content is a claim. Pure, testable, additive.

### Phase 2 — Lift what exists into claims (no behavior change)
Rewrite the graph/build provenance to *emit claims* instead of bespoke JSON: typing,
role, alias, composed-of, derived-from. Round-trip check: same rendered output, same
digests — only the provenance is now a uniform claim set.

### Phase 3 — Claim-first authoring (de-inline)
Content stops holding inline values; it holds atom addresses + claims. Adding a package
= put its strings as atoms + a few claims (`is-a package`, `role name/description`,
`builds-on <addr>`). The migration, gated behind Phase 2's round-trip.

### Phase 4 — Views are projections of claim subsets
`graph` (JSON-LD), `sbom`, `build-site` (HTML/MD), and a **DTCG export** all become
`project(claims where …)`. Prove: the DTCG view of the token claims validates against the
W3C DTCG spec; the page view carries `data-cas` to the same atoms.

### Phase 5 — Claims about claims (provenance, review, signing)
Signing an axiom = a claim whose subject is the axiom claim. Review/approval = a claim.
The `/provenance` and `/leaves` pages project the claim graph. `verify` walks claims to
the axioms (the existing `ledger`, now general).

### Phase 6 — Enforce (the discipline as a gate)
- Every rendered atom is cited by a claim (no uncited atoms ship).
- Every non-axiom claim recomputes (derivable actually derives).
- Axiom count has a budget (fewer axioms over time) — the `axioms` verb, generalized.

## Deliverables

- `herbarium`/`ledger` — the two-primitive library (`Atom`, `Claim`, put/claim/resolve/
  verify), over `/cas`.
- Graph/build emit claims (Phase 2); content authored as atoms+claims (Phase 3).
- View projectors incl. **W3C DTCG export** for token-typed claims (Phase 4).
- Claim-graph pages `/provenance`, `/leaves` (Phase 5).
- `claim-coverage` + `axiom-budget` gates (Phase 6).

## Verification

- **Round-trip**: lift to claims → project → byte-identical output.
- **Everything derives but the axioms**: `verify` reduces every claim to axiom atoms;
  the axiom set is small and shrinking.
- **Claims about claims resolve**: a signature claim's subject is the axiom it signs.
- **DTCG conformance**: the token-claim projection validates against the DTCG spec.
- **Perkeep sanity check**: an atom + a claim about it behave like a Perkeep blob +
  claim (immutable atom, accreted claim), minus a server.

## Explicitly deferred

- A visual claim/atom browser (CLI + projected pages first).
- External CAS backends (Dolt/vault/IPFS as the atom store) — the interface is
  `put/resolve`, so a backend swaps in later; in-repo `/cas` first.
- Distributed/multi-writer claim merge (single-writer + git first).

## The one-line version

**A CAS holds the atoms; claims — carrying a proof ladder — say everything about them;
every artifact (page, graph, SBOM, DTCG tokens) is a projection of a claim subset; and
only the axioms are signed.** That's the whole system, and it's Perkeep with proofs.
