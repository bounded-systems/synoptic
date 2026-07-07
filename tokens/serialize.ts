// The CSS Typed OM stringifier — a typed CSSStyleValue → CSS text (spec §6 serialization, the
// `stringifier` on CSSStyleValue). This is the ONE place a typed value becomes a string; everything
// upstream is a typed object. Its inverse is CSSStyleValue.parse() (browser-only). A Declaration
// binds a typed property to a typed value — the type-driven unit the emitter builds, never strings.
import { z } from "zod";
import { CssProperty } from "./properties.ts";
import { CSSKeywordValue, CSSMathClamp, CSSMathProduct, CSSMathSum, CSSOKLab, CSSOKLCH, CSSUnitValue, CSSVariableReferenceValue } from "./typed-om.ts";

/** Any typed value a declaration can hold. */
export const StyleValue = z.union([CSSOKLCH, CSSOKLab, CSSUnitValue, CSSKeywordValue, CSSMathSum, CSSMathProduct, CSSMathClamp, CSSVariableReferenceValue]);
export type StyleValue = z.infer<typeof StyleValue>;

// deno-lint-ignore no-explicit-any
/** A typed var() reference — the CSS-native indirection to a token. */
export const varRef = (name: string, fallback: any = null) => ({ $type: "CSSVariableReferenceValue" as const, variable: name, fallback });

/** A typed declaration — a property bound to a typed value. The type-driven unit. */
export const Declaration = z.object({ selector: z.string(), property: CssProperty, value: StyleValue });
export type Declaration = z.infer<typeof Declaration>;

// deno-lint-ignore no-explicit-any
type V = any;
/** Serialize a typed CSSStyleValue to CSS text (the Typed OM stringifier). */
export function serialize(v: V): string {
  switch (v?.$type) {
    case "CSSOKLCH": return `oklch(${v.l}% ${v.c} ${v.h}${v.alpha === 1 ? "" : ` / ${v.alpha}`})`;
    case "CSSOKLab": return `oklab(${v.l}% ${v.a} ${v.b}${v.alpha === 1 ? "" : ` / ${v.alpha}`})`;
    case "CSSUnitValue": return v.unit === "number" ? String(v.value) : v.unit === "percent" ? `${v.value}%` : `${v.value}${v.unit}`;
    case "CSSKeywordValue": return String(v.value);
    case "CSSMathSum": return `calc(${v.values.map(serialize).join(" + ")})`;
    case "CSSMathProduct": return `calc(${v.values.map(serialize).join(" * ")})`;
    case "CSSMathClamp": return `clamp(${serialize(v.lower)}, ${serialize(v.value)}, ${serialize(v.upper)})`;
    case "CSSVariableReferenceValue": return v.fallback ? `var(${v.variable}, ${serialize(v.fallback)})` : `var(${v.variable})`;
    default: return String(v);
  }
}

/** The @property `syntax` descriptor for a typed value — derived from its Typed OM type. */
export function syntaxOf(v: V): string {
  if (/^CSS(OKLCH|OKLab|RGB|HSL|Lab|LCH|HWB|Color)$/.test(v?.$type)) return "<color>";
  if (v?.$type === "CSSUnitValue") return v.unit === "number" ? "<number>" : v.unit === "percent" ? "<percentage>" : "<length>";
  return "*";
}

/** Serialize a typed Declaration to a CSS declaration string — property: value;. */
export function serializeDeclaration(d: Declaration): string {
  return `${d.property}: ${serialize(d.value)};`;
}
