/-! Contrast.lean — accessible palettes by CONSTRUCTION, kernel-verified (core Lean 4, ℕ).

    Luminance is modelled as ℕ (scaled; WCAG's 0.05 offset is the parameter `off`). WCAG
    contrast of a lighter luminance `t` over a darker `s` is (t+off)/(s+off); it clears a bar
    `r` iff  r·(s+off) ≤ t+off  (cross-multiplied; the denominators are positive).

    A palette puts SURFACES in a dark band (luminance ≤ Smax) and TEXT in a light band
    (luminance ≥ Tmin), leaving the MOAT between them empty. If the moat is wide enough —
      r·(Smax+off) ≤ Tmin+off
    — then EVERY surface/text pair clears `r`. No pair is ever tested: band membership IS the
    proof. This is "the set determines the use" — a color's band is its role, sound by
    construction. The proof is a single monotonicity chain, which is exactly the point:
    validity is structural, not validated after the fact. -/
namespace Contrast

/-- contrast(`t` over `s`) clears bar `r`, in multiplicative form (equivalent to
    (t+off)/(s+off) ≥ r since off ≥ 1 makes the denominators positive). -/
def clears (off r s t : Nat) : Prop := r * (s + off) ≤ t + off

/-- **AAA (or any bar `r`) by construction.** Any surface in the dark band (`s ≤ Smax`) paired
    with any text in the light band (`Tmin ≤ t`) clears `r`, given a wide-enough moat. The
    surface and text are never compared directly — only their bands and the moat. -/
theorem by_construction {off r Smax Tmin s t : Nat}
    (hs : s ≤ Smax)                              -- s is a surface: in the dark band
    (ht : Tmin ≤ t)                              -- t is text: in the light band
    (hmoat : r * (Smax + off) ≤ Tmin + off) :    -- the moat is wide enough
    clears off r s t := by
  unfold clears
  have hmono : r * (s + off) ≤ r * (Smax + off) :=
    Nat.mul_le_mul (Nat.le_refl r) (by omega)
  calc r * (s + off) ≤ r * (Smax + off) := hmono
    _ ≤ Tmin + off := hmoat
    _ ≤ t + off := by omega

/-- **The whole set at once.** Under one moat, EVERY pair drawn from the two bands clears `r`
    — the ∀ is the formal content of "the set determines the use": pick any surface, any text,
    it is already valid. Nothing is checked per-pair. -/
theorem whole_set {off r Smax Tmin : Nat}
    (hmoat : r * (Smax + off) ≤ Tmin + off) :
    ∀ s t, s ≤ Smax → Tmin ≤ t → clears off r s t := by
  intro s t hs ht
  exact by_construction hs ht hmoat

/-- Conversely, the moat is also NECESSARY: if a single pair at the band edges
    (`s = Smax`, `t = Tmin`) clears `r`, the moat condition held. So the band gap is exactly
    the right thing to guarantee — not a sufficient-but-loose sizing. -/
theorem moat_is_tight {off r Smax Tmin : Nat}
    (hedge : clears off r Smax Tmin) :
    r * (Smax + off) ≤ Tmin + off := hedge

end Contrast
