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

function renderNode(b) {
  const { n, strings, nodeRoot } = b;
  const deps = (n.buildsOn ?? n.worksFor ?? []).map((d) => esc(short(d["@id"]))); // edges unrolled
  // the LEAVES are the STRINGS: each string field carries its own data-cas (a file in
  // /cas). The node carries data-node-root (Merkle of its string leaves). Edit the
  // description → only that string leaf moves; the name, the siblings, all byte-identical.
  return `      <li class="node" data-node-root="${nodeRoot}">` +
    `<span class="node__name" data-cas="${strings.name ?? nodeRoot}">${esc(n.name ?? n["@id"])}</span>` +
    (n.description ? ` <span class="node__desc" data-cas="${strings.description ?? ""}">${esc(n.description)}</span>` : "") +
    (deps.length ? ` <span class="node__deps">→ ${deps.join(", ")}</span>` : "") + `</li>`;
}
function renderPage(page, built, casId) {
  // hero: the identity node's STRINGS are the leaves (name on h1, description on lede),
  // each with its own data-cas; the section root rides data-section-root.
  if (page.render === "hero") {
    const b = built[0] ?? { n: {}, strings: {} };
    const n = b.n;
    return `<header class="hero" data-page="${esc(page.id)}" data-section-root="${casId}" data-provenance="/components/graph-site.provenance.json">
  <h1 data-cas="${b.strings.name ?? ""}">${esc(n.name ?? page.title ?? page.id)}</h1>${n.description ? `\n  <p class="lede" data-cas="${b.strings.description ?? ""}">${esc(n.description)}</p>` : ""}
</header>`;
  }
  const qDesc = page.query?.type ? `${page.query.type}${page.query.where ? " where " + JSON.stringify(page.query.where) : ""}` : "all";
  // strings are the leaves (each has data-cas); the node carries data-node-root (Merkle
  // of its string leaves); the section carries data-section-root. Editing one string
  // moves one leaf + the roots on its path — nothing else.
  return `<section class="g" aria-labelledby="h-${esc(page.id)}" data-page="${esc(page.id)}" data-query="${esc(qDesc)}" data-section-root="${casId}" data-provenance="/components/graph-site.provenance.json">
  <h2 id="h-${esc(page.id)}">${esc(page.title ?? page.id)} <span class="g__n">(${built.length})</span></h2>
  <ul class="nodes">
${built.map(renderNode).join("\n")}
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
*{box-sizing:border-box}
body{font-family:${v("font", "system-ui,sans-serif")};color:${v("text", "#111")};background:${v("surface", "#fff")};max-width:44rem;margin:0 auto;padding:3rem 1.25rem;line-height:1.6}
.hero{margin:0 0 3rem}
.hero h1{font-size:clamp(2rem,6vw,3rem);line-height:1.1;margin:0 0 .5rem;color:${v("accent", "inherit")}}
.lede{font-size:1.15rem;opacity:.85;margin:0;max-width:36rem}
h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin:2.75rem 0 .75rem;font-weight:600}
.g__n{opacity:.5;font-weight:400}
.nodes{list-style:none;padding:0;margin:0}
.node{padding:.65rem 0;border-bottom:1px solid ${v("border", "#e5e5e5")}}
.node__name{font-weight:600}
.node__desc{opacity:.85}
.node__deps{display:block;opacity:.55;font-size:.8em;margin-top:.15rem}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid ${v("border", "#e5e5e5")};font-size:.78rem;opacity:.7;line-height:1.5}
a{color:${v("accent", "inherit")}}
code{font-family:${v("mono", "ui-monospace,monospace")};font-size:.85em}
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
const sections = [], provenance = [], leaves = [], routes = [];
// content-address one value (a string / token) as a LEAF, stored in /cas.
async function leafOf(value) {
  const s = JSON.stringify(value);
  const c = sha(s);
  await writeFile(join(outDir, "cas", `${c.slice(7)}.json`), s + "\n");
  return c;
}
// a node's leaves are its STRING fields; the node is their Merkle root.
async function buildNode(n) {
  const strings = {};
  for (const f of ["name", "description", "tagline"]) if (n[f] != null && n[f] !== "") strings[f] = await leafOf(n[f]);
  const nodeRoot = merkleRoot(Object.values(strings));
  return { n, strings, nodeRoot };
}
// a section is the Merkle root of its node roots (which are Merkle roots of string leaves).
async function buildSection(sec) {
  const matched = nodes.filter((n) => matches(n, sec.query));
  const built = [];
  for (const n of matched) built.push(await buildNode(n));
  const casId = merkleRoot(built.map((b) => b.nodeRoot));
  const html = renderPage({ id: sec.id ?? sec.title ?? "section", title: sec.title, query: sec.query, render: sec.render }, built, casId).trim() + "\n";
  const md = renderSectionMd(sec, matched, casId);
  return { html, md, casId, matched, built, query: sec.query ?? {} };
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
    routes.push(page.route); // for the sitemap + page-check
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

// ALWAYS emit a sitemap of every routed page, and CHECK each one exists — so every page
// is enumerable and verifiable (no silent 404s like /who ever again).
const siteBase = (config.graph?.id ? config.graph.id.replace(/#.*$/, "") : `https://${config.site}`).replace(/\/$/, "");
const urls = routes.map((r) => `${siteBase}/${r ? r + "/" : ""}`);
await writeFile(join(outDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile(join(outDir, "sitemap.json"),
  JSON.stringify({ site: config.site, pages: routes.map((r, i) => ({ route: r, url: urls[i] })) }, null, 2) + "\n");
let missing = 0;
for (const r of routes) {
  const f = join(r === "" ? outDir : join(outDir, r), "index.html");
  try { if ((await readFile(f, "utf8")).trim().length === 0) throw new Error("empty"); }
  catch { missing++; console.log(`  ✗ page ${r === "" ? "/" : "/" + r + "/"} missing or empty`); }
}
console.log(`✓ ${outDir}/sitemap.xml — ${routes.length} page(s) listed${missing ? `; ❌ ${missing} MISSING` : ", all present + non-empty"}`);
if (missing) process.exit(1);
