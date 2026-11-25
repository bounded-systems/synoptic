// The EMBEDDED WEBFONT token — the opt-in alternative to the zero-load system stack
// (font.ts SYSTEM_FONT_STACKS). A brand that must match a specific typeface (e.g. Space Grotesk)
// declares one `font-face` token; to-css.ts embeds it as an `@font-face` at the top of style.css
// with its bytes INLINE as a data: URI, so the stylesheet stays self-contained: no CDN, no third
// origin, nothing for a CSP to allow beyond `font-src data:`. The family is PREPENDED to the brand's
// stack, so the system stack stays the fallback (and the swap period's face).
//
// The tradeoff (also in GROUNDING.md, "Typeface"):
//   · SIZE — a system stack costs 0 bytes and 0 requests. An embedded face costs its file size ×4/3
//     (base64) inside style.css, on EVERY page load, render-blocking with the stylesheet and not
//     separately cacheable. So the bytes are bounded (FONT_FACE_BOUNDS.maxBytes) and only the
//     compressed web formats are constructable (woff2 / woff — never raw ttf/otf).
//   · LICENSING — embedding redistributes the font file to every visitor. Only a license that
//     permits redistribution + embedding is constructable (EMBEDDABLE_LICENSES, SPDX ids). Most
//     commercial web licenses forbid self-encoding into a data: URI; those are rejected, not warned.
//   · RENDERING — font-display is locked to `swap`: text paints at once in the fallback stack and
//     swaps when the face decodes (no invisible-text period).
// Grounded: CSS Fonts 4 §4 (@font-face: src, font-weight range, font-display); RFC 2397 (data:);
// RFC 8081 (font/woff2, font/woff media types); W3C WOFF2 §3 / WOFF 1.0 §3 (the signatures).
import { z } from "zod";
import { sha } from "./color.ts";
import { GenericFontFamily } from "./font.ts";

/** The bounds an embedded face must sit in. weight 1–1000 is the CSS Fonts 4 <font-weight-absolute>
 * range; maxBytes caps the DECODED font (the stylesheet grows by ~4/3 of it). */
export const FONT_FACE_BOUNDS = {
  weightMin: 1,
  weightMax: 1000,
  maxBytes: 128 * 1024,
  grounding: "CSS Fonts 4 §4.5 (font-weight range 1–1000), §4.9 (font-display); size budget: the face rides inside style.css on every load",
} as const;

/** Licenses that permit redistributing + embedding the font bytes (SPDX ids). Fail-closed: extending
 * this list is a reviewed change, never a per-brand override. */
export const EMBEDDABLE_LICENSES = ["OFL-1.1", "Apache-2.0", "MIT", "CC0-1.0", "Ubuntu-font-1.0"] as const;
export const EmbeddableLicense = z.enum(EMBEDDABLE_LICENSES);

/** The compressed web-font formats, by media type → the `format()` hint and the file signature. */
export const FONT_FORMATS = {
  "font/woff2": { format: "woff2", magic: "wOF2" },
  "font/woff": { format: "woff", magic: "wOFF" },
} as const;
export type FontMediaType = keyof typeof FONT_FORMATS;

const DATA_URI = /^data:(font\/woff2|font\/woff);base64,([A-Za-z0-9+/]+={0,2})$/;
/** A family name safe to emit as a quoted CSS string: letters, digits, space, hyphen — and never a
 * generic keyword (a face named `serif` would shadow the generic). */
export const FaceFamily = z.string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{0,63}$/, "family name: letters, digits, spaces, hyphens (≤64)")
  .refine((f) => !GenericFontFamily.safeParse(f.toLowerCase()).success, "a face may not take a generic family's name");

/** Decode a font data: URI → its media type + bytes, or null when it isn't one. */
export function decodeFontDataUri(src: string): { mediaType: FontMediaType; bytes: Uint8Array } | null {
  const m = DATA_URI.exec(src);
  if (!m || m[2].length % 4 !== 0) return null;
  try {
    const bin = atob(m[2]);
    return { mediaType: m[1] as FontMediaType, bytes: Uint8Array.from(bin, (c) => c.charCodeAt(0)) };
  } catch { return null; }
}

/** The embedded font source: a base64 data: URI whose bytes ARE the declared format and fit the budget. */
export const FontDataUri = z.string().superRefine((src, ctx) => {
  const d = decodeFontDataUri(src);
  if (!d) { ctx.addIssue({ code: "custom", message: "src must be a base64 data: URI of type font/woff2 or font/woff (no URL, no CDN)" }); return; }
  const magic = new TextDecoder().decode(d.bytes.subarray(0, 4));
  if (magic !== FONT_FORMATS[d.mediaType].magic) ctx.addIssue({ code: "custom", message: `bytes are not ${d.mediaType} (signature "${magic}", want "${FONT_FORMATS[d.mediaType].magic}")` });
  if (d.bytes.length > FONT_FACE_BOUNDS.maxBytes) ctx.addIssue({ code: "custom", message: `font is ${d.bytes.length} bytes — over the ${FONT_FACE_BOUNDS.maxBytes}-byte budget (subset it, or keep the system stack)` });
});

