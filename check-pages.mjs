#!/usr/bin/env node
// synoptic check-pages — verify every page in a sitemap is reachable (HTTP 200).
// Reads sitemap.xml as a file path OR a URL, extracts <loc>, fetches each, reports.
// Catches deploy-time gaps: a page listed but 404 (e.g. /who was never promoted).
//   node check-pages.mjs <sitemap.xml | https://site/sitemap.xml>
import { readFileSync } from "node:fs";
const src = process.argv[2];
if (!src) { console.error("usage: check-pages <sitemap.xml | url>"); process.exit(2); }
const xml = src.startsWith("http") ? await (await fetch(src)).text() : readFileSync(src, "utf8");
// parse each <url> for its loc AND our synoptic:root extension (the declared page root).
const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1],
  root: /<synoptic:root>(sha256:[a-f0-9]+)<\/synoptic:root>/.exec(m[1])?.[1],
})).filter((u) => u.loc);
if (!urls.length) { console.error("no <loc> URLs in sitemap"); process.exit(2); }
let bad = 0;
for (const { loc, root } of urls) {
  try {
    const r = await fetch(loc, { method: "GET", redirect: "manual" });
    if (!(r.status >= 200 && r.status < 400)) { bad++; console.log(`  ✗ ${r.status} ${loc}`); continue; }
    if (!root) { console.log(`  ✓ ${r.status} ${loc}`); continue; }
    // MANIFEST CHECK: the served page must carry the declared Merkle root.
    const served = /data-page-root="(sha256:[a-f0-9]+)"/.exec(await r.text())?.[1];
    if (served === root) console.log(`  ✓ ${r.status} ${loc}  · root ${root.slice(0, 18)}… matches`);
    else { bad++; console.log(`  ✗ ${r.status} ${loc}  · root MISMATCH (served ${served ? served.slice(0, 18) + "…" : "none"} ≠ declared ${root.slice(0, 18)}…)`); }
  } catch (e) { bad++; console.log(`  ✗ ERR ${loc} — ${e.message}`); }
}
console.log(`${bad ? "❌" : "✓"} check-pages: ${urls.length - bad}/${urls.length} verified (reachable${urls.some((u) => u.root) ? " + root-matched" : ""})`);
process.exit(bad ? 1 : 0);
