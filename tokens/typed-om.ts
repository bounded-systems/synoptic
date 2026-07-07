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
  h: z.unknown(),
  w: z.unknown(),
  b: z.unknown(),
  alpha: z.unknown(),
});
export type CSSHWB = z.infer<typeof CSSHWB>;

/** CSS Typed OM `CSSColor` : CSSColorValue — generated from IDL. */
export const CSSColor = z.object({
  $type: z.literal("CSSColor"),
  colorSpace: z.string(),
  channels: z.unknown(),
  alpha: z.unknown(),
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

/** CSS Typed OM `CSSNumericValue` : CSSStyleValue — generated from IDL. */
export const CSSNumericValue = z.object({
  $type: z.literal("CSSNumericValue"),

});
export type CSSNumericValue = z.infer<typeof CSSNumericValue>;

/** CSS Typed OM `CSSMathSum` : CSSMathValue — generated from IDL. */
export const CSSMathSum = z.object({
  $type: z.literal("CSSMathSum"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathSum = z.infer<typeof CSSMathSum>;

/** CSS Typed OM `CSSMathProduct` : CSSMathValue — generated from IDL. */
export const CSSMathProduct = z.object({
  $type: z.literal("CSSMathProduct"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathProduct = z.infer<typeof CSSMathProduct>;

/** CSS Typed OM `CSSMathNegate` : CSSMathValue — generated from IDL. */
export const CSSMathNegate = z.object({
  $type: z.literal("CSSMathNegate"),
  operator: z.string(),
  value: z.unknown(),
});
export type CSSMathNegate = z.infer<typeof CSSMathNegate>;

/** CSS Typed OM `CSSMathInvert` : CSSMathValue — generated from IDL. */
export const CSSMathInvert = z.object({
  $type: z.literal("CSSMathInvert"),
  operator: z.string(),
  value: z.unknown(),
});
export type CSSMathInvert = z.infer<typeof CSSMathInvert>;

/** CSS Typed OM `CSSMathMin` : CSSMathValue — generated from IDL. */
export const CSSMathMin = z.object({
  $type: z.literal("CSSMathMin"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathMin = z.infer<typeof CSSMathMin>;

/** CSS Typed OM `CSSMathMax` : CSSMathValue — generated from IDL. */
export const CSSMathMax = z.object({
  $type: z.literal("CSSMathMax"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathMax = z.infer<typeof CSSMathMax>;

/** CSS Typed OM `CSSMathClamp` : CSSMathValue — generated from IDL. */
export const CSSMathClamp = z.object({
  $type: z.literal("CSSMathClamp"),
  operator: z.string(),
  lower: z.unknown(),
  value: z.unknown(),
  upper: z.unknown(),
});
export type CSSMathClamp = z.infer<typeof CSSMathClamp>;

/** CSS Typed OM `CSSImageValue` : CSSStyleValue — generated from IDL. */
export const CSSImageValue = z.object({
  $type: z.literal("CSSImageValue"),

});
export type CSSImageValue = z.infer<typeof CSSImageValue>;

/** CSS Typed OM `CSSTransformValue` : CSSStyleValue — generated from IDL. */
export const CSSTransformValue = z.object({
  $type: z.literal("CSSTransformValue"),
  length: z.number(),
  is2D: z.boolean(),
});
export type CSSTransformValue = z.infer<typeof CSSTransformValue>;

/** Any Typed OM value a token can hold. */
export const CSSStyleValue = z.discriminatedUnion("$type", [CSSOKLCH, CSSOKLab, CSSLCH, CSSLab, CSSRGB, CSSHSL, CSSHWB, CSSColor, CSSUnitValue, CSSKeywordValue, CSSUnparsedValue, CSSVariableReferenceValue, CSSNumericValue, CSSMathSum, CSSMathProduct, CSSMathNegate, CSSMathInvert, CSSMathMin, CSSMathMax, CSSMathClamp, CSSImageValue, CSSTransformValue]);
export type CSSStyleValue = z.infer<typeof CSSStyleValue>;