const Weight = z.number().int().min(FONT_FACE_BOUNDS.weightMin).max(FONT_FACE_BOUNDS.weightMax);
/** font-weight descriptor: a single weight, or a [min,max] range for a variable font. */
export const WeightRange = z.object({ min: Weight, max: Weight }).refine((w) => w.min <= w.max, "weight min must be ≤ max");

/** The face itself — the @font-face descriptors we allow. */
export const FontFaceValue = z.object({
  family: FaceFamily,
  src: FontDataUri,
  weight: WeightRange,
  style: z.enum(["normal", "italic"]).default("normal"),
  display: z.literal("swap"),
  license: EmbeddableLicense,
}).strict();
export type FontFaceValue = z.infer<typeof FontFaceValue>;

/** The font-face token. Spec: spec/font-face.schema.json. */
export const FontFace = z.object({
  $type: z.literal("font-face"),
  $value: FontFaceValue,
  $sha: z.string().regex(/^[0-9a-f]{12}$/, "12-hex content address"),
  $description: z.string(),
}).strict();
export type FontFace = z.infer<typeof FontFace>;

/** The brand-config input: as the token value, but `src` may also be a path (relative to the
 * brand.json) to a .woff2/.woff file, read + encoded at build time; display defaults to swap. */
export const FontFaceConfig = z.object({
  family: z.string(),
  src: z.string(),
  weight: z.union([Weight, z.object({ min: Weight, max: Weight })]),
  style: z.enum(["normal", "italic"]).optional(),
  display: z.literal("swap").default("swap"),
  license: z.string(),
}).strict();
export type FontFaceConfig = z.infer<typeof FontFaceConfig>;

const MEDIA_BY_EXT: Record<string, FontMediaType> = { woff2: "font/woff2", woff: "font/woff" };
/** Encode font bytes as the data: URI the token carries. */
export function fontDataUri(bytes: Uint8Array, mediaType: FontMediaType): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mediaType};base64,${btoa(bin)}`;
}

/** Config → validated token. `base` (the brand.json's URL) resolves a file `src`; a data: `src` is used as-is. Throws
 * (ZodError) on anything the token can't hold — an unlicensed, oversized, or remote font never emits. */
export function deriveFontFace(cfg: FontFaceConfig, base: URL): FontFace {
  let src = cfg.src;
  if (!src.startsWith("data:")) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) throw new Error(`fontFace.src "${src}" is a URL — embed the file (a path or a data: URI); no CDN`);
    const ext = src.split(".").pop()?.toLowerCase() ?? "";
    const mediaType = MEDIA_BY_EXT[ext];
    if (!mediaType) throw new Error(`fontFace.src "${src}": only .woff2 / .woff files embed`);
    src = fontDataUri(Deno.readFileSync(new URL(src, base)), mediaType);
  }
  const weight = typeof cfg.weight === "number" ? { min: cfg.weight, max: cfg.weight } : cfg.weight;
  const $value = FontFaceValue.parse({ family: cfg.family, src, weight, style: cfg.style, display: cfg.display, license: cfg.license });
  const bytes = decodeFontDataUri($value.src)!.bytes.length;
  return FontFace.parse({
    $type: "font-face",
    $value,
    $sha: sha(`${$value.family}|${$value.weight.min}-${$value.weight.max}|${$value.style}|${$value.src}`),
    $description: `Embedded face "${$value.family}" (${$value.license}), weight ${$value.weight.min === $value.weight.max ? $value.weight.min : `${$value.weight.min}–${$value.weight.max}`}, ${$value.style}, font-display swap — ${bytes} bytes inline (~${Math.ceil(bytes * 4 / 3)} in style.css). Falls back to the brand stack.`,
  });
}

/** CSS string literal for a (validated) family name. */
export const quoteFamily = (family: string) => `"${family}"`;

/** The `@font-face` rule for a token. Descriptors, not properties — they define a face, the way
 * `@property` defines a token, so they hold literals (the audit strips the block like @property). */
export function fontFaceRule(t: FontFace): string {
  const v = t.$value;
  const { mediaType } = decodeFontDataUri(v.src)!;
  const weight = v.weight.min === v.weight.max ? String(v.weight.min) : `${v.weight.min} ${v.weight.max}`;
  return `@font-face { font-family: ${quoteFamily(v.family)}; src: url("${v.src}") format("${FONT_FORMATS[mediaType].format}"); font-weight: ${weight}; font-style: ${v.style}; font-display: ${v.display}; }`;
}

/** Does the face's weight range include `w`? (A face outside the body weight would still be picked
 * for body text by font matching, CSS Fonts 4 §5.2 — rendering every paragraph at the wrong weight.) */
export const faceCoversWeight = (t: FontFace, w: number) => t.$value.weight.min <= w && w <= t.$value.weight.max;

/** The brand stack with the embedded face in front — the system stack stays the fallback. */
export const stackWithFace = (t: FontFace | undefined, stack: string) => (t ? `${quoteFamily(t.$value.family)}, ${stack}` : stack);
