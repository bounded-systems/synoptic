// The embedded-webfont token (font-face.ts) against its spec (spec/font-face.schema.json): what the
// token accepts, what it refuses (remote/raw/oversized/unlicensed/mis-signed fonts), the @font-face
// it emits, and the end-to-end build: a brand with a face gets an inline @font-face that still passes
// the full-indirection audit; a brand without one is untouched.
// Run: deno test --allow-read --allow-write --allow-run --allow-env
import { assert, assertEquals, assertMatch, assertThrows } from "jsr:@std/assert@^1";
import { Ajv2020 } from "npm:ajv@8.18.0/dist/2020.js";
import {
  decodeFontDataUri,
  deriveFontFace,
  FONT_FACE_BOUNDS,
  FontFace,
  fontDataUri,
  type FontFaceConfig,
  fontFaceRule,
  stackWithFace,
} from "./font-face.ts";

const schema = JSON.parse(Deno.readTextFileSync(new URL("../spec/font-face.schema.json", import.meta.url)));
const validate = new Ajv2020({ strict: false }).compile(schema);
const here = new URL("./", import.meta.url);

/** A synthetic font: the real WOFF2/WOFF signature + padding (the token checks bytes, not glyphs). */
const fakeFont = (magic: string, size = 64) => { const b = new Uint8Array(size); b.set(new TextEncoder().encode(magic)); return b; };
const woff2 = fontDataUri(fakeFont("wOF2"), "font/woff2");
const cfg = (o: Partial<FontFaceConfig> = {}): FontFaceConfig => ({ family: "Space Grotesk", src: woff2, weight: { min: 300, max: 700 }, display: "swap", license: "OFL-1.1", ...o });

Deno.test("valid face — config → token that satisfies BOTH the Zod token and the JSON Schema", () => {
  const t = deriveFontFace(cfg(), here);
  assertEquals(t.$type, "font-face");
  assertEquals(t.$value.display, "swap");
  assertEquals(t.$value.style, "normal");
  assertMatch(t.$sha, /^[0-9a-f]{12}$/);
  assert(validate(t), JSON.stringify(validate.errors));
});

Deno.test("spec example — the schema's own example is a valid token", () => {
  for (const ex of schema.examples) {
    assert(validate(ex), JSON.stringify(validate.errors));
    FontFace.parse(ex);
  }
});

Deno.test("single weight — a number becomes a min = max range and emits one weight", () => {
  const t = deriveFontFace(cfg({ weight: 400 }), here);
  assertEquals(t.$value.weight, { min: 400, max: 400 });
  assertMatch(fontFaceRule(t), /font-weight: 400;/);
});

Deno.test("file src — a .woff2 path is read relative to the brand and inlined as a data: URI", () => {
  const dir = Deno.makeTempDirSync();
  Deno.writeFileSync(`${dir}/face.woff2`, fakeFont("wOF2", 100));
  const t = deriveFontFace(cfg({ src: "face.woff2" }), new URL(`file://${dir}/brand.json`));
  assertEquals(decodeFontDataUri(t.$value.src)?.bytes.length, 100);
  assertMatch(t.$value.src, /^data:font\/woff2;base64,/);
});

Deno.test("refused — every unembeddable face fails at the door, never emits", () => {
  const bad: [string, Partial<FontFaceConfig>][] = [
    ["CDN url", { src: "https://fonts.gstatic.com/s/spacegrotesk.woff2" }],
    ["raw ttf data: URI", { src: fontDataUri(fakeFont("\0\x01\0\0"), "font/woff2").replace("font/woff2", "font/ttf") }],
    ["ttf file", { src: "face.ttf" }],
    ["wrong signature", { src: fontDataUri(fakeFont("wOFF"), "font/woff2") }],
    ["over budget", { src: fontDataUri(fakeFont("wOF2", FONT_FACE_BOUNDS.maxBytes + 1), "font/woff2") }],
    ["non-embeddable license", { license: "LicenseRef-Commercial" }],
    ["generic family name", { family: "system-ui" }],
    ["CSS injection in family", { family: 'X"; } body { color: red' }],
    ["display not swap", { display: "block" as "swap" }],
    ["weight min > max", { weight: { min: 700, max: 300 } }],
    ["weight out of range", { weight: { min: 0, max: 1001 } }],
  ];
  for (const [why, o] of bad) assertThrows(() => deriveFontFace(cfg(o), here), Error, undefined, why);
});

Deno.test("schema parity — the JSON Schema refuses the structural invalids the token refuses", () => {
  const t = deriveFontFace(cfg(), here);
  const mut = (v: Record<string, unknown>) => ({ ...t, $value: { ...t.$value, ...v } });
  for (const [why, x] of [
    ["CDN url", mut({ src: "https://cdn.example/face.woff2" })],
    ["ttf", mut({ src: "data:font/ttf;base64,AAEAAA==" })],
    ["display", mut({ display: "block" })],
    ["license", mut({ license: "LicenseRef-Commercial" })],
    ["family injection", mut({ family: 'X"; }' })],
    ["extra descriptor", mut({ unicodeRange: "U+0-FF" })],
  ] as const) assert(!validate(x), `schema should refuse: ${why}`);
});

