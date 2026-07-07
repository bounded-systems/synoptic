// THE STANDALONE GATE (for CI) — proves a built brand can't be circumvented by hand-editing the
// output. It (1) RE-DERIVES the outputs from the brand config to a temp dir and asserts the committed
// files are byte-identical (a hand-edit to style.css / the token JSON fails here), then (2) runs the
// dogfood checks: the full-indirection audit + the CVD-hue scan. Non-zero on ANY failure. The build
// and this check are SEPARATE on purpose — the derivation builds; this only verifies.
// Run: deno run --allow-read --allow-write --allow-run check.ts <brand.json> <outDir>
import { deriveSeedPalette } from "./verbs.ts";
import { loadBrand } from "./config.ts";

const [brandPath, outDir] = [Deno.args[0], Deno.args[1] ?? "."];
const here = (s: string) => new URL(s, import.meta.url).pathname;
const deno = (args: string[]) => new Deno.Command("deno", { args: ["run", "--allow-read", "--allow-write", ...args] }).output();
const firstLine = (b: Uint8Array) => new TextDecoder().decode(b).trim().split("\n")[0];

const tmp = Deno.makeTempDirSync();
await deno([here("to-css.ts"), brandPath, tmp]); // re-derive from the config (the source of truth)
await deno([here("to-tokens.ts"), brandPath, tmp]);

const drift: string[] = [];
for (const f of ["style.css", "tokens.dtcg.json", "tokens.sd.json"]) {
  if (Deno.readTextFileSync(`${outDir}/${f}`) !== Deno.readTextFileSync(`${tmp}/${f}`)) drift.push(f);
}

const brand = loadBrand(brandPath);
Deno.writeTextFileSync(`${tmp}/palette.json`, JSON.stringify(brand.palette ?? deriveSeedPalette(brand.seed)));
const audit = await deno([here("audit.ts"), `${outDir}/style.css`]);
const cvd = await deno([here("cvd-hues.ts"), `${tmp}/palette.json`]);
console.log(`  audit: ${firstLine(audit.stdout)}`);
console.log(`  cvd:   ${firstLine(cvd.stdout)}`);

const ok = drift.length === 0 && audit.code === 0 && cvd.code === 0;
console.log(`check ${outDir}: drift ${drift.length ? "✗ " + drift.join(", ") : "✓ matches the derivation"} · audit ${audit.code === 0 ? "✓" : "✗"} · cvd ${cvd.code === 0 ? "✓" : "✗"}`);
if (drift.length) console.error(`  ✗ committed output differs from what the config derives — hand-edited? Re-run: deno task build-brand ${brandPath} ${outDir}`);
Deno.exit(ok ? 0 : 1);
