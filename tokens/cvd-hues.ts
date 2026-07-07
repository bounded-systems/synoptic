// Scan a palette for hues that COLLAPSE under color-blindness — two chromatic colors with different
// real hue that a color-blind viewer can't tell apart. Using both to convey meaning fails WCAG 1.4.1.
// The fix: keep chromatic hues in ONE field (the yellow-blue axis CVD preserves) or split by lightness.
// The CVD simulation, ΔEOK, and thresholds are SHARED (color.ts / constants.ts) — no local copies.
// Run: deno run --allow-read cvd-hues.ts <palette.json>
import { CVD_TYPES, cvdSimulate, deltaEOK, hexToOklch } from "./color.ts";
import { CHROMATIC_THRESHOLD, DELTA_E_JND } from "./constants.ts";

const palette = JSON.parse(Deno.readTextFileSync(Deno.args[0])) as string[];
const chromatic = palette.map((hex) => ({ hex, o: hexToOklch(hex) })).filter((x) => x.o.c > CHROMATIC_THRESHOLD);
const HUE_DIFF = 18; // only flag GENUINELY-different hues (a declared decision: min hue gap to count as "two hues")
const confusable: string[] = [];
for (let i = 0; i < chromatic.length; i++) {
  for (let j = i + 1; j < chromatic.length; j++) {
    const a = chromatic[i], b = chromatic[j];
    const hueGap = Math.min(Math.abs(a.o.h - b.o.h), 360 - Math.abs(a.o.h - b.o.h));
    if (hueGap < HUE_DIFF) continue; // same hue anyway — not a "two distinct hues" case
    const worst = Math.min(...CVD_TYPES.map((t) => deltaEOK(cvdSimulate(a.hex, t), cvdSimulate(b.hex, t))));
    if (worst < DELTA_E_JND * 1.5) confusable.push(`${a.hex} (hue ${a.o.h}°) ↔ ${b.hex} (hue ${b.o.h}°): distinct hues (${Math.round(hueGap)}° apart) collapse under CVD (ΔEOK ${worst.toFixed(3)} < ${DELTA_E_JND})`);
  }
}
console.log(`cvd-hue scan: ${chromatic.length} chromatic colors — ${confusable.length ? confusable.length + " CONFUSABLE hue pair(s) (fail 1.4.1 if used for meaning):" : "✓ all hues stay distinguishable under color-blindness"}`);
for (const c of confusable) console.log("  ✗ " + c);
if (confusable.length) { console.log("\n  fix: keep chromatic hues in ONE field — the yellow-blue (warm↔cool) axis red-green CVD preserves — or distinguish them by lightness."); Deno.exit(1); }
