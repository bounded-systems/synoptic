#!/usr/bin/env node
// synoptic inspect — break down ANY part of the site and trace it through the layers.
// The CLI companion to the data-provenance attributes in the rendered UI: given a page,
// a node, or a search string, it shows what it IS, where it CAME FROM (which plugin
// parsed it from which evidence, by digest), what it RESTS ON (edges), and which PAGES
// (queries) include it.
//
//   node inspect.mjs page  <id>            — a page's query + the nodes it selects
//   node inspect.mjs node  <@id | name>    — a node: properties, evidence, deps, pages
//   node inspect.mjs find  <text>          — search names/descriptions/values
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CWD = process.cwd();
const [cmd, ...rest] = process.argv.slice(2);
const target = rest.join(" ");
const rd = (p) => { try { return JSON.parse(readFileSync(join(CWD, p), "utf8")); } catch { return null; } };
const config = rd("synoptic.config.json") ?? {};
const graph = rd("data/graph.json") ?? { "@graph": [] };
const prov = rd("data/graph.provenance.json") ?? [];
const nodes = graph["@graph"] ?? [];
const pages = config.build?.pages ?? [];

const short = (id) => (id ?? "").replace(/^.*#/, "#");
const find = (t) => nodes.find((n) => n["@id"] === t || n.name === t || short(n["@id"]) === t || short(n["@id"]) === "#" + t);
function matches(n, q = {}) {
  if (q.type && ![].concat(n["@type"]).includes(q.type)) return false;
  for (const [k, v] of Object.entries(q.where ?? {})) { const nv = n[k]; if (Array.isArray(nv) ? !nv.includes(v) : nv !== v) return false; }
  if (q.keyword && ![].concat(n.keywords ?? []).includes(q.keyword)) return false;
  return true;
}
// which parse statement produced this node → its evidence
const evidenceOf = (id) => {
  for (const s of prov) if ((s.subject ?? []).some((x) => x.name === id))
    return { plugin: s.predicate.plugin, from: (s.predicate.resolvedDependencies ?? []).map((d) => `${d.uri} (${d.digest.sha256.slice(0, 10)}…)`) };
  return null;
};
const pagesFor = (n) => pages.filter((p) => matches(n, p.query)).map((p) => p.id);
const dependents = (id) => nodes.filter((n) => [].concat(n.buildsOn ?? [], n.worksFor ?? []).some((d) => d["@id"] === id)).map((n) => n.name ?? short(n["@id"]));

if (cmd === "page") {
  const page = pages.find((p) => p.id === target);
  if (!page) { console.log(`no page "${target}". pages: ${pages.map((p) => p.id).join(", ") || "(none declared)"}`); process.exit(1); }
  const matched = nodes.filter((n) => matches(n, page.query));
  console.log(`page/${page.id}  —  a query-bounded scope`);
  console.log(`  query:   ${JSON.stringify(page.query)}`);
  console.log(`  selects: ${matched.length} node(s)\n`);
  for (const n of matched) console.log(`   • ${n.name ?? short(n["@id"])}  [${[].concat(n["@type"])[0]}]  ${short(n["@id"])}`);
  console.log(`\n  → inspect any: node <name>`);
} else if (cmd === "node") {
  const n = find(target);
  if (!n) { console.log(`no node "${target}"`); process.exit(1); }
  console.log(`${n.name ?? short(n["@id"])}   [${[].concat(n["@type"]).join(", ")}]`);
  console.log(`  @id: ${n["@id"]}`);
  for (const [k, v] of Object.entries(n)) if (!["@id", "@type", "name"].includes(k))
    console.log(`  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`.slice(0, 100));
  const ev = evidenceOf(n["@id"]);
  console.log(`\n  ← evidence: ${ev ? `parsed by '${ev.plugin}' from ${ev.from.join(", ")}` : "(none — derived or bridged)"}`);
  const deps = [].concat(n.buildsOn ?? [], n.worksFor ?? []).map((d) => short(d["@id"]));
  if (deps.length) console.log(`  → rests on: ${deps.join(", ")}`);
  const dep = dependents(n["@id"]);
  if (dep.length) console.log(`  ← depended on by: ${dep.join(", ")}`);
  const pg = pagesFor(n);
  console.log(`  ▸ appears on page(s): ${pg.length ? pg.join(", ") : "(no declared page selects it)"}`);
} else if (cmd === "find") {
  const t = target.toLowerCase();
  const hits = nodes.filter((n) => JSON.stringify(n).toLowerCase().includes(t));
  console.log(`${hits.length} node(s) matching "${target}":\n`);
  for (const n of hits.slice(0, 30)) console.log(`   • ${n.name ?? short(n["@id"])}  [${[].concat(n["@type"])[0]}]  → node ${short(n["@id"]).slice(1)}`);
} else {
  console.log("usage: inspect page <id> | node <@id|name> | find <text>");
  process.exit(2);
}
