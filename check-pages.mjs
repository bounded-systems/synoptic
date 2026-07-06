#!/usr/bin/env node
// synoptic check-pages — verify every page in a sitemap is reachable (HTTP 200).
// Reads sitemap.xml as a file path OR a URL, extracts <loc>, fetches each, reports.
// Catches deploy-time gaps: a page listed but 404 (e.g. /who was never promoted).
//   node check-pages.mjs <sitemap.xml | https://site/sitemap.xml>
import { readFileSync } from "node:fs";
const src = process.argv[2];
if (!src) { console.error("usage: check-pages <sitemap.xml | url>"); process.exit(2); }
const xml = src.startsWith("http") ? await (await fetch(src)).text() : readFileSync(src, "utf8");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!locs.length) { console.error("no <loc> URLs in sitemap"); process.exit(2); }
let bad = 0;
for (const url of locs) {
  try {
    const r = await fetch(url, { method: "GET", redirect: "manual" });
    if (r.status >= 200 && r.status < 400) console.log(`  ✓ ${r.status} ${url}`);
    else { bad++; console.log(`  ✗ ${r.status} ${url}`); }
  } catch (e) { bad++; console.log(`  ✗ ERR ${url} — ${e.message}`); }
}
console.log(`${bad ? "❌" : "✓"} check-pages: ${locs.length - bad}/${locs.length} reachable`);
process.exit(bad ? 1 : 0);
