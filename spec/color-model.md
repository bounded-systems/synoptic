# The perceptual color model

How synoptic represents, canonicalizes, and derives color. A color is a point in **OKLCh** —
`(L, C, H, α)` — and everything below follows from three facts: perception is **quantized**
(a just-noticeable-difference on every axis), **constrained** (gamut caps chroma, contrast
carves lightness), and **free in hue** (hue costs nothing). The registry of specs each claim
grounds in is `GROUNDING.md`; this doc is the theory those specs assemble into.

---

## 1. The axes

| axis | meaning (human) | range · CSS scaling |
|---|---|---|
| **L** | how *light* — the black-and-white-photo axis; survives dim light & color-blindness | 0 (black) → 100% (white); perceptually uniform |
| **C** | how *colorful* vs gray | 0 (gray) → ~0.4; CSS `100% = 0.4` |
| **H** | *which* color (angle on the wheel) | 0–360°; free of every constraint |
| **α** | opacity | 0 (invisible) → 1 |

**Why OKLCh** (Ottosson 2020; CSS Color 4 §9.2): perceptual uniformity (equal steps look
equal), stable hue under L/C change (no CIELAB blue→purple drift), and gamut-independence
(can express wide-gamut colors sRGB can't). `L` is perceived lightness — so it maps directly
to contrast reasoning; `ΔEOK` is a real perceptual distance — so it powers dedup.

---

## 2. Perceptual distance (JND) — the resolution of the space

Every axis has a **just-noticeable-difference**: below it two values are the *same*
perception; above it, distinct. This is why canonicalization is principled, not arbitrary.

| axis | JND | note |
|---|---|---|
| overall color | **ΔEOK ≈ 0.02** | ≈ CIEDE2000 ΔE 1–2 ("just visible") |
| L | ~1–2% | uniform, absolute |
| C | ~0.01–0.02 | absolute-ish |
| **H** | **≈ ΔEOK / C rad** = `0.02/C · 57.3°` | **scales with chroma** — the trap |

Hue is the subtle one: `perceptual hue distance ≈ C · Δh`. At low chroma the hue JND explodes
(C 0.13 → 9°; C 0.05 → 23°; C 0.02 → 57°), so a near-gray can drift almost any hue unseen.

**Consequences.** (1) Sub-JND differences collapse to one atom — float noise, rounding,
invisible tints all reduce to one content-address; a value is *real* only ≥ 1 JND from its
neighbors. (2) The atom set is finite and small — perception quantizes the space; the atoms
are its quanta. (3) Task rules impose distances *larger* than the JND, and that makes
structure (§5).

---

## 3. Canonicalization & the degenerate points

Canonical form: rgb/hex/hsl/named/p3 all normalize to **one** `oklch(L% C H / α)`, so equal
colors dedupe regardless of syntax. Some regions **degenerate** — an axis stops carrying
information, and storing it is phantom precision:

| where | what's lost | canonical result |
|---|---|---|
| **α = 0** | *everything* — invisible; premultiplied interpolation zeroes the channels (Color 4 §12.3) | **one** `oklch(0% 0 0 / 0)` — the compositing identity |
| **C = 0** | **H** — hue is *powerless* (Color 4 §12.4) | one gray per (L, α) |
| **L = 0 / 100** | H, and C→0 in-gamut | black / white |

Full transparency is *valid but singular*: there is exactly one "nothing." `canonicalize`
collapses all three.

---

## 4. Derivation — one axis at a time, multiplication only

A color family is **one axiom + ratios**. Fix the hue (the axiom — a hue can't be reached by
scaling, so it's *chosen*), then derive by moving **one axis at a time**, **multiplication
only** (`channel' = k · channel` — a pure ratio; ratios are perceptual (Weber–Fechner),
compose, and invert).

**Every derivation is a per-axis affine map** on (L, C, H, α):

| derivation | L | C | H | α |
|---|---|---|---|---|
| tint | ×k +o | ×k | — | — |
| shade | ×k | ×k | — | — |
| fade | — | — | — | ×k |
| L-step | +o | — | — | — |
| hue-rotate | — | — | +o | — |

- **`color-mix(A, B, t)` = the *same* `t` on every axis** (coupled, one knob) — moves along a
  straight line toward `B` and can *never hold* an axis. That coupling is why it drags chroma
  when it lifts lightness.
- **relative-color `oklch(from A …)` = `(k, o)` per axis** (four knobs, incl. identity = hold).
  So `color-mix` is the **diagonal slice** of the full per-axis affine group; relative-color
  *is* the group.

**The percentage form.** Because scaling only goes *down*, the base is each axis's **max**,
and every color is a percentage of it — which is exactly `oklch(H, L%, C%, α%)`:
`L%` mixes in black, `C%` mixes in gray (100% = the **gamut ceiling** at this L,H), `α%` mixes
in transparent. A whole hue-family is one hue + a table of `(L%, C%, α%)` triples.

---

## 5. Contrast & lightness bands

Contrast is a **ratio** on luminance (WCAG), so it's a *minimum spacing* on L. From a fixed
floor (black), the number of mutually-contrasting bands is **logarithmic** in the bar:

```
N_max = floor( 1 + log(21) / log(R) )     R = required ratio;  21:1 = white-on-black (max)
```

| R | bands | | R | bands |
|---|---|---|---|---|
| 1.5:1 | 8 | | 4.5:1 (AA) | 3 |
| 2:1 | 5 | | **7:1 (AAA)** | **2** |
| 3:1 | 3 | | 21:1 | 2 |

So **L bands are unavoidable at any bar** (≥ 2: fg vs bg), and the moat width = the bar.
Colors cluster into a dark band (surfaces) + light band (text) with a forbidden middle.

**AAA mutes color** (a gamut consequence): WCAG constrains only L, but the sRGB chroma
ceiling is a *lens* — pinched at the extremes (L24 Cmax 0.16, L90 Cmax 0.24), fattest in the
**forbidden** middle (L50–67 Cmax ~0.30). AAA banishes surfaces to the low-chroma dark end
and forbids the vivid mid, so **AAA palettes are inherently muted, dark surfaces most.** The
trilogy: **L = accessibility budget · C = gamut-capped at the L you're forced to · H = free.**

---

## 6. Hues — chroma-weighted

Any palette factors into **(resolvable hues) + neutrals + a per-hue `(L%, C%, α%)` lattice**.
The hue count is **chroma-weighted** — a hue only counts where chroma resolves it (§2), so
low-chroma colors never add hues. "How many hues" is a *design choice*, revealed by the count;
low counts are common (restraint + AAA-mutes-color + JND collapse) but not forced.

- bounded.tools: 19 raw hue values → **2** perceptually-distinct (a warm ~80°, a cool ~165°) + neutrals.

---

## 7. Validation — the 148 CSS named colors

Converting the full CSS Color 4 `<named-color>` set to OKLCh confirms the model on an
external, authoritative palette:

- **148 names → 49 hues + 23 neutrals**; **31 hues shared by 2+ names.** Most named colors are
  the *same hue at different (L%, C%)* — green ~144° holds 9 names, magenta ~328° holds 8,
  cyan ~196° holds 9. `maroon` **is** `red` at low L%; `dark/light/medium/pale` prefixes encode
  lightness & chroma percentages in English.
- **Audit vs our rules:** gamut — **0 violations** (sRGB by construction, impossible to break).
  But 10 *dishonest hues* (`aliceblue`, `azure`, `snow`… name a sub-JND tint), 9 *exact-
  duplicate* pairs (`aqua=cyan`, `fuchsia=magenta`, 7 `gray/grey`), 46 *near-duplicate* pairs
  (`snow≈white`, `chartreuse≈lawngreen`). The engine catches all: dupes → one atom, near-dupes
  → merge flags, powerless → flag + `--fix`. A legacy convenience list, not a designed system.

---

## References

- **OKLab/OKLCh** — Ottosson (2020) https://bottosson.github.io/posts/oklab/ · CSS Color 4 §9.2 https://www.w3.org/TR/css-color-4/#ok-lab
- **CIEDE2000 ΔE** — Sharma, Wu, Dalal (2005) http://www2.ece.rochester.edu/~gsharma/ciede2000/ · CIE 15:2004
- **Weber–Fechner** — Fechner, *Elemente der Psychophysik* (1860)
- **Stevens' power law** — Stevens (1957), Psychol. Rev. 64(3):153–181, doi:10.1037/h0046162
- **Premultiplied alpha / powerless** — CSS Color 4 §12.3 / §12.4 https://www.w3.org/TR/css-color-4/#powerless
- **Named colors** — CSS Color 4 §6.1 https://www.w3.org/TR/css-color-4/#named-colors
- **Contrast** — WCAG 2.2 https://www.w3.org/TR/WCAG22/ · APCA (WCAG 3) https://www.w3.org/TR/wcag-3.0/
- **color-mix / relative color** — CSS Color 5 https://www.w3.org/TR/css-color-5/

*Tools: `canonicalize` · `color-review` (ΔEOK near-dupes) · `color-health` (gamut, powerless, `--fix`) · `derive-palette` (axioms + derivations) · `color-pipeline` (H→L→C→α, multiply-only) · `contrast` (WCAG).*

## 8. Are the axes — and positions on them — formally named?

**The axes: yes.** `L` = **Lightness**, `C` = **Chroma**, `h` = **hue**, `α` = alpha — formal
terms in CSS Color 4 §9.2 (Oklab/OkLCh) and OKLab itself.

**Positions on the axes — depends where you look:**

- **Hue cardinals are named *in OKLab's own construction.*** The `a`/`b` opponent axes are the
  four **unique hues** (Hering's opponent-process, the formal basis): `+a` red, `−a` green,
  `+b` yellow, `−b` blue. So the hue angle's cardinals aren't arbitrary — ~30° red, ~110°
  yellow, ~150° green, ~260° blue. But **CSS names no hue *ranges*** — `<hue>` is a bare
  `<angle>`, and the 148 named colors are *points*, not ranges.
- **Full systematic per-axis naming lives outside CSS:**
  - **Munsell** (ASTM D1535): Hue = 10 families (`R YR Y GY G BG B PB P RP`), Value = lightness
    0–10, Chroma = 0–max. A standardized notation, e.g. `5R 4/14`. All three axes named.
  - **ISCC-NBS Universal Color Language**: 267 categories from hue + lightness (`very light …
    very dark`) + saturation (`grayish … vivid`) descriptors — names for every region.
- **L / C / α positions in CSS: unnamed.** WCAG's `AA/AAA` name contrast *levels* (not L);
  `light-dark()` / `color-scheme` name a *scheme* (not an L position); `transparent` names only
  the α=0 endpoint.

### Single-axis names vs composite names — the distinction that matters

The names worth having are **per-axis** — a name for a position on **one** axis, holding the
others irrelevant — not **composite** names that fuse all axes into one word:

| kind | names one axis? | examples |
|---|---|---|
| **single-axis** ✓ | yes — the model we use | **hue:** unique hues (red/yellow/green/blue), Munsell `R YR Y GY G BG B PB P RP` · **L:** Munsell Value 0–10 (`light`/`dark`) · **C:** Munsell Chroma 0–max, ISCC-NBS `grayish…vivid` |
| **composite** ✗ | no — fuses L+C+H | the 148 CSS named colors (`burlywood`), ISCC-NBS *full* descriptors (`light bluish green`) |

**Munsell *is* the per-axis system** — it names Hue, Value, and Chroma **independently**, each
on its own scale, then composes them *positionally* as `5R 4/14` (Hue 5R, Value 4, Chroma 14).
That is exactly our `(H, L%, C%)` model — one axis at a time — with Munsell as its 1905
precedent. The **unique hues** are the pure hue-axis cardinals; **CSS named colors are the
opposite** — composite words that encode all three axes at once (which is why they collapse to
"one hue at different L%/C%" in §7).

**So:** formal *single-axis* names exist (unique hues; Munsell H/V/C), and they line up with
our axes. Composite names (CSS 148, ISCC-NBS phrases) fuse axes and aren't what we want. Our
content-name `oklch-l-c-h-α` *is* a per-axis coordinate name — Munsell notation in oklch — so
no naming standard is needed; a single-axis label (unique hue, Munsell value) is an optional
*derived* claim on **one** coordinate.

## References (naming systems)

- **Unique hues / opponent process** — Hering; encoded in OKLab's `a` (red–green) / `b`
  (yellow–blue) axes (CSS Color 4 §9.2).
- **Munsell** — ASTM D1535 *Standard Practice for Specifying Color by the Munsell System*.
- **ISCC-NBS** — Kelly & Judd, *Color: Universal Language and Dictionary of Names*, NBS Spec.
  Publ. 440 (1976).

## 9. The applied per-axis naming — `axis-name`

Formalized and applied: each color is named **per axis**, never composite — Munsell-in-oklch.

| axis | name | grounding |
|---|---|---|
| **HUE** | 11 landmarks anchored on the **4 OKLab unique hues** — red 29.23°, yellow 109.77°, green 142.5°, blue 264.05° (measured from pure sRGB primaries) — + interpolated blends (marked `*`) | OKLab opponent axes (unique = formal); Munsell hue families |
| **VALUE** | `V0..V10` = `round(L/10)` — black(0) … white(10) | Munsell Value |
| **CHROMA** | `C%` of the **gamut ceiling** at (L,H), tiered `neutral · grayish · muted · moderate · strong · vivid` | gamut-relative (our scale); Munsell Chroma / ISCC-NBS saturation |
| **ALPHA** | opacity % | — |

Output is a **coordinate name** — `teal* · V2 · C37%` — the per-axis analog of Munsell
`5R 4/14`; no composite word. Neutrals (C<0.02) → `neutral · V#`; α=0 → `transparent`.

Applied, it re-proves §7 on individual colors: `#800000` maroon → **`red · V4 · C98%`** (red
at low value — the composite name dissolves); `#F0F8FF` aliceblue → **`neutral · V10`** (the
composite name lies; there is no hue). bounded.tools reads as `teal*`/`green`/`amber` across
V2–V9 at various chroma — **2 hues, a value ladder, a chroma range**, in three independent axes.

### Hue is non-uniform — name it above/below a unique hue, and coarsely

The 4 unique hues are **unevenly spaced** in oklch angle: red 29° → yellow 110° (gap 80°) →
green 143° (gap **33°**) → blue 264° (gap **122°**) → red (gap 125°). `yellow→green` is **3.7×
tighter** than `green→blue`, so equal angle ≠ equal perceptual hue, and an absolute angle is a
poor name. `axis-name` names a hue **above/below its nearest unique hue** (`orange = below
yellow 39°`, `violet = above blue 39°`).

**The universal hue step.** Hue JND = ΔEOK / C, *finest at max chroma* (C=0.4): **≈ 2.9°**
(≈ 1.4° at the strictest ΔEOK 0.01). Below it, **no chroma** can show a hue difference. The
wheel holds at most **~126 hues** (max chroma) · ~31 at C 0.1 · ~6 near-gray. Hue precision
finer than ~1° is **phantom** — thousandths of a degree 3,000× too fine, millionths
3,000,000×. `round(H, 2)` = 0.01° is 300× finer than the floor: harmless, far beyond meaningful.

### Other per-axis systems — `color-systems`

The same point in every per-axis color system (single-axis, no composites): **OKLCh** `L% C H`
(ours) · **CIELCh** `L* C* h` · **CIELab** `L* a* b*` · **HSL** `H S% L%` · **HSV** `H S% V%` ·
**Munsell** `H V/C` (~approx, empirical). Exact where closed-form; Munsell flagged approximate.

## 10. Warm/cool — hue collapsed to one axis (Ou et al. 2004)

Hue reduces to a single **warm↔cool** scalar: `WC = −0.5 + 0.02·C*^1.07·cos(h*−50°)` (CIELab).
In oklch hue:
- **Warmest:** h ≈ **43°** (red-orange) · **Coolest:** h ≈ **219°** (blue) — near-opposite.
- **Boundary (warm = cool):** h ≈ **144°** (green — lands on the green unique hue) and **319°**
  (magenta). Green is the pivot; the warm↔cool axis is orange↔blue.
- **AAA mutes temperature too:** max warmth amplitude drops from **2.15** (full gamut) to **0.48**
  (AAA light band) — accessibility flattens hue *and* warm/cool, since `WC ∝ C*`.

## 11. The pinned scale — our own JND-quantized grid

Each axis is pinned to fixed steps a comfortable multiple of its JND (§2) — *less granular, more
pinned*, so neighbors are clearly distinct, not barely:

| axis | JND | our step | levels | step/JND |
|---|---|---|---|---|
| L | ~2% | **5%** | 21 (0..100) | 2.5× |
| C | ~10% ceiling | **25% of gamut ceiling** | 5 (0..100) | ~2.5× |
| H | ~3° (max C) | **15°** | 24 | 5× |
| α | ~7% | **25%** | 5 | ~3.5× |

`quantize()` snaps any color to the grid. The whole addressable space is **finite**:
`21 L × 24 H × 4 C × 4 α + 21 L × 4 α (neutral) + 1 (transparent) = 8,149 pinned colors`
(all in-gamut, since C is a fraction of the ceiling). bounded.tools' 42 colors → **33 grid
cells**. A design system uses a handful of these 8,149 — the scarcity is the point.
