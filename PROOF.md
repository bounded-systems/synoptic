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
| `asserted` | a sentence | nothing (trust the claimant) | the claimant |
| `grounded` | a citation / trace | a *pointer* to a primary source | the source + the link |
| `attested` | a signature (cosign/Rekor) | **who** signed & **when**, non-repudiably — authorship, not truth | Fulcio + Rekor + the identity |
| `derivable` | a re-runnable check / digest | the **computation reproduces** this output | the checker + runtime |
| `proven` | a proof **term** `t : P` | the **proposition holds, ∀**, from axioms | the kernel + the axioms |

`attested` is **orthogonal**: signing a check adds it on top of whatever the check's
own `proofType` is. A signed `claim-discipline` verdict is `derivable` **and**
`attested` — reproducible *and* non-repudiably ours. It is not `proven` that the
copy is good; the gate is a proxy and says so.

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
