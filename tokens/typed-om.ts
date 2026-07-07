// GENERATED from @webref/idl (css-typed-om) by gen-typed-om.ts — do not edit by hand.
// The CSS Typed OM value interfaces, projected to Zod. Every type is grounded in the spec:
//   CSS Typed OM Level 1: https://drafts.css-houdini.org/css-typed-om/  (CSSStyleValue, CSSUnitValue, CSSKeywordValue, CSSNumericValue, CSSMath*)
//   CSS Typed OM Level 2: https://drafts.css-houdini.org/css-typed-om-2/  (CSSColorValue, CSSOKLCH, CSSColor, …)
// Our color token's $value IS a CSSOKLCH (Typed OM 2 §color); a value's identity includes its
// [[associatedProperty]] (Typed OM 1 §cssstylevalue) — which is our property-token layer.
import { z } from "zod";

/** CSS Typed OM 2 `CSSOKLCH` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#cssoklch */
export const CSSOKLCH = z.object({
  $type: z.literal("CSSOKLCH"),
  l: z.number(),
  c: z.number(),
  h: z.number(),
  alpha: z.number(),
});
export type CSSOKLCH = z.infer<typeof CSSOKLCH>;

/** CSS Typed OM 2 `CSSOKLab` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#cssoklab */
export const CSSOKLab = z.object({
  $type: z.literal("CSSOKLab"),
  l: z.number(),
  a: z.number(),
  b: z.number(),
  alpha: z.number(),
});
export type CSSOKLab = z.infer<typeof CSSOKLab>;

/** CSS Typed OM 2 `CSSLCH` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#csslch */
export const CSSLCH = z.object({
  $type: z.literal("CSSLCH"),
  l: z.number(),
  c: z.number(),
  h: z.number(),
  alpha: z.number(),
});
export type CSSLCH = z.infer<typeof CSSLCH>;

/** CSS Typed OM 2 `CSSLab` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#csslab */
export const CSSLab = z.object({
  $type: z.literal("CSSLab"),
  l: z.number(),
  a: z.number(),
  b: z.number(),
  alpha: z.number(),
});
export type CSSLab = z.infer<typeof CSSLab>;

/** CSS Typed OM 2 `CSSRGB` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#cssrgb */
export const CSSRGB = z.object({
  $type: z.literal("CSSRGB"),
  r: z.unknown(),
  g: z.unknown(),
  b: z.unknown(),
  alpha: z.number(),
});
export type CSSRGB = z.infer<typeof CSSRGB>;

/** CSS Typed OM 2 `CSSHSL` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#csshsl */
export const CSSHSL = z.object({
  $type: z.literal("CSSHSL"),
  h: z.number(),
  s: z.number(),
  l: z.number(),
  alpha: z.number(),
});
export type CSSHSL = z.infer<typeof CSSHSL>;

/** CSS Typed OM 2 `CSSHWB` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#csshwb */
export const CSSHWB = z.object({
  $type: z.literal("CSSHWB"),
  h: z.unknown(),
  w: z.unknown(),
  b: z.unknown(),
  alpha: z.unknown(),
});
export type CSSHWB = z.infer<typeof CSSHWB>;

/** CSS Typed OM 2 `CSSColor` : CSSColorValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om-2/#csscolor */
export const CSSColor = z.object({
  $type: z.literal("CSSColor"),
  colorSpace: z.string(),
  channels: z.unknown(),
  alpha: z.unknown(),
});
export type CSSColor = z.infer<typeof CSSColor>;

/** CSS Typed OM 1 `CSSUnitValue` : CSSNumericValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssunitvalue */
export const CSSUnitValue = z.object({
  $type: z.literal("CSSUnitValue"),
  value: z.number(),
  unit: z.string(),
});
export type CSSUnitValue = z.infer<typeof CSSUnitValue>;

/** CSS Typed OM 1 `CSSKeywordValue` : CSSStyleValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#csskeywordvalue */
export const CSSKeywordValue = z.object({
  $type: z.literal("CSSKeywordValue"),
  value: z.string(),
});
export type CSSKeywordValue = z.infer<typeof CSSKeywordValue>;

