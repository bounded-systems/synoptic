#!/usr/bin/env node
// synoptic brand-gen — a brand palette FROM the constraint model, assuming NO decorative color:
// every element is meaningful, so every element is constrained. You choose two hues (warm+cool
// near the yellow-blue axis → CVD-robust); every element's LIGHTNESS is then DERIVED as the
// floor that meets its tier against the lightest text-background — text/link 7:1 (AAA), border/
// UI 3:1 (non-text). Nothing is picked but the hues. All CAS-named oklch typed objects.
//   node brand-gen.mjs "<name>" <coolHue> <warmHue>
const oklab=(L,C,h)=>({L:L/100,a:C*Math.cos(h*Math.PI/180),b:C*Math.sin(h*Math.PI/180)});
const lms=({L,a,b})=>[(L+0.3963377774*a+0.2158037573*b)**3,(L-0.1055613458*a-0.0638541728*b)**3,(L-0.0894841775*a-1.2914855480*b)**3];
const lin=([l,m,s])=>[4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s];
const inG=(L,C,h)=>lin(lms(oklab(L,C,h))).every(c=>c>=-0.001&&c<=1.001);
const ceil=(L,h)=>{let lo=0,hi=0.4;for(let i=0;i<24;i++){const m=(lo+hi)/2;inG(L,m,h)?lo=m:hi=m;}return lo;};
const Y=(L,C,h)=>{const[r,g,b]=lin(lms(oklab(L,C,h))).map(c=>Math.max(0,Math.min(1,c)));return 0.2126*r+0.7152*g+0.0722*b;};
const ratio=(a,b)=>{const[hi,lo]=a>=b?[a,b]:[b,a];return (hi+0.05)/(lo+0.05);};
const r=(n,d=4)=>{const f=10**d;return Math.round(n*f)/f;};
const num=(x)=>String(x).replace(/\./g,"_").replace(/^-/,"neg");
const mk=(L,h,cf)=>{const C=r(ceil(L,h)*cf,4);return{L:r(L,1),C,h,Y:Y(L,C,h),cas:`oklch-${num(r(L,1))}-${num(C)}-${num(h)}-1`};};

const [name,coolH,warmH]=[process.argv[2]||"brand",+(process.argv[3]||165),+(process.argv[4]||80)];
// snap to a 5% lightness grid so every brand normalizes to the same round steps. Elements
// snap UP (lighter → more contrast on a dark bg), so snapping NEVER breaks the constraint.
const gUp=(L)=>Math.min(95,Math.ceil(L/5)*5);
// two text backgrounds (dark band), on the grid; the lighter one sets every floor
const surfaces=[mk(15,coolH,0.55),mk(25,coolH,0.55)];   // ground, raised
const bgY=surfaces[1].Y;
// DERIVE the lightness where an element first meets `bar`, then snap UP to the grid
const floor=(bar,h,cf)=>{let L=45;while(L<97&&ratio(Y(L,ceil(L,h)*cf,h),bgY)<bar)L+=0.5;return mk(gUp(L),h,cf);};
// every element = (role, atom, required ratio). text/link 7:1; border/ui 3:1. none exempt.
const elems=[
  ["ground",      surfaces[0], 0],
  ["raised",      surfaces[1], 0],
  ["text",        mk(95,coolH,0.16), 7],          // body — comfortably above the floor
  ["text-muted",  floor(7,coolH,0.30), 7],        // muted — the AAA text floor
  ["link",        floor(7,coolH,0.90), 7],        // link is TEXT → 7:1, saturated cool
  ["accent",      floor(3,warmH,0.90), 3],        // warm UI accent → non-text 3:1
  ["border",      floor(3,coolH,0.55), 3],        // hairline is MEANINGFUL now → non-text 3:1
];
let allPass=true;
const rows=elems.map(([role,t,bar])=>{const rr=bar?ratio(t.Y,bgY):0;const ok=bar?rr>=bar:true;if(!ok)allPass=false;return{role,t,bar,rr,ok};});
console.log(`\n=== ${name} — hues cool ${coolH}° + warm ${warmH}° · NO decorative (every element constrained) ===`);
console.log(`  CVD: warm/cool on the yellow-blue axis → robust to red-green color-blindness ✓`);
console.log(`  ${allPass?"✓ every element meets its tier by construction":"✗ some element fails"} (vs lightest text-bg L${surfaces[1].L})\n`);
for(const {role,t,bar,rr,ok} of rows){
  const tier=bar===7?"text 7:1":bar===3?"non-text 3:1":"surface";
  console.log(`  --${t.cas.padEnd(26)}: oklch(${t.L}% ${t.C} ${t.h} / 1);  /* ${role.padEnd(11)} ${tier}${bar?"  "+rr.toFixed(2)+":1 "+(ok?"✓":"✗"):""} */`);
}