Deno.test("emission — @font-face descriptors, and the face prepended to the system stack", () => {
  const t = deriveFontFace(cfg(), here);
  assertEquals(fontFaceRule(t), `@font-face { font-family: "Space Grotesk"; src: url("${woff2}") format("woff2"); font-weight: 300 700; font-style: normal; font-display: swap; }`);
  assertEquals(stackWithFace(t, "system-ui, sans-serif"), `"Space Grotesk", system-ui, sans-serif`);
  assertEquals(stackWithFace(undefined, "system-ui, sans-serif"), "system-ui, sans-serif");
});

const deepBlue = JSON.parse(Deno.readTextFileSync(new URL("brands/deep-blue/brand.json", import.meta.url)));
const run = async (script: string, ...args: string[]) => {
  const o = await new Deno.Command(Deno.execPath(), { args: ["run", "--allow-read", "--allow-write", new URL(script, import.meta.url).pathname, ...args] }).output();
  return { code: o.code, out: new TextDecoder().decode(o.stdout) + new TextDecoder().decode(o.stderr) };
};

Deno.test("build — a brand with a face emits an inline @font-face that passes the audit; without one, none", async () => {
  const dir = Deno.makeTempDirSync();
  Deno.writeFileSync(`${dir}/face.woff2`, fakeFont("wOF2", 256));
  Deno.writeTextFileSync(`${dir}/brand.json`, JSON.stringify({ ...deepBlue, fontFace: { family: "Space Grotesk", src: "face.woff2", weight: { min: 300, max: 700 }, license: "OFL-1.1" } }));
  const built = await run("to-css.ts", `${dir}/brand.json`, dir);
  assertEquals(built.code, 0, built.out);
  const css = Deno.readTextFileSync(`${dir}/style.css`);
  assertEquals(css.split("\n")[1].slice(0, 59), `@font-face { font-family: "Space Grotesk"; src: url("data:f`);
  assertEquals(css.match(/@font-face/g)?.length, 1);
  assertMatch(css, /--font-sans: "Space Grotesk", system-ui, sans-serif;/);
  assert(!/https?:\/\//.test(css), "self-contained: no remote URL in the stylesheet");
  const audit = await run("audit.ts", `${dir}/style.css`);
  assertEquals(audit.code, 0, audit.out);

  // the same brand WITHOUT the face is byte-identical to the committed output — the face is purely additive
  const plain = Deno.makeTempDirSync();
  assertEquals((await run("to-css.ts", new URL("brands/deep-blue/brand.json", import.meta.url).pathname, plain)).code, 0);
  const plainCss = Deno.readTextFileSync(`${plain}/style.css`);
  assert(!plainCss.includes("@font-face"), "no face → the zero-load system stack, unchanged");
  assertEquals(plainCss, Deno.readTextFileSync(new URL("examples/mock-blue/style.css", import.meta.url)));
  assertEquals(css.replace(/^@font-face.*\n/m, "").replace(`"Space Grotesk", `, ""), plainCss, "face adds one rule + one stack entry, nothing else");
});

Deno.test("build — brand path with a space and '#' resolves the face file (path, not URL, semantics)", async () => {
  const dir = `${Deno.makeTempDirSync()}/a b#c`;
  Deno.mkdirSync(dir);
  Deno.writeFileSync(`${dir}/face.woff2`, fakeFont("wOF2"));
  Deno.writeTextFileSync(`${dir}/brand.json`, JSON.stringify({ ...deepBlue, fontFace: { family: "Brand Sans", src: "face.woff2", weight: { min: 100, max: 900 }, license: "OFL-1.1" } }));
  const built = await run("to-css.ts", `${dir}/brand.json`, dir);
  assertEquals(built.code, 0, built.out);
  assertMatch(Deno.readTextFileSync(`${dir}/style.css`), /^@font-face \{ font-family: "Brand Sans";/m);
});

Deno.test("build — a face that doesn't cover the body weight fails the build", async () => {
  const dir = Deno.makeTempDirSync();
  Deno.writeFileSync(`${dir}/face.woff2`, fakeFont("wOF2"));
  Deno.writeTextFileSync(`${dir}/brand.json`, JSON.stringify({ ...deepBlue, fontFace: { family: "Brand Sans", src: "face.woff2", weight: 700, license: "OFL-1.1" } }));
  const built = await run("to-css.ts", `${dir}/brand.json`, dir);
  assert(built.code !== 0);
  assertMatch(built.out, /does not cover the body weight 400/);
});

Deno.test("build — an unlicensed face fails the build (non-zero), no stylesheet written", async () => {
  const dir = Deno.makeTempDirSync();
  Deno.writeFileSync(`${dir}/face.woff2`, fakeFont("wOF2"));
  Deno.writeTextFileSync(`${dir}/brand.json`, JSON.stringify({ ...deepBlue, fontFace: { family: "Brand Sans", src: "face.woff2", weight: 400, license: "LicenseRef-Commercial" } }));
  assert((await run("to-css.ts", `${dir}/brand.json`, dir)).code !== 0);
  assertThrows(() => Deno.statSync(`${dir}/style.css`));
});
