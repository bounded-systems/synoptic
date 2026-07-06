/-! Claims.lean — the CAS + claim resolution semantics, kernel-verified.

    A claim is an axiom atom, or a derivation over other claims: alias-of,
    derived-from, or composed-of (a Merkle node — a typography style is one).
    The type is a STRUCTURE (a tree), hence acyclic by construction — DTCG's
    "MUST detect circular references" check is exactly what lets a reference
    GRAPH lift into this tree. Proven here:
      • every claim grounds in a NON-EMPTY set of axiom atoms (derivable always
        reduces to axioms — the part DTCG can only state in prose),
      • only axioms carry a signing obligation (sign only claims with no basis),
      • a composite's base is exactly the union of its parts' bases. -/
namespace Claims

abbrev Addr := Nat

inductive Claim
  | ax      (a : Addr)        -- axiom: a raw atom, its own basis (the only signed kind)
  | alias   (of : Claim)      -- alias-of: derivable
  | derive  (from_ : Claim)   -- derived-from: derivable
  | compose (l r : Claim)     -- composed-of: derivable (Merkle node; typography, color, …)

/-- the axiom atoms a claim ultimately rests on. Structural recursion ⇒ total
    ⇒ resolution terminates for every claim (no infinite regress). -/
def base : Claim → List Addr
  | .ax a        => [a]
  | .alias c     => base c
  | .derive c    => base c
  | .compose l r => base l ++ base r

/-- every claim grounds in a NON-EMPTY set of axioms — no claim is baseless. -/
theorem grounds_in_axioms : ∀ c : Claim, (base c).length ≥ 1 := by
  intro c
  induction c with
  | ax a => simp [base]
  | alias c ih => simpa [base] using ih
  | derive c ih => simpa [base] using ih
  | compose l r ihl ihr =>
      simp only [base, List.length_append]
      omega

/-- only axioms carry a signing obligation. -/
def needsSignature : Claim → Bool
  | .ax _ => true
  | _     => false

theorem only_axioms_signed :
    ∀ c : Claim, needsSignature c = true → ∃ a, c = .ax a := by
  intro c h
  cases c with
  | ax a => exact ⟨a, rfl⟩
  | alias _ => simp [needsSignature] at h
  | derive _ => simp [needsSignature] at h
  | compose _ _ => simp [needsSignature] at h

/-- a composite (e.g. a typography style) rests on exactly the union of its parts'
    axioms — no more, no fewer. Composition adds no new trust. -/
theorem compose_base (l r : Claim) : base (.compose l r) = base l ++ base r := rfl

end Claims
