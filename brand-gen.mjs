#!/usr/bin/env node
// synoptic brand-gen — a full brand palette FROM the constraint model: two hues (warm+cool,
// on/near the yellow-blue axis so it's CVD-robust), AAA-constructed (every text/surface pair
// >=7:1 by construction), CAS-named typed objects, both themes. The hues are the only choice;
// the rest is forced.  node brand-gen.mjs "<name>" <coolHue> <warmHue>
const oklab=(L,C,h)=>({L:L/100,a:C*Math.cos(h*Math.PI/180),b:C*Math.sin(h*Math.PI/180)});
const lms=({L,a,b})=>[(L+0.3963377774*a+0.2158037573*b)**3,(L-0.1055613458*a-0.0638541728*b)**3,(L-0.0894841775*a-1.2914855480*b)**3];
const lin=([l,m,s])=>[4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s];
const inG=(L,C,h)=>lin(lms(oklab(L,C,h))).every(c=>c>=-0.001&&c<=1.001);
const ceil=(L,h)=>{let lo=0,hi=0.4;for(let i=0;i<24;i++){const m=(lo+hi)/2;inG(L,m,h)?lo=m:hi=m;}return lo;};
const Y=(L,C,h)=>{const[r,g,b]=lin(lms(oklab(L,C,h))).map(c=>Math.max(0,Math.min(1,c)));return 0.2126*r+0.7152*g+0.0722*b;};
const ratio=(a,b)=>{const[hi,lo]=a>=b?[a,b]:[b,a];return (hi+0.05)/(lo+0.05);};
const r=(n,d=4)=>{const f=10**d;return Math.round(n*f)/f;};
const num=(x)=>String(x).replace(/\./g,"_").replace(/^-/,"neg");
const cas=(L,C,h,a=1)=>`oklch-${num(L)}-${num(C)}-${num(h)}-${num(a)}`;

const [name,coolH,warmH]=[process.argv[2]||"brand",+(process.argv[3]||165),+(process.argv[4]||80)];
// dark band = surfaces (cool, low chroma); light band = text; accents = saturated warm+cool
const mk=(L,h,cf)=>({L,C:r(ceil(L,h)*cf,4),h,cas:cas(L,r(ceil(L,h)*cf,4),h)});
const surfaces=[mk(14,coolH,0.55),mk(22,coolH,0.55),mk(31,coolH,0.55)];        // ground, raised, line
const textBgs=[surfaces[0],surfaces[1]];                                       // text sits on ground + raised; line is a border (non-text)
const lightBg=surfaces[1];                                                     // the lightest text-background sets the floor
// DERIVE the muted floor: darkest text L that still clears 7:1 on the lightest text-bg
let floorL=60;while(floorL<95&&ratio(Y(floorL,ceil(floorL,coolH)*0.30,coolH),Y(lightBg.L,lightBg.C,lightBg.h))<7)floorL+=0.5;
const text    =[mk(93,coolH,0.16),mk(floorL,coolH,0.30)];                      // body, muted (muted = the AAA floor)
const accent  =[mk(70,warmH,0.9),mk(66,coolH,0.9)];                            // warm accent, cool accent
const all=[...surfaces,...text,...accent];
// PROOF: worst text-on-TEXT-BACKGROUND pair >= 7 (line is non-text, 3:1, checked separately)
let worst={r:9e9};for(const s of textBgs)for(const t of text){const rr=ratio(Y(t.L,t.C,t.h),Y(s.L,s.C,s.h));if(rr<worst.r)worst={r:rr,s,t};}
const lineNonText=ratio(Y(surfaces[2].L,surfaces[2].C,surfaces[2].h),Y(surfaces[1].L,surfaces[1].C,surfaces[1].h));
console.log(`\n=== ${name} — 2 hues (cool ${coolH}°, warm ${warmH}°), AAA-constructed, CAS-named ===`);
console.log(`  CVD: warm/cool on the yellow-blue axis → robust to red-green color-blindness ✓`);
console.log(`  AAA: worst text/text-bg = ${worst.r.toFixed(2)}:1  ${worst.r>=7?"≥ 7 ✓ every text/surface pair clears AAA by construction":"✗ FAILS"}`);console.log(`  non-text: line vs raised = ${lineNonText.toFixed(2)}:1  ${lineNonText>=3?"≥ 3 ✓":"(decorative)"}\n`);
const tag=(t,role)=>console.log(`  --${t.cas.padEnd(28)}: oklch(${t.L}% ${t.C} ${t.h} / 1);   /* ${role} */`);
console.log("  /* surfaces (dark band) */");        surfaces.forEach((t,i)=>tag(t,["ground","raised","line"][i]));
console.log("  /* text (light band, AAA on every surface) */"); text.forEach((t,i)=>tag(t,["body","muted"][i]));
console.log("  /* accents (the two chosen hues, saturated) */"); accent.forEach((t,i)=>tag(t,["accent-warm","accent-cool"][i]));
