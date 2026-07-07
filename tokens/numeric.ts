// GENERATED from @webref/idl (css-typed-om §numeric) by gen-numeric.ts — do not edit.
// https://drafts.css-houdini.org/css-typed-om/#numeric-objects
import { z } from "zod";

/** The 7 numeric base types — a unit's dimension. A CSSNumericType is a vector over these. */
export const CssNumericBaseType = z.enum(["length","angle","time","frequency","resolution","flex","percent"] as [string, ...string[]]);
export type CssNumericBaseType = z.infer<typeof CssNumericBaseType>;

/** CSSMathValue operators (calc tree). */
export const CssMathOperator = z.enum(["sum","product","negate","invert","min","max","clamp"] as [string, ...string[]]);
export type CssMathOperator = z.infer<typeof CssMathOperator>;

/** Every unit the CSS namespace mints (63). */
export const CssUnit = z.enum(["number","percent","cap","ch","em","ex","ic","lh","rcap","rch","rem","rex","ric","rlh","vw","vh","vi","vb","vmin","vmax","svw","svh","svi","svb","svmin","svmax","lvw","lvh","lvi","lvb","lvmin","lvmax","dvw","dvh","dvi","dvb","dvmin","dvmax","cqw","cqh","cqi","cqb","cqmin","cqmax","cm","mm","Q","in","pt","pc","px","deg","grad","rad","turn","s","ms","Hz","kHz","dpi","dpcm","dppx","fr"] as [string, ...string[]]);
export type CssUnit = z.infer<typeof CssUnit>;

/** Length units (rem, ch, em, vw, px, …) — our dimension/measure surface. */
export const LengthUnit = z.enum(["cap","ch","em","ex","ic","lh","rcap","rch","rem","rex","ric","rlh","vw","vh","vi","vb","vmin","vmax","svw","svh","svi","svb","svmin","svmax","lvw","lvh","lvi","lvb","lvmin","lvmax","dvw","dvh","dvi","dvb","dvmin","dvmax","cqw","cqh","cqi","cqb","cqmin","cqmax","cm","mm","Q","in","pt","pc","px"] as [string, ...string[]]);
export type LengthUnit = z.infer<typeof LengthUnit>;

/** Angle units. */
export const AngleUnit = z.enum(["deg","grad","rad","turn"] as [string, ...string[]]);
export type AngleUnit = z.infer<typeof AngleUnit>;

/** unit → its base type (rem → length, deg → angle, number → number, …). */
export const UNIT_BASE_TYPE: Record<string, string> = {"cap":"length","ch":"length","em":"length","ex":"length","ic":"length","lh":"length","rcap":"length","rch":"length","rem":"length","rex":"length","ric":"length","rlh":"length","vw":"length","vh":"length","vi":"length","vb":"length","vmin":"length","vmax":"length","svw":"length","svh":"length","svi":"length","svb":"length","svmin":"length","svmax":"length","lvw":"length","lvh":"length","lvi":"length","lvb":"length","lvmin":"length","lvmax":"length","dvw":"length","dvh":"length","dvi":"length","dvb":"length","dvmin":"length","dvmax":"length","cqw":"length","cqh":"length","cqi":"length","cqb":"length","cqmin":"length","cqmax":"length","cm":"length","mm":"length","Q":"length","in":"length","pt":"length","pc":"length","px":"length","number":"number","percent":"percent","deg":"angle","grad":"angle","rad":"angle","turn":"angle","s":"time","ms":"time","Hz":"frequency","kHz":"frequency","dpi":"resolution","dpcm":"resolution","dppx":"resolution","fr":"flex"};
