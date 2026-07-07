// Scan a palette for hues that COLLAPSE under color-blindness — two chromatic colors with different
// real hue that a color-blind viewer can't tell apart (they map to nearly the same appearance).
// Using both to convey different meaning fails WCAG 1.4.1. The safe fix: keep chromatic hues in ONE
// field — the yellow–blue axis that red-green CVD preserves (warm↔cool), not the red-green axis.
// Run: deno run --allow-read cvd-hues.ts <palette.json>
import { hexToOklch } from "./color.ts";

const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (c: number) => Math.max(0, Math.min(1, c));
const CVD = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
} as const;
const simulate = (hex: string, M: readonly (readonly number[])[]) => {
  const lin = hex2rgb(hex).map(toLin);
  const out = M.map((r) => clamp(r[0] * lin[0] + r[1] * lin[1] + r[2] * lin[2])).map(fromLin).map((c) => Math.round(clamp(c) * 255).toString(16).padStart(2, "0"));
  return "#" + out.join("");
};
// ΔEOK — Euclidean distance in OKLab (a,b from oklch; L as 0-1)
const oklab = (o: { l: number; c: number; h: number }) => ({ L: o.l / 100, a: o.c * Math.cos(o.h * Math.PI / 180), b: o.c * Math.sin(o.h * Math.PI / 180) });
const dE = (h1: string, h2: string) => { const A = oklab(hexToOklch(h1)), B = oklab(hexToOklch(h2)); return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b); };

const palette = JSON.parse(Deno.readTextFileSync(Deno.args[0])) as string[];
const chromatic = palette.map((hex) => ({ hex, o: hexToOklch(hex) })).filter((x) => x.o.c > 0.04);
const JND = 0.02, HUE_DIFF = 18; // ΔEOK≈0.02 is the edge of visibility; only flag genuinely-different hues
const confusable: string[] = [];
for (let i = 0; i < chromatic.length; i++) {
  for (let j = i + 1; j < chromatic.length; j++) {
    const a = chromatic[i], b = chromatic[j];
    const hueGap = Math.min(Math.abs(a.o.h - b.o.h), 360 - Math.abs(a.o.h - b.o.h));
    if (hueGap < HUE_DIFF) continue; // same hue anyway — not a "two distinct hues" case
    // worst (smallest) CVD-simulated distance across the three deficiencies
    const worst = Math.min(...Object.values(CVD).map((M) => dE(simulate(a.hex, M), simulate(b.hex, M))));
    if (worst < JND * 1.5) confusable.push(`${a.hex} (hue ${a.o.h}°) ↔ ${b.hex} (hue ${b.o.h}°): distinct hues (${Math.round(hueGap)}° apart) collapse under CVD (ΔEOK ${worst.toFixed(3)} < ${JND})`);
  }
}
console.log(`cvd-hue scan: ${chromatic.length} chromatic colors — ${confusable.length ? confusable.length + " CONFUSABLE hue pair(s) (fail 1.4.1 if used for meaning):" : "✓ all hues stay distinguishable under color-blindness"}`);
for (const c of confusable) console.log("  ✗ " + c);
if (confusable.length) { console.log("\n  fix: keep chromatic hues in ONE field — the yellow-blue (warm↔cool) axis that red-green CVD preserves — or distinguish them by lightness."); Deno.exit(1); }
