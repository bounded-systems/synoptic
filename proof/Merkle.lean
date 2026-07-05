/- The org SHA formalized: a Merkle commitment, and why it cannot be stored in the
   org that it commits to (the fixed point you named). Kernel-checked. -/
namespace Synoptic.Merkle

/-- A hash (grounded in Nat so the function space is inhabited; we reason only from
    the injectivity axiom below, never from Nat's structure). -/
abbrev Hash := Nat

/-- The Merkle root of a leaf list (each leaf a repo's git root). Opaque. -/
opaque merkleRoot : List Hash → Hash

/-- Collision-resistance, as an AXIOM — the single trusted base (cf. #print axioms /
    SLSA resolvedDependencies). Everything below rests only on this. -/
axiom merkle_injective : Function.Injective merkleRoot

/-- Commitment soundness: equal roots ⇒ equal state. The org SHA uniquely determines
    the org, given the hash axiom — so one root comparison validates the whole org. -/
theorem root_commits {a b : List Hash} (h : merkleRoot a = merkleRoot b) : a = b :=
  merkle_injective h

/-- Appending a leaf changes the root (different state ⇒ different commitment). -/
theorem append_moves_root (st : List Hash) (x : Hash) :
    merkleRoot (st ++ [x]) ≠ merkleRoot st := by
  intro h
  have he : st ++ [x] = st := merkle_injective h
  have hlen := congrArg List.length he
  simp only [List.length_append, List.length_cons, List.length_nil] at hlen
  omega

/-- THE FIXED POINT: you cannot hold the org root inside the org. Storing a value is
    appending a leaf that carries it; but then the stored value (= the old root) no
    longer equals the new root. No stored root is stable — hold the deriving function,
    attest the value externally. -/
theorem no_stored_root (st : List Hash) (leafOf : Hash → Hash) (v : Hash)
    (stored : v = merkleRoot st)
    (written : merkleRoot (st ++ [leafOf v]) = v) :
    False := by
  rw [stored] at written
  exact append_moves_root st (leafOf (merkleRoot st)) written

end Synoptic.Merkle
