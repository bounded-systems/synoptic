#!/usr/bin/env node
// synoptic build-site — project the site FROM the graph (the top clean end). Reads
// data/graph.json, groups nodes into subgraphs by @type, and renders each as a
// native-HTML component with UNROLLED edges (buildsOn shown inline) and a graph→site
// attestation: subject = the HTML (by digest), materials = the subgraph nodes (by
// digest). The page is GENERATED from the graph, not hand-authored; every rendered
// part traces back to the graph, which traces to evidence. Closes the chain.
//
//   node build-site.mjs [--graph data/graph.json] [--out dist]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const CWD = process.cwd();
const argv = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
const graphPath = argv("--graph") ?? "data/graph.json";
const outArg = argv("--out") ?? "dist";
const outDir = outArg.startsWith("/") ? outArg : join(CWD, outArg);
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const graph = JSON.parse(await readFile(join(CWD, graphPath), "utf8"));
const nodes = graph["@graph"] ?? [];
const byId = new Map(nodes.map((n) => [n["@id"], n]));
const short = (id) => (byId.get(id)?.name) ?? id.replace(/^.*#/, "#");

// group by @type (a simple, testable projection; closed-subgraph split can refine it)
const groups = new Map();
for (const n of nodes) {
  const t = [].concat(n["@type"])[0] ?? "Thing";
  (groups.get(t) ?? groups.set(t, []).get(t)).push(n);
}

function renderNode(n) {
  const deps = (n.buildsOn ?? []).map((d) => esc(short(d["@id"]))); // UNROLLED edges
  const terms = (n.hasDefinedTerm ?? []).length;
  return `      <li class="node"><span class="node__name">${esc(n.name ?? n["@id"])}</span>` +
    (n.description ? ` <span class="node__desc">${esc(n.description)}</span>` : "") +
    (deps.length ? ` <span class="node__deps">builds on: ${deps.join(", ")}</span>` : "") +
    (terms ? ` <span class="node__deps">${terms} terms</span>` : "") + `</li>`;
}
function renderGroup(type, ns) {
  return `<section class="g" aria-labelledby="h-${esc(type)}">
  <h2 id="h-${esc(type)}">${esc(type)} <span class="g__n">(${ns.length})</span></h2>
  <ul class="nodes">
${ns.map(renderNode).join("\n")}
  </ul>
</section>`;
}

await mkdir(join(outDir, "components"), { recursive: true });
const sections = [];
const provenance = [];
for (const [type, ns] of groups) {
  const html = renderGroup(type, ns).trim() + "\n";
  const digest = sha(html);
  await writeFile(join(outDir, "components", `${type}.html`), html);
  provenance.push({
    _type: "https://in-toto.io/Statement/v1",
    subject: [{ name: `component/${type}`, digest: { sha256: digest.slice(7) } }],
    predicateType: "https://bounded.tools/synoptic/project/v1",
    predicate: {
      kind: "project", assists: "graph→site", subgraph: type,
      resolvedDependencies: ns.map((n) => ({ uri: n["@id"], digest: { sha256: sha(JSON.stringify(n)).slice(7) } })),
      builder: { id: "https://github.com/bounded-systems/synoptic" },
    },
  });
  sections.push(html);
  console.log(`  ▸ component/${type} — ${ns.length} node(s) · ${digest.slice(0, 19)}…`);
}
const page = `<main class="graph-page">
<h1>Generated from the graph</h1>
${sections.join("\n")}
</main>
`;
await writeFile(join(outDir, "graph-page.html"), page);
await writeFile(join(outDir, "components", "graph-site.provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(`✓ ${outDir}/graph-page.html — ${groups.size} components from ${nodes.length} nodes · ${provenance.length} graph→site attestation(s)`);
