// Scan a generated stylesheet for violations of OUR declared standard — do we dogfood?
//   1. every REAL property references a var() — only --token definitions hold a direct value
//   2. no px lengths (rem/relative only — 1.4.4/1.4.10)
//   3. colors are oklch (no hex/rgb/hsl)
//   4. properties are valid CssProperty (from webref)
// :root token definitions (--x: …) and @property blocks DEFINE tokens, so they may hold literals.
// Exits non-zero on any violation. Run: deno run --allow-read audit.ts <style.css>
import { CssProperty } from "./properties.ts";

const css = Deno.readTextFileSync(Deno.args[0]);
const body = css.replace(/@property[^}]*\}/g, ""); // strip token registrations
const v: string[] = [];
let real = 0;
for (const rule of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const sel = rule[1].trim();
  for (const dm of rule[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) {
    const prop = dm[1].trim(), val = dm[2].trim();
    if (prop.startsWith("--")) { // a token DEFINITION — a direct value is expected here
      if (/\dpx/.test(val)) v.push(`${sel} { ${prop} } px in a token: ${val}`);
      if (/#[0-9a-f]{3,8}\b|\brgb\(|\bhsl\(/i.test(val)) v.push(`${sel} { ${prop} } non-oklch color token: ${val}`);
      continue;
    }
    real++;
    if (!CssProperty.safeParse(prop).success) v.push(`${sel} { ${prop} } — not a valid CssProperty`);
    if (!/^var\(/.test(val)) v.push(`${sel} { ${prop}: ${val} } — DIRECT value; a real property must reference a var()`);
    if (/\dpx/.test(val)) v.push(`${sel} { ${prop}: ${val} } — px length (1.4.4/1.4.10 want rem)`);
    if (/#[0-9a-f]{3,8}\b|\brgb\(|\bhsl\(/i.test(val)) v.push(`${sel} { ${prop}: ${val} } — non-oklch color`);
  }
}
console.log(`audit ${Deno.args[0]}: ${real} real declarations checked — ${v.length ? v.length + " VIOLATION(S) of our declared standard:" : "✓ conforms (full indirection, rem-only, oklch-only, valid properties)"}`);
for (const x of v) console.log("  ✗ " + x);
if (v.length) Deno.exit(1);
