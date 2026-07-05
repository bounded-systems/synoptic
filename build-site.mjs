#!/usr/bin/env node
// synoptic build-site — project the site FROM the graph (the top clean end). Each
// PAGE is a QUERY over the graph — content chosen by @type / property / keyword, NEVER
// by id. That makes a page a bounded, semantic, cognitive scope: "everything that IS
// this kind" rather than a hand-picked list that rots when ids change. Renders each
// matched subgraph as native HTML with edges unrolled, and a graph→site attestation
// recording the QUERY (the selector) + the matched nodes (content) + the palette tokens
// (design). Every element carries data-provenance.
//
//   node build-site.mjs [--graph data/graph.json] [--out dist]
//
// config.build.pages: [{ id, title, query: { type?, where?: {prop:val}, keyword? } }]
// Default (no pages declared): one page per @type.
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

const config = JSON.parse(await readFile(join(CWD, "synoptic.config.json"), "utf8"));
const graph = JSON.parse(await readFile(join(CWD, graphPath), "utf8"));
const nodes = graph["@graph"] ?? [];
const byId = new Map(nodes.map((n) => [n["@id"], n]));
const short = (id) => (byId.get(id)?.name) ?? id.replace(/^.*#/, "#");
const palette = nodes.filter((n) => [].concat(n["@type"])[0] === "PropertyValue" && n.isPartOf?.["@id"]?.endsWith("#palette"));
const designDeps = palette.map((t) => ({ uri: t["@id"], digest: { sha256: sha(JSON.stringify(t)).slice(7) } }));

// a QUERY selects by KIND and PROPERTY — never by id. This is the semantic scope.
function matches(n, q = {}) {
  if (q.type && ![].concat(n["@type"]).includes(q.type)) return false;
  for (const [k, v] of Object.entries(q.where ?? {})) {
    const nv = n[k];
    if (Array.isArray(nv) ? !nv.includes(v) : nv !== v) return false;
  }
  if (q.keyword && ![].concat(n.keywords ?? []).includes(q.keyword)) return false;
  return true;
}

// pages: declared queries, else one per @type (still a query, not an id list)
const pages = config.build?.pages
  ?? [...new Set(nodes.map((n) => [].concat(n["@type"])[0]).filter(Boolean))]
       .map((t) => ({ id: t, title: t, query: { type: t } }));

function renderNode(n) {
  const deps = (n.buildsOn ?? n.worksFor ?? []).map((d) => esc(short(d["@id"]))); // edges unrolled
  return `      <li class="node"><span class="node__name">${esc(n.name ?? n["@id"])}</span>` +
    (n.description ? ` <span class="node__desc">${esc(n.description)}</span>` : "") +
    (deps.length ? ` <span class="node__deps">→ ${deps.join(", ")}</span>` : "") + `</li>`;
}
function renderPage(page, ns) {
  const qDesc = page.query?.type ? `${page.query.type}${page.query.where ? " where " + JSON.stringify(page.query.where) : ""}` : "all";
  return `<section class="g" aria-labelledby="h-${esc(page.id)}" data-page="${esc(page.id)}" data-query="${esc(qDesc)}" data-provenance="/components/graph-site.provenance.json">
  <h2 id="h-${esc(page.id)}">${esc(page.title ?? page.id)} <span class="g__n">(${ns.length})</span></h2>
  <ul class="nodes">
${ns.map(renderNode).join("\n")}
  </ul>
</section>`;
}

await mkdir(join(outDir, "components"), { recursive: true });
const sections = [], provenance = [];
for (const page of pages) {
  const matched = nodes.filter((n) => matches(n, page.query));
  if (!matched.length) continue;
  const html = renderPage(page, matched).trim() + "\n";
  const digest = sha(html);
  await writeFile(join(outDir, "components", `${page.id}.html`), html);
  provenance.push({
    _type: "https://in-toto.io/Statement/v1",
    subject: [{ name: `page/${page.id}`, digest: { sha256: digest.slice(7) } }],
    predicateType: "https://bounded.tools/synoptic/project/v1",
    predicate: {
      kind: "project", assists: "graph→site",
      query: page.query ?? {}, // the SEMANTIC SCOPE — content chosen by kind/property
      resolvedDependencies: matched.map((n) => ({ uri: n["@id"], digest: { sha256: sha(JSON.stringify(n)).slice(7) } })),
      designMaterials: designDeps,
      builder: { id: "https://github.com/bounded-systems/synoptic" },
    },
  });
  sections.push(html);
  console.log(`  ▸ page/${page.id} — query {${JSON.stringify(page.query ?? {})}} → ${matched.length} node(s) · ${digest.slice(0, 19)}…`);
}
await writeFile(join(outDir, "graph-page.html"), `<main class="graph-page">\n<h1>Generated from the graph, by query</h1>\n${sections.join("\n")}\n</main>\n`);
await writeFile(join(outDir, "components", "graph-site.provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(`✓ ${outDir}/graph-page.html — ${provenance.length} page(s), each a query-bounded scope`);
