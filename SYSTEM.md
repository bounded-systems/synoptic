# synoptic — the system, in one page

A site is a stack of claims. The engine's job: make every claim carry the strongest
basis it can support, sign only the claims that have no other basis, and keep the
whole thing **self-referential, pinned, derivable, and signed.**

## The ladder (see PROOF.md) and its mechanisms

```
axiomatic   human vouches, no other basis   → authorization gate (Environment + reviewer)   ← the ONLY required signature
grounded    points to a primary source      → token-grounding / a pointer                    basis = the pointer
derivable   recompute it                     → derive (file-count, gh-repo-count, TRELLIS)     basis = the re-run
attested    non-repudiable authorship        → cosign keyless (OIDC → Fulcio → Rekor)          orthogonal; optional on based claims
proven      follows ∀ from axioms            → Lean (kernel-verified; surgical)                basis = the proof term
```

**Sign only claims with no basis.** A required signature = an axiom. Fewer axioms =
less mandatory trust. Everything else proves itself by recomputation, a pointer, or a
proof.

## The engine's verbs

| verb | does | keeps honest |
|---|---|---|
| `validate` | run the layer gates (tokens→jsonld→markdown→website) | the layers |
| `coverage` | data present with no check = a hole; rule with no data = dead | can't omit validation |
| `ledger` | follow pointers to the bottom; report true axioms; flag laundering | can't fake a rung |
| `axioms` | count + digest the true bottom (budget: fewer over time) | the trust surface |
| `derive` | compute facts (cross-repo, from the **signed lattice**) | assertions that could be counted |
| `project` | render a closed subgraph → HTML + SLSA provenance + cacheKey | why a *part* exists |
| `verify` | cosign verify-blob vs the expected identity | the signatures |

## The flow — one fact, end to end

```
signed lattice ──derive──▶ derivable fact ──(only if axiomatic)──▶ authorization gate ─▶ signed
      ▲                          │                                                          │
      │ self-reference           │ nudge on change (repository_dispatch, sign-on-change)    │
      └── the org is a lattice ──┘                                                          ▼
                                             project ──▶ signed HTML fragment ──wire──▶ the page
                                                          (cacheable, provenance at the element)
```

## Self-referential · pinned · derivable · signed

- **Self-referential** — the org derives facts *about itself* from its own signed
  lattice (`derive: trellis`); the engine, the kit, and the sites are (or become)
  nodes in that lattice. The system describes and checks itself.
- **Pinned** — conformance-kit `@v0.12.0`, synoptic `@v0.1.0`, the lattice by digest,
  derived facts by digest, components by `cacheKey`. Content-addressed at every layer.
- **Derivable** — a number you can recompute is not asserted; `derive` recomputes
  (and a stale asserted `58` becomes a live derived `78`).
- **Signed** — only where there's no basis (axioms, at the gate), plus optional
  attestation on based claims for consumers who'd rather not recompute.

## Formally

`proof/Proof.lean` (kernel-verified): `machine_cannot_axiomatize`,
`gate_grounds_axiom`, `no_approval_no_axiom`. Lean wraps the supply-chain proof by
proving properties *about* the trust model — the constitution, checked once.
