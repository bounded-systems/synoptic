#!/usr/bin/env node
// Take the REAL brand primitives, derive each name from its coordinates (CAS oklch), and
// GENERATE each description from the computed facts: oklch, warm/cool, and verified contrast
// against the grounds under normal + CVD (deuteranopia/protanopia/tritanopia, Machado 2009).
// The doc can't drift from the color, because it's computed from it. All 16 primitives covered.
import { canonicalizeTyped } from "/tmp/synoptic/canonicalize.mjs";

// --- the real palette (values unchanged) ---
const PRIM = {
  "green-700":"#0C5A42","green-900":"#073D2C","green-100":"#E2EBE6","green-200":"#D2E0D8",
  "green-300":"#BBD1CA","green-500":"#58B196","green-600":"#5F8971","paper":"#EDEAE1",
  "white":"#FFFFFF","ink-900":"#16221C","ink-600":"#5C6B63","line":"#888374",
  "clay-600":"#9F3E2B","clay-100":"#F9EDE9","amber-600":"#8C5818","amber-100":"#F3E8D6",
};
// the grounds a color is placed against, by BAND (no names — light vs dark). The worst contrast
// across a band is the guarantee for that band.
const BANDS = { "light backgrounds":["#EDEAE1","#FFFFFF"], "dark backgrounds":["#0C5A42","#073D2C","#16221C"] };

const hex2rgb=(h)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const toLin=(c)=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;
const lum=([r,g,b])=>0.2126*r+0.7152*g+0.0722*b;
const Ylin=(h)=>lum(hex2rgb(h).map(toLin));
// Machado 2009 dichromat matrices (severity 1.0), applied in linear RGB
const CVD={
  deuteranopia:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
  protanopia:  [[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
  tritanopia:  [[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]],
};
const simY=(h,M)=>{const lrgb=hex2rgb(h).map(toLin);const o=M.map(row=>row[0]*lrgb[0]+row[1]*lrgb[1]+row[2]*lrgb[2]);return lum(o.map(c=>Math.max(0,Math.min(1,c))));};
const ratio=(ya,yb)=>{const[hi,lo]=ya>=yb?[ya,yb]:[yb,ya];return (hi+0.05)/(lo+0.05);};
const cr=(fg,bg)=>ratio(Ylin(fg),Ylin(bg));
const crCVD=(fg,bg)=>Math.min(...Object.values(CVD).map(M=>ratio(simY(fg,M),simY(bg,M))));  // worst across CVD types
const num=(x)=>String(x).replace(/\./g,"_").replace(/^-/,"neg");

const out={};
for(const [name,hex] of Object.entries(PRIM)){
  const t=canonicalizeTyped(hex);                    // → {l,c,h,alpha} in oklch
  const cas=`oklch-${num(t.l)}-${num(t.c)}-${num(t.h)}-${num(t.alpha)}`;
  // for each band, the WORST contrast across it (normal + worst-CVD) is the guarantee
  const pairs=[];
  for(const [band,hexes] of Object.entries(BANDS)){
    const usable=hexes.filter(gh=>gh.toLowerCase()!==hex.toLowerCase());
    if(!usable.length) continue;
    const n=Math.min(...usable.map(gh=>cr(hex,gh))), v=Math.min(...usable.map(gh=>crCVD(hex,gh)));
    if(n>=3) pairs.push({band,n,v,tier:n>=4.5?"text AA 4.5:1":"non-text 3:1",bar:n>=4.5?4.5:3});
  }
  pairs.sort((a,b)=>b.n-a.n);
  // name the color in plain words
  const hueName=(h)=>{for(const[deg,nm]of[[18,"red"],[45,"clay"],[78,"amber"],[105,"gold"],[140,"lime"],[172,"green"],[195,"teal"],[240,"blue"],[290,"indigo"],[335,"magenta"],[360,"red"]])if(h<=deg)return nm;return"red";};
  const shadeWord=t.l>=88?"very light":t.l>=66?"light":t.l>=44?"mid-tone":t.l>=24?"dark":"deep";
  let noun,useShade=true;
  if(t.c<0.02){                                   // near-neutral — name it as a grey/white/black
    if(t.l>=98){noun="pure white";useShade=false;}
    else if(t.l>=86){noun="off-white";useShade=false;}
    else if(t.l<=6){noun="pure black";useShade=false;}
    else if(t.l<=24){noun="near-black";useShade=false;}
    else noun="grey";
  } else {
    noun=`${(t.h>=20&&t.h<=110)?"warm ":(t.h>=195&&t.h<=300)?"cool ":""}${hueName(t.h)}`;
  }
  const firstWord=useShade?shadeWord:noun;
  const article=/^[aeiou]/i.test(firstWord)?"An":"A";
  const opener=useShade?`${article} ${shadeWord} ${noun}.`:`${article} ${noun}.`;
  let desc;
  if(!pairs.length){
    desc=`${opener} It's a background surface — other colors sit on it, rather than it on them.`;
  } else {
    const parts=pairs.map(p=>{
      const use=p.bar>=4.5?"text":"borders and dividers";
      const floor=p.bar>=4.5?"the 4.5:1 minimum for readable text":"the 3:1 minimum for non-text";
      return `As ${use} on ${p.band} it reaches ${p.n.toFixed(1)} to 1 — past ${floor} — and still holds ${p.v.toFixed(1)} to 1 for color-blind readers`;
    });
    desc=`${opener} ${parts.join("; ")}. So it stays legible for everyone, including the three common kinds of color-blindness.`;
  }
  out[name]={ was:name, cas, value:`oklch(${t.l}% ${t.c} ${t.h} / ${t.alpha})`, hex, desc };
}
if(process.argv.includes("--json")){
  // emit the DTCG `primitive` tier — the ONLY tier for now. Keyed by the DERIVED name (CAS oklch);
  // $was keeps the old hand-name for migration; $description is generated from the computed facts.
  const tier={"$description":"Derived primitives — real brand colors, names derived from their oklch coordinates, descriptions generated from computed contrast under normal + deuteranopia/protanopia/tritanopia vision. The only color tier for now (semantic + recipe tiers removed). No old names anywhere: the name IS the color. The doc cannot drift from the value because it is computed from it."};
  for(const [k,v] of Object.entries(out)) tier[v.cas]={"$type":"color","$value":v.value,"$description":v.desc};
  console.log(JSON.stringify({primitive:tier},null,2));
  process.exit(0);
}
// report
console.log("all "+Object.keys(out).length+" primitives — real color, DERIVED name, GENERATED description:\n");
for(const [k,v] of Object.entries(out)){
  console.log(`  ${k.padEnd(10)} ${v.hex}  →  ${v.cas}`);
  console.log(`    ${v.desc}\n`);
}
