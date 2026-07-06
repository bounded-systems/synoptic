#!/usr/bin/env node
// synoptic reflow <url> — WCAG 2.2 SC 1.4.10 (Reflow, AA): render at 320 CSS px width
// (= 20rem @ 16px root) and assert no horizontal scroll. Content MUST reflow without 2D
// scrolling; exceptions are parts needing 2D layout (maps, data tables, media). Widths in
// rem — the CSS pixel is the reference unit (CSS Values 3); our canonical unit is
// rem = CSS px ÷ root font-size, so 320px = 20rem.
//
// NB: verifies the viewport ACTUALLY resized. tezcatl --width currently affects only
// --screenshot, NOT --eval — so this is INCONCLUSIVE until tezcatl exposes the viewport
// to eval (or we use the pinned responsive engine). Honest > a false pass.
import { execFileSync } from "node:child_process";
const url = process.argv[2];
if (!url) { console.error("usage: reflow <url>"); process.exit(2); }
const W = 320;
const EVAL = `(()=>{
  const de=document.documentElement, root=parseFloat(getComputedStyle(de).fontSize)||16;
  const wide=[];
  document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect();if(r.width>de.clientWidth+1){let ctx=(typeof el.className==='string'&&el.className.trim())?el.className.trim().split(/\\s+/)[0]:el.tagName.toLowerCase();wide.push({ctx,w:Math.round(r.width),twoD:/^(table|img|svg|video|iframe|pre|code)$/.test(el.tagName.toLowerCase())});}});
  return JSON.stringify({root,viewport:de.clientWidth,scrollWidth:de.scrollWidth,overflowX:de.scrollWidth>de.clientWidth,wide:wide.slice(0,12)});
})()`;
const d = JSON.parse(execFileSync("tezcatl", [url, "--width=" + W, "--height=1024", "--eval=" + EVAL], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim());
const rem = (px) => (px / d.root).toFixed(2) + "rem";
console.log(`reflow — ${url}  (WCAG 2.2 SC 1.4.10, AA)\n`);
console.log(`  target viewport:  ${W} CSS px (${rem(W)})   actual: ${d.viewport} CSS px (${rem(d.viewport)})`);
if (d.viewport > W + 5) {
  console.log(`\n  ⚠ INCONCLUSIVE — the viewport did NOT resize to ${W}px (tezcatl --width does not reach`);
  console.log(`    --eval; it only affects --screenshot). Reflow was NOT tested at 320px.`);
  console.log(`    Fix: tezcatl should expose viewport width to --eval, or use the pinned responsive engine.`);
  process.exit(2);
}
console.log(`  content width:    ${d.scrollWidth} CSS px (${rem(d.scrollWidth)})`);
console.log(`  horizontal scroll: ${d.overflowX ? "❌ YES — reflow FAILS" : "✓ none — reflow passes"}`);
const real = d.wide.filter((w) => !w.twoD);
if (d.wide.length) { console.log(`\n  wider than viewport:`); for (const w of d.wide) console.log(`    ${w.twoD ? "(2D-ok)" : "  ✗   "} ${w.ctx.padEnd(16)} ${w.w}px (${rem(w.w)})`); }
process.exit(d.overflowX ? 1 : 0);
