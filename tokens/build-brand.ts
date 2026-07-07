// Build ALL outputs for a brand from the one derivation — always the three, in sync, never drifting:
//   style.css (browser) · tokens.dtcg.json (W3C interop) · tokens.sd.json (Style Dictionary).
// Run: deno run -RWE --allow-run build-brand.ts <brand.json> <outDir>
const [brandPath, outDir] = [Deno.args[0], Deno.args[1] ?? "."];
for (const script of ["to-css.ts", "to-tokens.ts"]) {
  const { code, stdout, stderr } = await new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", new URL(script, import.meta.url).pathname, brandPath, outDir],
  }).output();
  const out = new TextDecoder().decode(stdout).trim();
  if (out) console.log("  " + out);
  if (code !== 0) { console.error(new TextDecoder().decode(stderr)); Deno.exit(code); }
}
console.log(`✓ ${outDir}: style.css + tokens.dtcg.json + tokens.sd.json`);
