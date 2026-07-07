// GENERATED from @webref/idl (css-typed-om) by gen-typed-om.ts — do not edit by hand.
// The CSS Typed OM value interfaces, projected to Zod. Our color tokens ARE CSSOKLCH.
import { z } from "zod";

/** CSS Typed OM `CSSOKLCH` : CSSColorValue — generated from IDL. */
export const CSSOKLCH = z.object({
  $type: z.literal("CSSOKLCH"),
  l: z.number(),
  c: z.number(),
  h: z.number(),
  alpha: z.number(),
});
export type CSSOKLCH = z.infer<typeof CSSOKLCH>;

/** CSS Typed OM `CSSOKLab` : CSSColorValue — generated from IDL. */
export const CSSOKLab = z.object({
  $type: z.literal("CSSOKLab"),
  l: z.number(),
  a: z.number(),
  b: z.number(),
  alpha: z.number(),
});
export type CSSOKLab = z.infer<typeof CSSOKLab>;

/** CSS Typed OM `CSSLCH` : CSSColorValue — generated from IDL. */
export const CSSLCH = z.object({
  $type: z.literal("CSSLCH"),
  l: z.number(),
  c: z.number(),
  h: z.number(),
  alpha: z.number(),
});
export type CSSLCH = z.infer<typeof CSSLCH>;

/** CSS Typed OM `CSSLab` : CSSColorValue — generated from IDL. */
export const CSSLab = z.object({
  $type: z.literal("CSSLab"),
  l: z.number(),
  a: z.number(),
  b: z.number(),
  alpha: z.number(),
});
export type CSSLab = z.infer<typeof CSSLab>;

/** CSS Typed OM `CSSRGB` : CSSColorValue — generated from IDL. */
export const CSSRGB = z.object({
  $type: z.literal("CSSRGB"),
  r: z.unknown(),
  g: z.unknown(),
  b: z.unknown(),
  alpha: z.number(),
});
export type CSSRGB = z.infer<typeof CSSRGB>;

/** CSS Typed OM `CSSHSL` : CSSColorValue — generated from IDL. */
export const CSSHSL = z.object({
  $type: z.literal("CSSHSL"),
  h: z.number(),
  s: z.number(),
  l: z.number(),
  alpha: z.number(),
});
export type CSSHSL = z.infer<typeof CSSHSL>;

/** CSS Typed OM `CSSHWB` : CSSColorValue — generated from IDL. */
export const CSSHWB = z.object({
  $type: z.literal("CSSHWB"),
  h: z.number(),
  w: z.number(),
  b: z.number(),
  alpha: z.number(),
});
export type CSSHWB = z.infer<typeof CSSHWB>;

/** CSS Typed OM `CSSColor` : CSSColorValue — generated from IDL. */
export const CSSColor = z.object({
  $type: z.literal("CSSColor"),
  colorSpace: z.string(),
  channels: z.unknown(),
  alpha: z.number(),
});
export type CSSColor = z.infer<typeof CSSColor>;

/** CSS Typed OM `CSSUnitValue` : CSSNumericValue — generated from IDL. */
export const CSSUnitValue = z.object({
  $type: z.literal("CSSUnitValue"),
  value: z.number(),
  unit: z.string(),
});
export type CSSUnitValue = z.infer<typeof CSSUnitValue>;

/** CSS Typed OM `CSSKeywordValue` : CSSStyleValue — generated from IDL. */
export const CSSKeywordValue = z.object({
  $type: z.literal("CSSKeywordValue"),
  value: z.string(),
});
export type CSSKeywordValue = z.infer<typeof CSSKeywordValue>;

/** CSS Typed OM `CSSUnparsedValue` : CSSStyleValue — generated from IDL. */
export const CSSUnparsedValue = z.object({
  $type: z.literal("CSSUnparsedValue"),
  length: z.number(),
});
export type CSSUnparsedValue = z.infer<typeof CSSUnparsedValue>;

/** CSS Typed OM `CSSVariableReferenceValue` — generated from IDL. */
export const CSSVariableReferenceValue = z.object({
  $type: z.literal("CSSVariableReferenceValue"),
  variable: z.string(),
  fallback: z.unknown(),
});
export type CSSVariableReferenceValue = z.infer<typeof CSSVariableReferenceValue>;

/** Any Typed OM value a token can hold. */
export const CSSStyleValue = z.discriminatedUnion("$type", [CSSOKLCH, CSSOKLab, CSSLCH, CSSLab, CSSRGB, CSSHSL, CSSHWB, CSSColor, CSSUnitValue, CSSKeywordValue, CSSUnparsedValue, CSSVariableReferenceValue]);
export type CSSStyleValue = z.infer<typeof CSSStyleValue>;
