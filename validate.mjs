#!/usr/bin/env node
// synoptic validate — the layered site-validation engine. The checks live HERE,
// not in each site: a site declares its artifacts in synoptic.config.json, and
// this runs the right conformance-kit gate at each layer, in order, trusting the
// layer below (see LAYERS.md). Sites stay thin — content + config; the engine
// owns the validation pipeline, so a change updates every site at once.
//
//   node validate.mjs [--strict] [--layer <name>] [--attest <dir>]
//
// --attest writes one in-toto Statement per check (subject = the artifact checked,
// by digest; predicate = the verdict + layer). CI then cosign-signs each via the
// workflow's OIDC identity (keyless Sigstore → Fulcio cert → Rekor) — so a check
// RESULT is a signed, verifiable claim, bottom layer up. The engine only
// ORCHESTRATES gates (from pinned @bounded-systems/conformance-kit) + attests.
import { spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const strict = process.argv.includes("--strict");
const layerIdx = process.argv.indexOf("--layer");
const onlyLayer = layerIdx >= 0 ? process.argv[layerIdx + 1] : undefined;
const attestIdx = process.argv.indexOf("--attest");
const attestDir = attestIdx >= 0 ? process.argv[attestIdx + 1] : undefined;
const CWD = process.cwd();
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const digestOf = (p) => (existsSync(p) ? sha256(readFileSync(p)) : sha256(Buffer.from("")));

// The rung each check's verdict actually reaches (see PROOF.md). Signing adds
// `attested` on top of this, orthogonally — a signed derivable check is derivable
// AND attested, not proven.
const PROOF_TYPE = {
  "token-grounding": "grounded", // establishes a figure→proof trace
  "claim-discipline": "derivable", // pure re-runnable proxy
  "grammar-repetition": "derivable",
  "doc-scope": "derivable",
  "shacl-runner": "derivable", // decides conformance for this input
  "shacl": "derivable",
  "axe": "derivable",
};

// an in-toto Statement attesting a check's verdict over the artifact it checked.
// Signed by CI (cosign keyless, OIDC) — a verifiable per-check result.
function attestation({ site, layer, gate, result, materials }) {
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: materials.map((m) => ({ name: m.name, digest: { sha256: m.digest } })),
    predicateType: "https://bounded.tools/synoptic/check/v1",
    predicate: {
      site,
      layer,
      gate,
      result, // "pass" | "fail"
      proofType: PROOF_TYPE[gate] ?? "derivable", // the rung this verdict reaches
      strict,
      builder: { id: "https://github.com/bounded-systems/synoptic" },
    },
  };
}

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
    // Config-driven: a site lists the website gates it wants; the engine runs each
    // over dist from the pinned kit. No gate implementation lives in the site — it
    // declares `gates`, the engine owns the running. Defaults to axe if unspecified.
    run: (cfg) => {
      const dist = cfg.dist ? abs(cfg.dist) : null;
      const gates = cfg.gates ?? (dist ? ["axe-gate.mjs"] : []);
      return gates.map((g) =>
        typeof g === "string"
          ? [g, [dist]]
          : [g.gate, (g.args ?? ["$dist"]).map((a) => (a === "$dist" ? dist : abs(a)))]
      );
    },
  },
];

const abs = (p) => (p.startsWith("/") ? p : join(CWD, p));

const config = JSON.parse(await readFile(join(CWD, "synoptic.config.json"), "utf8"));
const layers = config.layers ?? {};

let failed = 0, ran = 0, attested = 0;
if (attestDir) await mkdir(abs(attestDir), { recursive: true });
console.log(`synoptic validate — ${config.site ?? CWD} (gates: ${GATES})${attestDir ? " · attesting" : ""}\n`);
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
    const short = gate.replace("-gate.mjs", "").replace(".mjs", "");
    console.log(`${ok ? "✅" : "❌"} ${layer.name}/${short}`);
    const out = (res.stdout || res.stderr || "").trim().split("\n").map((l) => "     " + l).join("\n");
    if (out && (!ok || process.env.SYNOPTIC_VERBOSE)) console.log(out);
    if (attestDir) {
      // args are the artifact paths the gate checked — subject them by digest
      const materials = args.filter((a) => existsSync(a)).map((a) => ({ name: a.replace(CWD + "/", ""), digest: digestOf(a) }));
      const stmt = attestation({ site: config.site ?? CWD, layer: layer.name, gate: short, result: ok ? "pass" : "fail", materials });
      await writeFile(join(abs(attestDir), `${layer.name}.${short}.intoto.json`), JSON.stringify(stmt, null, 2) + "\n");
      attested++;
    }
  }
}

console.log(`\n${ran} gate(s) across ${LAYERS.length} layers · ${failed} failing`);
process.exit(strict && failed ? 1 : 0);