/** CSS Typed OM 1 `CSSUnparsedValue` : CSSStyleValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssunparsedvalue */
export const CSSUnparsedValue = z.object({
  $type: z.literal("CSSUnparsedValue"),
  length: z.number(),
});
export type CSSUnparsedValue = z.infer<typeof CSSUnparsedValue>;

/** CSS Typed OM 1 `CSSVariableReferenceValue` — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssvariablereferencevalue */
export const CSSVariableReferenceValue = z.object({
  $type: z.literal("CSSVariableReferenceValue"),
  variable: z.string(),
  fallback: z.unknown(),
});
export type CSSVariableReferenceValue = z.infer<typeof CSSVariableReferenceValue>;

/** CSS Typed OM 1 `CSSNumericValue` : CSSStyleValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssnumericvalue */
export const CSSNumericValue = z.object({
  $type: z.literal("CSSNumericValue"),

});
export type CSSNumericValue = z.infer<typeof CSSNumericValue>;

/** CSS Typed OM 1 `CSSMathSum` : CSSMathValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssmathsum */
export const CSSMathSum = z.object({
  $type: z.literal("CSSMathSum"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathSum = z.infer<typeof CSSMathSum>;

/** CSS Typed OM 1 `CSSMathProduct` : CSSMathValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssmathproduct */
export const CSSMathProduct = z.object({
  $type: z.literal("CSSMathProduct"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathProduct = z.infer<typeof CSSMathProduct>;

/** CSS Typed OM 1 `CSSMathNegate` : CSSMathValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssmathnegate */
export const CSSMathNegate = z.object({
  $type: z.literal("CSSMathNegate"),
  operator: z.string(),
  value: z.unknown(),
});
export type CSSMathNegate = z.infer<typeof CSSMathNegate>;

/** CSS Typed OM 1 `CSSMathInvert` : CSSMathValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssmathinvert */
export const CSSMathInvert = z.object({
  $type: z.literal("CSSMathInvert"),
  operator: z.string(),
  value: z.unknown(),
});
export type CSSMathInvert = z.infer<typeof CSSMathInvert>;

/** CSS Typed OM 1 `CSSMathMin` : CSSMathValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssmathmin */
export const CSSMathMin = z.object({
  $type: z.literal("CSSMathMin"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathMin = z.infer<typeof CSSMathMin>;

/** CSS Typed OM 1 `CSSMathMax` : CSSMathValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssmathmax */
export const CSSMathMax = z.object({
  $type: z.literal("CSSMathMax"),
  operator: z.string(),
  values: z.array(z.unknown()),
});
export type CSSMathMax = z.infer<typeof CSSMathMax>;

/** CSS Typed OM 1 `CSSMathClamp` : CSSMathValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssmathclamp */
export const CSSMathClamp = z.object({
  $type: z.literal("CSSMathClamp"),
  operator: z.string(),
  lower: z.unknown(),
  value: z.unknown(),
  upper: z.unknown(),
});
export type CSSMathClamp = z.infer<typeof CSSMathClamp>;

/** CSS Typed OM 1 `CSSImageValue` : CSSStyleValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#cssimagevalue */
export const CSSImageValue = z.object({
  $type: z.literal("CSSImageValue"),

});
export type CSSImageValue = z.infer<typeof CSSImageValue>;

/** CSS Typed OM 1 `CSSTransformValue` : CSSStyleValue — generated from IDL. https://drafts.css-houdini.org/css-typed-om/#csstransformvalue */
export const CSSTransformValue = z.object({
  $type: z.literal("CSSTransformValue"),
  length: z.number(),
  is2D: z.boolean(),
});
export type CSSTransformValue = z.infer<typeof CSSTransformValue>;

/** Any Typed OM value a token can hold. */
export const CSSStyleValue = z.discriminatedUnion("$type", [CSSOKLCH, CSSOKLab, CSSLCH, CSSLab, CSSRGB, CSSHSL, CSSHWB, CSSColor, CSSUnitValue, CSSKeywordValue, CSSUnparsedValue, CSSVariableReferenceValue, CSSNumericValue, CSSMathSum, CSSMathProduct, CSSMathNegate, CSSMathInvert, CSSMathMin, CSSMathMax, CSSMathClamp, CSSImageValue, CSSTransformValue]);
export type CSSStyleValue = z.infer<typeof CSSStyleValue>;
