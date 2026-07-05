#!/usr/bin/env node
// synoptic secret-scan — rudimentary secret scanning on the PROJECTION before it ships.
// The graph→site projection is PUBLIC; this fails the build if a secret pattern appears
// in the generated files (json.ld, pages, SBOM, components). Rudimentary + honest: a
// keyword/regex PROXY, not a vault — it catches the obvious leak (a pasted key), not a
// determined one. Skips content-addressed digests (those are provenance, not secrets).
//
//   node secret-scan.mjs <dir> [--allow email]
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: secret-scan <dir> [--allow <kind>]"); process.exit(2); }
const allow = new Set(process.argv.slice(3).filter((_, i, a) => a[i - 1] === "--allow"));

const PATTERNS = [
  { kind: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { kind: "aws-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { kind: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { kind: "google-key", re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { kind: "jwt", re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { kind: "bearer", re: /\bBearer\s+[A-Za-z0-9._\-]{20,}/ },
  { kind: "assigned-secret", re: /["']?(?:api[_-]?key|secret|password|passwd|token|access[_-]?key)["']?\s*[:=]\s*["'][A-Za-z0-9_\-\/+]{16,}["']/i },
  { kind: "pii-email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];
// content-addressed digests (bare hex, sha256:…) are provenance, not secrets — but we
// never skip a whole LINE (a secret can share a line with a digest). Instead redact the
// digest substrings, then scan what remains.
const redactDigests = (l) => l.replace(/sha256:[a-f0-9]{16,}/gi, "").replace(/\b[a-f0-9]{40,}\b/gi, "");

async function walk(d, out) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".git") await walk(p, out); }
    else if (/\.(html|json|jsonld|ld|txt|xml|svg|css|js|md|spdx)$/i.test(e.name)) out.push(p);
  }
}

const files = [];
await walk(dir, files);
const findings = [];
for (const f of files) {
  const lines = (await readFile(f, "utf8")).split("\n");
  lines.forEach((rawLine, i) => {
    const line = redactDigests(rawLine);
    for (const p of PATTERNS) {
      if (allow.has(p.kind.replace("pii-", ""))) continue;
      const m = p.re.exec(line);
      if (m) findings.push({ file: f.replace(dir + "/", ""), line: i + 1, kind: p.kind, hit: m[0].slice(0, 24) });
    }
  });
}

if (findings.length === 0) {
  console.log(`✓ secret-scan: ${files.length} projection file(s) clean`);
  process.exit(0);
}
console.log(`❌ secret-scan: ${findings.length} potential secret(s) in the projection — NOT publishable\n`);
for (const f of findings.slice(0, 20)) console.log(`  ${f.kind}  ${f.file}:${f.line}  ${f.hit}…`);
console.log(`\n(rudimentary proxy — review each; --allow email to permit intentional contact addresses)`);
process.exit(1);
