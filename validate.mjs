#!/usr/bin/env node
// synoptic validate — the layered site-validation engine. The checks live HERE,
// not in each site: a site declares its artifacts in synoptic.config.json, and
// this runs the right conformance-kit gate at each layer, in order, trusting the
// layer below (see LAYERS.md). Sites stay thin — content + config; the engine
// owns the validation pipeline, so a change updates every site at once.
//
//   node validate.mjs [--strict] [--layer <name>]   (from a site's root)
//
// Gates come from @bounded-systems/conformance-kit (a dependency, pinned). The
// engine only ORCHESTRATES — it never re-implements a gate.
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const strict = process.argv.includes("--strict");
const layerIdx = process.argv.indexOf("--layer");
const onlyLayer = layerIdx >= 0 ? process.argv[layerIdx + 1] : undefined;
const CWD = process.cwd();

// resolve the pinned conformance-kit gates dir (dependency or $CK_GATES override)
function gatesDir() {
  if (process.env.CK_GATES) return process.env.CK_GATES;
  try {
    return join(dirname(require.resolve("@bounded-systems/conformance-kit/package.json")), "gates");
  } catch {
    const vendored = join(CWD, "vendor", "conformance-kit", "gates");
    if (existsSync(vendored)) return vendored;
    console.error("✗ conformance-kit not found — add it as a dependency or set $CK_GATES");
    process.exit(2);
  }
}
const GATES = gatesDir();

// The layer order IS the abstraction stack. Each entry maps a config block to the
// gate(s) that validate that layer's new shape (and nothing below it).
const LAYERS = [
  {
    name: "tokens",
    run: (cfg) => cfg.tokens && cfg.grounding
      ? [["token-grounding-gate.mjs", [abs(cfg.tokens), abs(cfg.grounding)]]]
      : [],
  },
  {
    name: "jsonld",
    run: (cfg) => cfg.shapes && cfg.doc
      ? [["shacl-runner.mjs", [abs(cfg.shapes), abs(cfg.doc)]]]
      : [],
  },
  {
    name: "markdown",
    run: (cfg) => {
      const out = [];
      if (cfg.proseCorpus) {
        out.push(["claim-discipline-gate.mjs", [abs(cfg.proseCorpus)]]);
        out.push(["grammar-repetition-gate.mjs", [abs(cfg.proseCorpus)]]);
      }
      if (cfg.docCorpus) out.push(["doc-scope-gate.mjs", [abs(cfg.docCorpus)]]);
      return out;
    },
  },
  {
    name: "website",
    run: (cfg) => {
      const out = [];
      if (cfg.dist) out.push(["axe-gate.mjs", [abs(cfg.dist)]]);
      return out;
    },
  },
];

const abs = (p) => (p.startsWith("/") ? p : join(CWD, p));

const config = JSON.parse(await readFile(join(CWD, "synoptic.config.json"), "utf8"));
const layers = config.layers ?? {};

let failed = 0, ran = 0;
console.log(`synoptic validate — ${config.site ?? CWD} (gates: ${GATES})\n`);
for (const layer of LAYERS) {
  if (onlyLayer && layer.name !== onlyLayer) continue;
  const cfg = layers[layer.name];
  if (!cfg) { console.log(`· ${layer.name}: not configured — skipped`); continue; }
  for (const [gate, args] of layer.run(cfg)) {
    ran++;
    const gatePath = join(GATES, gate);
    if (!existsSync(gatePath)) { console.log(`  ⚠ ${layer.name}/${gate}: not in kit — skipped`); continue; }
    const res = spawnSync(process.execPath, [gatePath, ...args, ...(strict ? ["--strict"] : [])], { encoding: "utf8" });
    const ok = res.status === 0;
    failed += ok ? 0 : 1;
    console.log(`${ok ? "✅" : "❌"} ${layer.name}/${gate.replace("-gate.mjs", "").replace(".mjs", "")}`);
    const out = (res.stdout || res.stderr || "").trim().split("\n").map((l) => "     " + l).join("\n");
    if (out && (!ok || process.env.SYNOPTIC_VERBOSE)) console.log(out);
  }
}

console.log(`\n${ran} gate(s) across ${LAYERS.length} layers · ${failed} failing`);
process.exit(strict && failed ? 1 : 0);
