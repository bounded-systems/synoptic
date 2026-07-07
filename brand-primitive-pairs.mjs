#!/usr/bin/env node
// The primitive atoms have contrast pairs too: every DISTINCT pair of derived colors, with the
// ratio (normal + worst-CVD) and which tiers it clears. Contrast is symmetric, so a pair is
// unordered — keyed by the two CAS names in alphabetical order joined with "<>". Only VALID pairs
// (clears >=3:1 both normally and under deuteranopia/protanopia/tritanopia). The tier a node
// NEEDS comes from the node; this records what each color pair CAN satisfy.
import { canonicalizeTyped } from "/tmp/synoptic/canonicalize.mjs";
const PRIM=["#0C5A42","#073D2C","#E2EBE6","#D2E0D8","#BBD1CA","#58B196","#5F8971","#EDEAE1","#FFFFFF","#16221C","#5C6B63","#888374","#9F3E2B","#F9EDE9","#8C5818","#F3E8D6"];
const hex2rgb=(h)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const toLin=(c)=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;
const lumOf=([r,g,b])=>0.2126*r+0.7152*g+0.0722*b;
const Y=(h)=>lumOf(hex2rgb(h).map(toLin));
const CVD={deut:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],prot:[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],trit:[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]]};
const simY=(h,M)=>lumOf(M.map(r=>{const l=hex2rgb(h).map(toLin);return r[0]*l[0]+r[1]*l[1]+r[2]*l[2];}).map(c=>Math.max(0,Math.min(1,c))));
const ratio=(a,b)=>{const[hi,lo]=a>=b?[a,b]:[b,a];return (hi+0.05)/(lo+0.05);};
const cr=(f,b)=>ratio(Y(f),Y(b));
const crCVD=(f,b)=>Math.min(...Object.values(CVD).map(M=>ratio(simY(f,M),simY(b,M))));
const num=(x)=>String(x).replace(/\./g,"_").replace(/^-/,"neg");
const cas=(h)=>{const t=canonicalizeTyped(h);return `oklch-${num(t.l)}-${num(t.c)}-${num(t.h)}-${num(t.alpha)}`;};

const casOf=Object.fromEntries(PRIM.map(h=>[h,cas(h)]));
const pairs={};
for (let i=0;i<PRIM.length;i++) for (let j=i+1;j<PRIM.length;j++) {
  const a=PRIM[i], b=PRIM[j];
  const n=cr(a,b), v=crCVD(a,b);
  if (n<3 || v<3) continue;                              // not a valid pair (fails 3:1 normally or under CVD)
  const clears=[]; if(n>=3&&v>=3)clears.push("non-text-3"); if(n>=4.5&&v>=4.5)clears.push("text-AA-4.5"); if(n>=7&&v>=7)clears.push("text-AAA-7");
  const key=[casOf[a],casOf[b]].sort().join("<>");
  pairs[key]={ "$type":"color-pair", "$colors":[casOf[a],casOf[b]].sort(), "$ratio":Math.round(n*100)/100, "$cvd":Math.round(v*100)/100, "$clears":clears };
}
const doc={ "primitive-pairs":{ "$description":"Contrast pairs between the derived primitive atoms. Unordered (contrast is symmetric), keyed by the two CAS names alphabetically joined with '<>'. Only valid pairs: >=3:1 both normally and under deuteranopia/protanopia/tritanopia. $clears lists the tiers this color pair CAN satisfy; which tier a given node NEEDS comes from the node.", ...pairs } };
if (process.argv.includes("--json")) { console.log(JSON.stringify(doc,null,2)); process.exit(0); }

const names=Object.keys(pairs);
const aaa=names.filter(n=>pairs[n].$clears.includes("text-AAA-7")), aa=names.filter(n=>pairs[n].$clears.includes("text-AA-4.5")&&!pairs[n].$clears.includes("text-AAA-7")), nt=names.filter(n=>!pairs[n].$clears.includes("text-AA-4.5"));
console.log(`${names.length} valid color pairs from ${PRIM.length} atoms (of ${PRIM.length*(PRIM.length-1)/2} candidates), all CVD-safe:\n`);
console.log(`  clears TEXT AAA (7:1): ${aaa.length}`);
console.log(`  clears TEXT AA (4.5:1) but not AAA: ${aa.length}`);
console.log(`  clears NON-TEXT only (3:1): ${nt.length}\n  e.g.:`);
for(const k of names.slice(0,4)) console.log("      "+k+"   "+pairs[k].$ratio+":1 (CVD "+pairs[k].$cvd+")  "+pairs[k].$clears.join(", "));
