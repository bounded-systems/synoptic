# The lean core — what we actually maintain

A site is **content-in-a-graph + config**. The engine **validates + projects**.
Everything is **content-addressed**. That's the whole system. Everything else is an
optional tool you reach for, not infrastructure you carry.

## Load-bearing (keep, it's cheap)
- **Content-addressing** — digests, the org SHA. Just hashing. Gives pinning + free
  cache invalidation (a changed digest is the only signal you need).
- **One graph surface** — JSON-LD. Content, contracts, facts all normalize to it.
  One shape instead of a dozen bespoke formats.
- **Config-driven sites** — thin site (content + config), one engine (`site-ci.yml`).
- **`validate` + `project`** — the two essential verbs: check the graph, render from it.
- **`proofType`** — a *label* on a claim (axiomatic | grounded | derivable | proven).
  A word, not machinery.

## Signing: axioms only
**Sign only claims with no basis.** Derivable/grounded/proven re-prove themselves —
don't sign them. The one required signature is a human vouching for an **axiom**, at
the authorization gate. Routine check signing is **off** (`sign: false`); the deploy
still attests the whole build once, and that's enough.

## Optional tools (available, not carried)
- `coverage`, `ledger`, `axioms`, `derive`, `merkle` — reach for them for a specific
  job; they don't run unless asked.
- `proof/Proof.lean`, `proof/Merkle.lean` — the constitution, proven once. Don't grow.
- The tezcatl/WebKit browser job — opt-in, off, until it's cheap.
- Per-check / per-fact signing — off; only axioms and the whole-build deploy sign.

## Rule of thumb
Add a tool only when a concrete claim needs a basis it lacks. Prefer **recompute over
sign**, **one graph over many formats**, **config over implementation**, and **fewer
axioms over more**. Weight is added when you sign or gate what already proves itself.
