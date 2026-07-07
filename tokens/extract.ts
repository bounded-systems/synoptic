// Extract a brand's palette + type scale from a LIVE url (headless render via tezcatl) into the
// JSON the engine consumes. The engine stays agnostic — this just gathers a brand's own data.
// Run: deno run --allow-run --allow-write extract.ts <url> <outDir>
const url = Deno.args[0];
const outDir = Deno.args[1] ?? ".";
if (!url) { console.error("usage: extract.ts <url> <outDir>"); Deno.exit(1); }

const js = `(()=>{
  const colorProps=["color","background-color","border-top-color","border-bottom-color","outline-color","text-decoration-color"];
  const colors=new Set(), fs=new Set(), lh=new Set();
  for (const el of document.querySelectorAll("*")) {
    const cs=getComputedStyle(el);
    for (const p of colorProps){ const v=cs.getPropertyValue(p); if(v && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(v)) colors.add(v); }
    const f=parseFloat(cs.fontSize), l=parseFloat(cs.lineHeight);
    if(f) fs.add(Math.round(f/16*1000)/1000);
    if(l&&f) lh.add(Math.round(l/f*100)/100);
  }
  const toHex=(s)=>{const m=s.match(/\\d+/g); return m ? "#"+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,"0")).join("").toUpperCase() : s;};
  return JSON.stringify({ palette:[...new Set([...colors].map(toHex))], fontSizesRem:[...fs].sort((a,b)=>a-b), lineHeights:[...lh].sort((a,b)=>a-b) });
})()`;

const out = await new Deno.Command("tezcatl", { args: [url, `--eval=${js}`] }).output();
const text = new TextDecoder().decode(out.stdout).trim();
const json = text.split("\n").filter((l) => l.startsWith("{")).pop();
if (!json) { console.error("no data from tezcatl:", text.slice(0, 200)); Deno.exit(1); }
const data = JSON.parse(json) as { palette: string[]; fontSizesRem: number[]; lineHeights: number[] };

Deno.writeTextFileSync(`${outDir}/palette.json`, JSON.stringify(data.palette) + "\n");
Deno.writeTextFileSync(`${outDir}/scale.json`, JSON.stringify(data.fontSizesRem) + "\n");
Deno.writeTextFileSync(`${outDir}/ratios.json`, JSON.stringify(data.lineHeights) + "\n");
console.log(`extracted ${url} → ${outDir}: ${data.palette.length} colors, ${data.fontSizesRem.length} font-sizes, ${data.lineHeights.length} line-heights`);
