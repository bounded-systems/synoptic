# Proof types — what a check actually establishes

Every signed check attestation carries a `proofType`: the rung of the proof ladder
its verdict actually reaches. Being explicit stops a *signature* from being mistaken
for *truth*. The ladder has two axes, not one.

## The axes

- **Empirical** (about the world; defeasible): asserted → grounded → attested →
  derivable. Each shrinks *who you must trust*, none reaches certainty.
- **Deductive** (inside a formal system; certain given axioms): proven. A different
  universe — Lean-style proof. Signing can't get you here; a proof term can't tell
  you a server ran.

## `proofType` values

| value | proof object | establishes | trusted base |
|---|---|---|---|
| `axiomatic` | a **human-signed** assertion | a *starting truth* everything else derives from — accountable to a named person | **the human who signed it** |
| `grounded` | a citation / trace | a *pointer* to an axiom (primary source) | the axiom + the link |
| `attested` | a signature (cosign/Rekor) | **who** signed a *derivation* & **when**, non-repudiably — authorship, not truth | Fulcio + Rekor + the identity |
| `derivable` | a re-runnable check / digest | the **computation reproduces** this output | the checker + runtime |
| `proven` | a proof **term** `t : P` | the **proposition holds, ∀**, from axioms | the kernel + the axioms |

### Axioms are the leaves, and only a human signs them

`axiomatic` is the **foundation**, not the weakest scrap. Every proof bottoms out in
axioms — unproven starting points. The question is never "can we avoid axioms?" but
"**whose** axioms, and are they **owned?**" So the rule:

> **A machine attests a *derivation*; only a human vouches for an *axiom*.**

CI keyless signing (OIDC → Rekor) proves *a computation ran* — it cannot take
responsibility for a *starting truth*. That needs a person's signature. The string
proof atoms (`grounding.json`) are exactly this: a named human asserts "these figures
are true" and signs it; the whole grounded chain derives from that. An **unsigned**
axiom is a floating assumption (worthless); a **human-signed** axiom is accountable —
you know whose neck is on the line.

So signing appears at *both* ends, and they are not the same act:
- **human signs an axiom** → responsibility for a truth (the floor; the buck stops here).
- **identity attests a derivation** → the computation happened (`attested`, above).

`attested` remains **orthogonal**: CI signing adds it on top of a check's own
`proofType`. A signed `claim-discipline` verdict is `derivable` **and** `attested` —
reproducible *and* non-repudiably ours. It is not `proven` the copy is good (the gate
is a proxy), and it is not `axiomatic` — no human vouched, a machine ran a heuristic.

## Honest reading of our checks

- **prose proxies** (`claim-discipline`, `grammar-repetition`, `doc-scope`) →
  `derivable`. Pure functions of a content-addressed corpus: re-run ⇒ same verdict.
  They *proxy* a property; reproducibility is real, the property is estimated.
- **`token-grounding`** → `grounded`. Its job *is* the trace: a figure-claim resolves
  to a proof atom. It establishes grounding for this input, decidably.
- **`shacl`, schema (Zod)** → `derivable` (decidable conformance *for this input*).
  Stronger than a proxy — it *decides* — but instance-scoped, not ∀.
- **`proven`** is reserved. TS `strict`, Zod, `strict:true` outputs prove *well-typedness*
  (a narrow decidable proposition) by Curry–Howard — the shallow end of Lean's pool.
  A real `proven` check would establish a *property* (∀), e.g. "assemble can never
  yield a cyclic lattice" — a proof assistant's job, not a gate's.

## The Lean parallel

Lean is Curry–Howard: propositions *are* types, proofs *are* terms, proof-checking
*is* type-checking — so a Lean proof is `derivable` (re-run the kernel) **and**
`proven` (the term's type *is* the proposition). And `#print axioms foo` enumerates
a proof's axioms — its trusted base, made auditable — which is exactly SLSA
`resolvedDependencies` / an attestation's `subject` digests, one abstraction up.

Formal proof and supply-chain proof are **orthogonal and complementary**: Lean proves
*a proposition follows from axioms*; cosign/SLSA proves *this artifact came from that
process*. A verified spec built by an unattested pipeline is unaccountable; a
perfectly-attested build of unproven logic is faithfully-delivered maybe-garbage.
The chain wants both: **prove the spec → attest the build → derive the artifact.**
