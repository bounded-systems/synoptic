#!/usr/bin/env node
// gen-prose-corpus — build the prose corpora the markdown-layer gates read, from
// the CONSUMING site (cwd). Sources are config-driven so no site's layout is
// baked in: read layers.markdown.source from synoptic.config.json —
//   { pages: ["index.html","404.html"], docsDir: "blog" | "posts", docsGlob: ".md" }
// Emits prose-corpus.json (pages + docs, for word-choice gates) and
// doc-corpus.json (composed docs only, for doc-scope). Defaults suit a typical site.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd(); // the consuming site, not the engine
const stripHtml = (s) => s.replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
const stripMd = (s) => s.replace(/^---[\s\S]*?---/, "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/[#>*_\[\]()!|-]/g, " ");

let src = {};
try {
  const cfg = JSON.parse(await readFile(join(ROOT, "synoptic.config.json"), "utf8"));
  src = cfg.layers?.markdown?.source ?? {};
} catch {}
const pages = src.pages ?? ["index.html", "404.html"];
const docsDirs = [].concat(src.docsDir ?? ["blog", "posts"]);
const docsExt = src.docsGlob ?? ".md";

const pageCorpus = {}, docs = {};
for (const f of pages) {
  if (existsSync(join(ROOT, f))) pageCorpus[f] = stripHtml(await readFile(join(ROOT, f), "utf8"));
}
for (const dir of docsDirs) {
  if (!existsSync(join(ROOT, dir))) continue;
  for (const f of await readdir(join(ROOT, dir))) {
    if (f.endsWith(docsExt)) docs[`${dir}/${f}`] = stripMd(await readFile(join(ROOT, dir, f), "utf8"));
  }
}
await writeFile(join(ROOT, "prose-corpus.json"), JSON.stringify({ ...pageCorpus, ...docs }, null, 2) + "\n");
await writeFile(join(ROOT, "doc-corpus.json"), JSON.stringify(docs, null, 2) + "\n");
console.log(`✓ prose-corpus.json (${Object.keys(pageCorpus).length + Object.keys(docs).length}) · doc-corpus.json (${Object.keys(docs).length} composed docs)`);
