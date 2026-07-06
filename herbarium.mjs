#!/usr/bin/env node
// herbarium — the two-primitive CAS + claim store (Perkeep with proofs).
//   Atom  = content-addressed bytes.        put(value) -> address
//   Claim = a typed assertion about an address, carrying a proofType. A claim is itself
//           an atom (serialize -> hash -> store), so claims can be about claims.
// Enforces the discipline from spec/claim.schema.json — only axioms are signed; every
// derived claim cites a basis. Resolution semantics kernel-verified in proof/Claims.lean.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const CAS = process.env.CAS_DIR || join(process.cwd(), "cas");
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");
const isAddr = (s) => typeof s === "string" && /^sha256:[a-f0-9]{64}$/.test(s);
const PREDICATES = ["is-a", "role", "alias-of", "member-of", "derived-from", "composed-of", "signs", "supersedes", "deprecated"];
const DERIVING = new Set(["alias-of", "derived-from", "composed-of", "signs", "supersedes"]);
const PROOFS = ["axiom", "grounded", "derivable", "proven"];

function store(obj) {
  const s = JSON.stringify(obj);
  const addr = sha(s);
  mkdirSync(CAS, { recursive: true });
  writeFileSync(join(CAS, addr.slice(7) + ".json"), s + "\n");
  return addr;
}
export const resolve = (addr) => JSON.parse(readFileSync(join(CAS, addr.slice(7) + ".json"), "utf8"));

// an ATOM: a raw value → its address.
export const put = (value) => store({ value });

// a CLAIM about a subject → its address. Enforces the discipline (the schema, in code).
export function claim(subject, predicate, object, proofType, opts = {}) {
  if (!isAddr(subject)) throw new Error("subject must be an address");
  if (!PREDICATES.includes(predicate)) throw new Error("unknown predicate: " + predicate);
  if (!PROOFS.includes(proofType)) throw new Error("unknown proofType: " + proofType);
  const c = { subject, predicate, object, proofType };
  if (proofType === "axiom") {
    if (!opts.signer) throw new Error("axiom MUST be signed (sign only axioms)");
    c.signer = opts.signer;
  } else {
    if (opts.signer) throw new Error("non-axiom MUST NOT be signed (sign only axioms)");
    if (opts.basis == null) throw new Error(`${proofType} claim MUST cite a basis`);
    c.basis = opts.basis;
  }
  return store(c);
}

// the axiom atoms a claim rests on — mirrors proof/Claims.lean `base`. Rejects cycles
// (DTCG: MUST detect circular references), and every claim grounds in ≥1 axiom.
export function base(addr, seen = new Set()) {
  if (seen.has(addr)) throw new Error("cycle detected at " + addr.slice(0, 16));
  seen.add(addr);
  const o = resolve(addr);
  if (!o.predicate) return [addr];                 // an atom is its own axiom
  if (o.proofType === "axiom") return [addr];       // an axiom claim is a base
  if (DERIVING.has(o.predicate) && isAddr(o.object)) return base(o.object, seen);
  return base(o.subject, seen);
}
