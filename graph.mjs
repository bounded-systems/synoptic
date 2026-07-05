#!/usr/bin/env node
// synoptic graph — the normalized place. Runs the site's DECLARED plugins (each parses
// its slice of the site into JSON-LD nodes) and merges them into one graph at
// dist/json.ld, with cross-site BRIDGE links. Core does normalization + merge + bridge;
// plugins do the parsing. Same core every site; site-specifics are plugins in config.
//
//   node graph.mjs [--out dist/json.ld]
//
// config.graph: { id, plugins: ["org","packages",...], bridge: [{predicate, id}] }
// A plugin is plugins/<name>.mjs OR the engine's own, exporting:
//   parse(ctx) -> node[]     ctx = { read, readMaybe, site, base, esc }
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ENGINE = dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
const argv = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
// graph is BEFORE the site: it's the normalized source the site projects from, so it
// lands in the repo (data/graph.json) by default, not the build output. --out overrides.
const outArg = argv("--out") ?? "data/graph.json";
const out = outArg.startsWith("/") ? outArg : join(CWD, outArg);

const config = JSON.parse(readFileSync(join(CWD, "synoptic.config.json"), "utf8"));
const g = config.graph ?? {};
const base = (g.id ? g.id.replace(/#.*$/, "") : `https://${config.site}`).replace(/\/$/, "");
const ctx = {
  read: (rel) => JSON.parse(readFileSync(join(CWD, rel), "utf8")),
  readMaybe: (rel) => { try { return ctx.read(rel); } catch { return null; } },
  site: config.site,
  base,
  esc: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
};

// resolve a plugin: the site's ./plugins/<n>.mjs wins, else the engine's.
async function load(name) {
  const local = join(CWD, "plugins", `${name}.mjs`);
  const bundled = join(ENGINE, "plugins", `${name}.mjs`);
  const p = existsSync(local) ? local : bundled;
  if (!existsSync(p)) throw new Error(`no plugin "${name}" (looked in ./plugins and the engine)`);
  return import(pathToFileURL(p).href);
}

const nodes = [];
for (const name of g.plugins ?? []) {
  const mod = await load(name);
  const produced = (await mod.parse(ctx)) ?? [];
  nodes.push(...produced);
  console.log(`  + ${name}: ${produced.length} node(s)`);
}

// BRIDGE: link the root node to other sites' @ids (the LD in JSON-LD).
const rootId = g.id ?? `${base}/#root`;
const root = nodes.find((n) => n["@id"] === rootId);
for (const b of g.bridge ?? []) {
  if (!root) break;
  const pred = b.predicate ?? "sameAs";
  (root[pred] ??= []).push({ "@id": b.id });
}

const doc = {
  "@context": ["https://schema.org", { buildsOn: { "@id": `${base}/#buildsOn`, "@type": "@id" } }],
  "@graph": nodes,
};
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(doc, null, 2) + "\n");
console.log(`✓ ${out} — ${nodes.length} node(s) from ${(g.plugins ?? []).length} plugin(s)${g.bridge?.length ? `, bridged to ${g.bridge.length} site(s)` : ""}`);
