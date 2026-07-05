#!/usr/bin/env node
// project — build a website COMPONENT as a provenanced projection from the
// knowledge graph. A component is a native-HTML chunk rendered from a CLOSED
// subgraph (see ck-graph-split) plus the string tokens it resolves. Each carries:
//
//   • an in-toto/SLSA provenance statement — WHY it exists (the subgraph roots)
//     and WHAT built it (the resolved data + token materials, by digest), so a
//     part of the site is traceable, not just the whole build.
//   • a content digest of the rendered HTML — so it's cacheable: same inputs ⇒
//     same digest ⇒ reuse, skip the render.
//
//   node project.mjs <component> [--out dist/components]
//
// Components register in components/<name>.mjs, exporting { roots, materials,
// render }. This engine owns provenance + caching; a component owns only its HTML.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ENGINE = dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
const name = process.argv[2];
const outArg = argv("--out") ?? "dist/components";
const outDir = outArg.startsWith("/") ? outArg : join(CWD, outArg);
if (!name) { console.error("usage: project <component> [--out <dir>]"); process.exit(2); }
function argv(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; }

const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");
const site = process.env.SYNOPTIC_SITE || "https://bounded.tools";

// load the component definition (from the consuming site, else the engine's own)
const local = join(CWD, "components", `${name}.mjs`);
const bundled = join(ENGINE, "components", `${name}.mjs`);
const defPath = existsSync(local) ? local : bundled;
if (!existsSync(defPath)) { console.error(`✗ no component "${name}" (looked in ./components and the engine)`); process.exit(2); }
const def = await import(pathToFileURL(defPath).href);

// resolve materials (the inputs) by digest — the provenance + the cache key
const materials = (def.materials ?? []).map((m) => {
  const p = join(CWD, m.path);
  const bytes = existsSync(p) ? readFileSync(p) : Buffer.from("");
  return { uri: m.uri ?? m.path, path: m.path, digest: sha256(bytes), bytes };
});
const cacheKey = sha256(Buffer.concat([
  Buffer.from(name + "\0" + (def.roots ?? []).join(",") + "\0"),
  ...materials.map((m) => Buffer.from(m.digest)),
]));

// render the component HTML from its resolved materials
const ctx = {
  read: (rel) => JSON.parse(readFileSync(join(CWD, rel), "utf8")),
  esc: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
};
const html = (await def.render(ctx)).trim() + "\n";
const htmlDigest = sha256(Buffer.from(html));

// in-toto/SLSA provenance: the projection, its subgraph, and its material digests
const provenance = {
  _type: "https://in-toto.io/Statement/v1",
  subject: [{ name: `component/${name}`, digest: { sha256: htmlDigest.slice(7) } }],
  predicateType: "https://slsa.dev/provenance/v1",
  predicate: {
    buildDefinition: {
      buildType: "https://bounded.tools/synoptic/component-projection",
      externalParameters: { component: name, site, subgraph: def.roots ?? [] },
      resolvedDependencies: materials.map((m) => ({ uri: m.uri, digest: { sha256: m.digest.slice(7) } })),
    },
    runDetails: {
      builder: { id: "https://github.com/bounded-systems/synoptic" },
      metadata: { cacheKey: cacheKey.slice(7) },
    },
  },
};

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, `${name}.html`), html);
await writeFile(join(outDir, `${name}.provenance.json`), JSON.stringify(provenance, null, 2) + "\n");
console.log(`✓ component/${name} — ${html.length}B · ${htmlDigest.slice(0, 19)}… · from {${(def.roots ?? []).map((r) => r.replace(/^.*#/, "#")).join(", ")}} · ${materials.length} material(s)`);
