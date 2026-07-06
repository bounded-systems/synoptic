#!/usr/bin/env node
// synoptic contrast <url> — WCAG contrast audit via tezcatl (WebKit). For every text
// element, computes foreground-on-effective-background contrast and flags AA/AAA
// failures. Built on the same rendering + color pipeline; because we canonicalize to
// OkLCH we can also report perceptual lightness. This is axe-style a11y from OUR stack.
//   node contrast.mjs <url> [--aaa]
import { execFileSync } from "node:child_process";
const url = process.argv[2];
if (!url) { console.error("usage: contrast <url> [--aaa]"); process.exit(2); }
const AAA = process.argv.includes("--aaa");

const EVAL = `(()=>{
  const rgb=s=>{const m=(s||'').match(/[\\d.]+/g);return m?[+m[0],+m[1],+m[2],m[3]!=null?+m[3]:1]:null;};
  const effBg=el=>{let e=el;while(e&&e.nodeType===1){const b=rgb(getComputedStyle(e).backgroundColor);if(b&&b[3]>0)return b;e=e.parentElement;}return [255,255,255,1];};
  const out=[];
  document.querySelectorAll('body, body *').forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||el.getClientRects().length===0)return;
    const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(!hasText)return;
    let ctx=(typeof el.className==='string'&&el.className.trim())?el.className.trim().split(/\\s+/)[0]:el.tagName.toLowerCase();
    out.push({ctx,fg:rgb(cs.color),bg:effBg(el),fs:parseFloat(cs.fontSize),fw:parseInt(cs.fontWeight)||400,t:el.childNodes[0]&&el.textContent.trim().slice(0,32)});
  });
  return JSON.stringify(out);
})()`;

const items = JSON.parse(execFileSync("tezcatl", [url, "--eval=" + EVAL], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim());
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a) + 0.05, lum(b) + 0.05]; return x > y ? x / y : y / x; };
// blend fg over bg by fg alpha (so translucent text is judged as rendered)
const over = (fg, bg) => fg[3] >= 1 ? fg : fg.map((c, i) => i < 3 ? Math.round(c * fg[3] + bg[i] * (1 - fg[3])) : 1);

const seen = new Map(); // dedupe by fg|bg|large
let pass = 0; const fails = [];
for (const it of items) {
  if (!it.fg || !it.bg) continue;
  const large = it.fs >= 24 || (it.fs >= 18.66 && it.fw >= 700);
  const r = ratio(over(it.fg, it.bg), it.bg);
  const need = AAA ? (large ? 4.5 : 7) : (large ? 3 : 4.5);
  const key = it.fg.join() + "|" + it.bg.join() + "|" + large;
  if (r >= need) { pass++; continue; }
  if (seen.has(key)) continue; seen.set(key, 1);
  fails.push({ ...it, r: Math.round(r * 100) / 100, need, large });
}
console.log(`contrast — ${url}  (WCAG ${AAA ? "AAA" : "AA"})\n`);
console.log(`  text elements checked: ${items.length}`);
console.log(`  distinct failing fg/bg pairs: ${fails.length}\n`);
const rgbstr = (c) => `rgb(${c.slice(0, 3).join(",")})`;
for (const f of fails.sort((a, b) => a.r - b.r).slice(0, 20))
  console.log(`  ✗ ${String(f.r).padStart(5)}:1  (need ${f.need})  ${f.ctx.padEnd(10)} ${rgbstr(f.fg)} on ${rgbstr(f.bg)}${f.large ? " [large]" : ""}  "${(f.t || "").slice(0, 24)}"`);
console.log(`\n  ${fails.length ? "❌" : "✓"} ${pass} pass · ${fails.length} distinct fail`);
process.exit(fails.length ? 1 : 0);
