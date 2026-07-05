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
function renderPage(page, ns, casId) {
  const qDesc = page.query?.type ? `${page.query.type}${page.query.where ? " where " + JSON.stringify(page.query.where) : ""}` : "all";
  // data-cas is the digest of the SOURCE subgraph (the input, stored in /cas), NOT of
  // this HTML — so inlining it is not self-referencing. The element proves "I am the
  // projection of attested CAS artifact <casId>"; anyone refetches /cas/<casId> and
  // re-projects to verify. The OUTPUT html digest lives in the sidecar attestation.
  return `<section class="g" aria-labelledby="h-${esc(page.id)}" data-page="${esc(page.id)}" data-query="${esc(qDesc)}" data-cas="${casId}" data-provenance="/components/graph-site.provenance.json">
  <h2 id="h-${esc(page.id)}">${esc(page.title ?? page.id)} <span class="g__n">(${ns.length})</span></h2>
  <ul class="nodes">
${ns.map(renderNode).join("\n")}
  </ul>
</section>`;
}

// a FULL standalone page (real route), styled from the palette tokens, data-cas inlined.
function fullPage(page, sectionHtml, casId) {
  const vars = palette.map((t) => `${t.name}:${t.value};`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(page.title ?? page.id)} — ${esc(config.site ?? "")}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{${vars}}
body{font-family:var(--font-body,system-ui,sans-serif);color:var(--color-fg,#111);background:var(--color-bg,#fff);max-width:46rem;margin:0 auto;padding:2rem 1rem;line-height:1.5}
.g__n{opacity:.6;font-weight:400}
.nodes{list-style:none;padding:0}
.node{padding:.4rem 0;border-bottom:1px solid var(--color-border,#eee)}
.node__name{font-weight:600}
.node__desc{opacity:.8}
.node__deps{opacity:.6;font-size:.85em}
footer{margin-top:2rem;font-size:.8rem;opacity:.7}
code{font-family:var(--font-mono,ui-monospace,monospace)}
</style>
</head>
<body>
<main>
${sectionHtml}</main>
<footer>Generated from the graph. Every element carries <code>data-cas</code> — the digest of its source artifact in <a href="/cas/${casId.slice(7)}.json"><code>/cas</code></a> — so any part is provably a genuine artifact (<code>synoptic verify-artifact</code>). Data: <a href="/json.ld">/json.ld</a>.</footer>
</body>
</html>
`;
}

await mkdir(join(outDir, "components"), { recursive: true });
await mkdir(join(outDir, "cas"), { recursive: true });
const sections = [], provenance = [];
for (const page of pages) {
  const matched = nodes.filter((n) => matches(n, page.query));
  if (!matched.length) continue;
  // content-address the SOURCE subgraph and store it in /cas. data-cas points here —
  // to the input, not the output — so the proof is not self-referencing. sha256(this
  // file) === casId is a pure fact anyone can recompute; re-projecting it must yield
  // this element.
  const subgraph = JSON.stringify(matched);
  const casId = sha(subgraph);
  await writeFile(join(outDir, "cas", `${casId.slice(7)}.json`), subgraph + "\n");
  const html = renderPage(page, matched, casId).trim() + "\n";
  const digest = sha(html);
  await writeFile(join(outDir, "components", `${page.id}.html`), html);
  // a routed page becomes a REAL page at /<route>/ — the live, graph-projected page
  if (page.route) {
    await mkdir(join(outDir, page.route), { recursive: true });
    await writeFile(join(outDir, page.route, "index.html"), fullPage(page, html, casId));
    console.log(`  ▸▸ /${page.route} — full page from the graph (data-cas inlined, provable)`);
  }
  provenance.push({
    _type: "https://in-toto.io/Statement/v1",
    subject: [{ name: `page/${page.id}`, digest: { sha256: digest.slice(7) } }],
    predicateType: "https://bounded.tools/synoptic/project/v1",
    predicate: {
      kind: "project", assists: "graph→site",
      query: page.query ?? {}, // the SEMANTIC SCOPE — content chosen by kind/property
      casSource: casId, // the input artifact (in /cas) the element's data-cas points to
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
