/- A light Lean 4 model of the synoptic proof ladder (see ../PROOF.md).
   Formalizes the two claims that matter: only a human can vouch for an axiom, and
   the AUTHORIZATION GATE is how that human signature is obtained. Theorems, not
   prose — Lean wrapping the supply-chain proof by proving properties ABOUT it. -/
namespace Synoptic

/-- Who vouches for a claim. -/
inductive Signer where
  | human (name : String)     -- a person: the only signer that can ground an axiom
  | ci (identity : String)    -- a workflow via OIDC: attests derivations, not truths
deriving DecidableEq, Repr

/-- The rung a claim's evidence reaches. -/
inductive ProofType where
  | axiomatic | grounded | attested | derivable | proven
deriving DecidableEq, Repr

structure Claim where
  subject   : String
  proofType : ProofType
  signer    : Option Signer

/-- The accountability floor: a claim may be axiomatic only if a human signed it. -/
def AxiomHumanSigned (c : Claim) : Prop :=
  c.proofType = ProofType.axiomatic → ∃ name, c.signer = some (Signer.human name)

/-- A CI (machine) signature cannot make a claim axiomatic: a machine attests that a
    computation ran, it cannot take responsibility for a starting truth. -/
theorem machine_cannot_axiomatize
    (c : Claim) (id : String)
    (hsig : c.signer = some (Signer.ci id))
    (hacc : AxiomHumanSigned c) :
    c.proofType ≠ ProofType.axiomatic := by
  intro hax
  obtain ⟨name, hname⟩ := hacc hax
  rw [hsig] at hname
  simp at hname

/-- An authorization gate: a named human reviewer either approves or not. This is a
    GitHub Environment with required reviewers — authority drawn at the door. -/
structure Authorization where
  reviewer : String
  approved : Bool

/-- The gate turns a bare assertion into an axiom, carrying the reviewer's identity
    exactly when they approved. -/
def signViaGate (subject : String) (auth : Authorization) : Claim :=
  { subject := subject, proofType := .axiomatic,
    signer := if auth.approved then some (Signer.human auth.reviewer) else none }

/-- Using the authorization gate ON an axiom discharges the accountability floor:
    a gate-approved axiom is human-signed. This answers "can we use the auth gate on
    the axioms?" — yes, and it is exactly what makes them accountable. -/
theorem gate_grounds_axiom (subject : String) (auth : Authorization)
    (h : auth.approved = true) :
    AxiomHumanSigned (signViaGate subject auth) := by
  intro _; simp [signViaGate, h]

/-- Conversely, an UN-approved gate yields no axiom signer — an unauthorized axiom is
    not accountable, so it must not be treated as axiomatic. -/
theorem no_approval_no_axiom (subject : String) (auth : Authorization)
    (h : auth.approved = false) :
    (signViaGate subject auth).signer = none := by
  simp [signViaGate, h]

end Synoptic
