// The whole engine as ONE verbspec surface — a CLI today, MCP/OpenAPI/Anthropic-tool for free.
// Merges the color-token generators (verbs.ts VERBS) with the pipeline verbs: seed-palette (seed →
// palette), style / build (config → outputs), check (the CI gate). One typed source; every verb is a
// CLI subcommand AND a machine tool with a Zod-validated schema.
// Run:  deno run --allow-read --allow-write --allow-run cli.ts <verb> [--flags]
//   deno run cli.ts seed-palette --seed '#CC5500'
//   deno run --allow-read --allow-write --allow-run cli.ts build --brand brands/burnt-orange/brand.json --out examples/mock-orange
import { defineVerb, dispatch, type Registry, render } from "verbspec";
import { z } from "zod";
import { deriveSeedPalette, VERBS } from "./verbs.ts";

const here = (s: string) => new URL(s, import.meta.url).pathname;
const runScript = async (script: string, args: string[]) => {
  const { code, stdout, stderr } = await new Deno.Command("deno", { args: ["run", "--allow-read", "--allow-write", "--allow-run", here(script), ...args] }).output();
  return { ok: code === 0, log: (new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr)).trim() };
};
const BrandIO = z.object({ brand: z.string().describe("path to brand.json"), out: z.string().describe("output directory") });
const RunResult = z.object({ ok: z.boolean(), log: z.string() });

export const seedPaletteVerb = defineVerb({
  id: "seed-palette",
  summary: "Derive the full palette (neutral ramp + accent shades) from ONE brand seed color.",
  actor: "brand",
  input: z.object({ seed: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "hex seed") }),
  output: z.array(z.string()),
  run: ({ seed }) => deriveSeedPalette(seed),
});
export const styleVerb = defineVerb({
  id: "style",
  summary: "Derive style.css from a brand config (type-driven, full indirection, AAA by construction).",
  actor: "brand",
  input: BrandIO,
  output: RunResult,
  run: ({ brand, out }) => runScript("to-css.ts", [brand, out]),
});
export const buildVerb = defineVerb({
  id: "build",
  summary: "Build all three outputs from a brand config: style.css + tokens.dtcg.json + tokens.sd.json.",
  actor: "brand",
  input: BrandIO,
  output: RunResult,
  run: ({ brand, out }) => runScript("build-brand.ts", [brand, out]),
});
export const checkVerb = defineVerb({
  id: "check",
  summary: "The CI gate: re-derive + assert byte-identical, then the full-indirection audit + CVD-hue scan.",
  actor: "ci",
  input: BrandIO,
  output: RunResult,
  run: ({ brand, out }) => runScript("check.ts", [brand, out]),
});

/** The unified registry — generators + pipeline, one surface. */
export const CLI: Registry = { ...VERBS, "seed-palette": seedPaletteVerb, style: styleVerb, build: buildVerb, check: checkVerb };

if (import.meta.main) {
  const result = await dispatch(CLI, Deno.args, "deno run --allow-read --allow-write --allow-run cli.ts");
  console.log(result.kind === "help" ? result.text : render(result.output));
  if (result.kind !== "help" && result.output && (result.output as { ok?: boolean }).ok === false) Deno.exit(1);
}
