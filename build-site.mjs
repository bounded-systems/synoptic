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

// the Markdown projection — same graph, same source digest, rendered as .md. data-cas
// rides in an HTML comment (valid Markdown) so the .md is provable the same way.
function renderNodeMd(n) {
  const deps = (n.buildsOn ?? n.worksFor ?? []).map((d) => short(d["@id"]));
  return `- **${n.name ?? short(n["@id"])}**${n.description ? " — " + n.description : ""}${deps.length ? ` _(→ ${deps.join(", ")})_` : ""}`;
}
function renderSectionMd(sec, ns, casId) {
  return `## ${sec.title ?? sec.id ?? "Section"}\n\n<!-- data-cas: ${casId} — /cas/${casId.slice(7)}.json -->\n\n${ns.map(renderNodeMd).join("\n")}\n`;
}

// a FULL standalone page (real route), styled from the palette tokens, data-cas inlined.
// The projection references tokens SEMANTICALLY via config.build.theme (role → the
// site's own token name), so it's not over-fit — each site maps its palette to roles.
function fullPage(page, sectionHtml, casId) {
  const vars = palette.map((t) => `${t.name}:${t.value};`).join("");
  const th = config.build?.theme ?? {};
  const v = (role, fb) => (th[role] ? `var(${th[role]},${fb})` : fb);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(page.title ?? page.id)} — ${esc(config.site ?? "")}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{${vars}}
body{font-family:${v("font", "system-ui,sans-serif")};color:${v("text", "#111")};background:${v("surface", "#fff")};max-width:46rem;margin:0 auto;padding:2rem 1rem;line-height:1.6}
h1,h2{color:${v("accent", "inherit")}}
.g__n{opacity:.6;font-weight:400}
.nodes{list-style:none;padding:0}
.node{padding:.5rem 0;border-bottom:1px solid ${v("border", "#e5e5e5")}}
.node__name{font-weight:600}
.node__desc{opacity:.85}
.node__deps{opacity:.6;font-size:.85em}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid ${v("border", "#e5e5e5")};font-size:.8rem;opacity:.75}
a{color:${v("accent", "inherit")}}
code{font-family:${v("mono", "ui-monospace,monospace")};font-size:.9em}
</style>
</head>
<body>
<main data-page-root="${casId}">
${sectionHtml}</main>
<footer>Generated from the graph. Every element carries <code>data-cas</code> — the digest of its source artifact in <a href="/cas/${casId.slice(7)}.json"><code>/cas</code></a> — so any part is provably a genuine artifact (<code>synoptic verify-artifact</code>). Data: <a href="/json.ld">/json.ld</a>.</footer>
</body>
</html>
`;
}

// Merkle root over a list of digests (pairwise, duplicate last if odd) — the same
// construction as the org root (Merkle.lean). A page is the root of its sections; the
// site is the root of its pages; a digest at the top commits the whole tree.
function merkleRoot(hashes) {
  if (hashes.length === 0) return sha("");
  let level = hashes.map((h) => (h.startsWith("sha256:") ? h : "sha256:" + h));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(sha(level[i] + (level[i + 1] ?? level[i])));
    level = next;
  }
  return level[0];
}

await mkdir(join(outDir, "components"), { recursive: true });
await mkdir(join(outDir, "cas"), { recursive: true });
const sections = [], provenance = [], leaves = [];
// build ONE section: content-address its source subgraph in /cas (data-cas points to
// the input, not the output → not self-referencing), render it.
async function buildSection(sec) {
  const matched = nodes.filter((n) => matches(n, sec.query));
  const subgraph = JSON.stringify(matched);
  const casId = sha(subgraph);
  await writeFile(join(outDir, "cas", `${casId.slice(7)}.json`), subgraph + "\n");
  const html = renderPage({ id: sec.id ?? sec.title ?? "section", title: sec.title, query: sec.query }, matched, casId).trim() + "\n";
  const md = renderSectionMd(sec, matched, casId);
  return { html, md, casId, matched, query: sec.query ?? {} };
}

for (const page of pages) {
  const secs = page.sections ?? [{ id: page.id, title: page.title, query: page.query }];
  const built = [];
  for (const sec of secs) { const b = await buildSection(sec); if (b.matched.length) built.push(b); }
  if (!built.length) continue;
  const pageHtml = built.map((b) => b.html).join("\n");
  // a page is the Merkle root of its sections; each section a leaf (its source digest)
  const pageRoot = merkleRoot(built.map((b) => b.casId));
  await writeFile(join(outDir, "components", `${page.id}.html`), pageHtml);
  // route "" → index.html (the home, fully projected); "corpus" → /corpus/. No hand-
  // authored HTML: the routed page IS the projection.
  if (page.route !== undefined) {
    const dir = page.route === "" ? outDir : join(outDir, page.route);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), fullPage(page, pageHtml, pageRoot));
    // the Markdown projection sibling — same content, same source digests, provable
    const pageMd = `# ${page.title ?? page.id}\n\n${built.map((b) => b.md).join("\n")}\n\n---\nGenerated from the graph · page root \`${pageRoot}\` · every item traces to \`/cas\` (verify: \`synoptic verify-artifact\`) · data: [/json.ld](/json.ld)\n`;
    await writeFile(join(dir, "index.md"), pageMd);
    console.log(`  ▸▸ ${page.route === "" ? "index.html" : "/" + page.route} — ${built.length} section(s), html + md, page root ${pageRoot.slice(0, 16)}…`);
  }
  provenance.push({
    _type: "https://in-toto.io/Statement/v1",
    subject: [{ name: `page/${page.id}`, digest: { sha256: pageRoot.slice(7) } }],
    predicateType: "https://bounded.tools/synoptic/project/v1",
    predicate: {
      kind: "project", assists: "graph→site",
      pageRoot, // Merkle root of the page's section artifacts
      sections: built.map((b) => ({ query: b.query, casSource: b.casId })),
      designMaterials: designDeps,
      builder: { id: "https://github.com/bounded-systems/synoptic" },
    },
  });
  sections.push(pageHtml);
  leaves.push({ page: page.id, route: page.route ?? null, cas: pageRoot }); // a Merkle leaf
}
await writeFile(join(outDir, "graph-page.html"), `<main class="graph-page">\n<h1>Generated from the graph, by query</h1>\n${sections.join("\n")}\n</main>\n`);
await writeFile(join(outDir, "components", "graph-site.provenance.json"), JSON.stringify(provenance, null, 2) + "\n");

// the SITE Merkle root — over the pages (each a leaf = its source-subgraph digest). The
// site is a Merkle tree: element (data-cas) → page → site. This root commits the WHOLE
// projected site; no hand-authored HTML sits outside it.
const siteRoot = merkleRoot(leaves.map((l) => l.cas));
await writeFile(join(outDir, "site.merkle.json"), JSON.stringify({ root: siteRoot, leaves }, null, 2) + "\n");
console.log(`✓ ${outDir}/graph-page.html — ${provenance.length} page(s), each a query-bounded scope`);
console.log(`✓ ${outDir}/site.merkle.json — site is a Merkle tree · root ${siteRoot.slice(0, 22)}…`);
