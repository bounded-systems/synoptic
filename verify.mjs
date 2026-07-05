#!/usr/bin/env node
// synoptic verify — check the checks. For each signed check attestation, run
// `cosign verify-blob` against the EXPECTED signer identity (the site's synoptic
// workflow, via GitHub Actions OIDC) and issuer. A consumer — the Trust Center,
// the site itself, anyone — can thus confirm a check's verdict was signed by the
// real CI workflow and logged to Rekor, not forged. A signature nobody verifies
// is theater; this is the counterpart that closes the loop.
//
//   node verify.mjs <attestDir> --identity <regexp> [--issuer <url>]
//
// --identity is the certificate SAN to require, e.g. the workflow path:
//   https://github.com/bounded-systems/site/.github/workflows/synoptic.yml@refs/heads/main
// (a regexp, so a ref pattern is fine). --issuer defaults to GitHub Actions OIDC.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const argv = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
const identity = argv("--identity") ?? process.env.SYNOPTIC_SIGNER_IDENTITY;
const issuer = argv("--issuer") ?? "https://token.actions.githubusercontent.com";
if (!dir || !identity) {
  console.error("usage: verify <attestDir> --identity <regexp> [--issuer <url>]");
  process.exit(2);
}
if (!spawnSync("cosign", ["version"], { encoding: "utf8" }).stdout) {
  console.error("✗ cosign not found — install sigstore/cosign to verify");
  process.exit(2);
}

const stmts = readdirSync(dir).filter((f) => f.endsWith(".intoto.json"));
if (stmts.length === 0) { console.error(`✗ no .intoto.json statements in ${dir}`); process.exit(2); }

let ok = 0, bad = 0;
console.log(`synoptic verify — ${stmts.length} check attestation(s)\n  identity: ${identity}\n  issuer:   ${issuer}\n`);
for (const s of stmts.sort()) {
  const bundle = join(dir, `${s}.sigstore.json`);
  if (!existsSync(bundle)) { console.log(`⚠ ${s}: no signature bundle`); bad++; continue; }
  const res = spawnSync("cosign", [
    "verify-blob",
    "--bundle", bundle,
    "--certificate-identity-regexp", identity,
    "--certificate-oidc-issuer", issuer,
    join(dir, s),
  ], { encoding: "utf8" });
  const good = res.status === 0;
  good ? ok++ : bad++;
  console.log(`${good ? "✅" : "❌"} ${s.replace(".intoto.json", "")}`);
  if (!good) console.log((res.stderr || res.stdout || "").trim().split("\n").map((l) => "     " + l).join("\n"));
}
console.log(`\n${ok}/${stmts.length} check attestation(s) verify — signed by the expected CI identity, Rekor-logged.`);
process.exit(bad ? 1 : 0);
