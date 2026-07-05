#!/usr/bin/env node
// synoptic sbom — an SPDX SBOM of the site's CLAIMS, built from the graph derivation
// provenance. Every graph node is a package; the evidence it was parsed from is a
// package it is GENERATED_FROM (from the parse attestations). A standard bill of
// materials for WHAT the site asserts and WHERE each claim came from — SPDX-2.3, so
// existing SBOM tooling reads it. Not the code SBOM (that's gen-sbom); the CLAIMS SBOM.
//
//   node sbom.mjs [--graph data/graph.json] [--out data/claims.sbom.spdx.json]
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CWD = process.cwd();
const argv = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
const graphPath = argv("--graph") ?? "data/graph.json";
const provPath = graphPath.replace(/\.json$/, ".provenance.json");
const out = argv("--out") ?? "data/claims.sbom.spdx.json";
const NS = argv("--namespace") ?? "https://bounded.tools";

const graph = JSON.parse(await readFile(join(CWD, graphPath), "utf8"));
const prov = JSON.parse(await readFile(join(CWD, provPath), "utf8"));

const id = (s) => "SPDXRef-" + s.replace(/[^A-Za-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "");
const packages = new Map(); // spdxid -> package
const relationships = [];

const addPkg = (spdxid, name, sha, extra = {}) => {
  if (!packages.has(spdxid)) {
    packages.set(spdxid, {
      SPDXID: spdxid, name,
      downloadLocation: "NOASSERTION",
      ...(sha ? { checksums: [{ algorithm: "SHA256", checksumValue: sha }] } : {}),
      ...extra,
    });
  }
};

// evidence (materials) + nodes (subjects), with GENERATED_FROM edges
for (const stmt of prov) {
  const plugin = stmt.predicate.plugin;
  for (const dep of stmt.predicate.resolvedDependencies ?? []) {
    addPkg(id("evidence-" + dep.uri), dep.uri, dep.digest.sha256, { primaryPackagePurpose: "SOURCE" });
  }
  for (const subj of stmt.subject ?? []) {
    const nid = id("claim-" + subj.name);
    addPkg(nid, subj.name, subj.digest.sha256, { primaryPackagePurpose: "DATA", supplier: `Organization: synoptic/${plugin}` });
    for (const dep of stmt.predicate.resolvedDependencies ?? []) {
      relationships.push({ spdxElementId: nid, relationshipType: "GENERATED_FROM", relatedSpdxElement: id("evidence-" + dep.uri) });
    }
  }
}

const sbom = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: "claims-sbom",
  documentNamespace: `${NS}/claims.sbom`,
  creationInfo: { creators: ["Tool: synoptic-sbom"], created: "1970-01-01T00:00:00Z" },
  packages: [...packages.values()],
  relationships,
};
await writeFile(out.startsWith("/") ? out : join(CWD, out), JSON.stringify(sbom, null, 2) + "\n");
console.log(`✓ ${out} — SPDX-2.3 · ${packages.size} packages (evidence + claims) · ${relationships.length} GENERATED_FROM edges`);
