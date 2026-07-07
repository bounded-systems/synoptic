// GENERATED from @webref/css by gen-font.ts — do not edit by hand.
// font-family reifies to a generic CSSStyleValue (a stack); no direct WCAG rule constrains the
// typeface. https://drafts.csswg.org/css-fonts-4/#generic-font-families
import { z } from "zod";

/** CSS generic font families (incl. the OS-native ui-* + system-ui). */
export const GenericFontFamily = z.enum([] as [string, ...string[]]);
export type GenericFontFamily = z.infer<typeof GenericFontFamily>;

/** The OS "default" system-font stacks on the web — system-ui surfaces SF/Segoe UI/Roboto. */
export const SYSTEM_FONT_STACKS = {
  "sans": [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif"
  ],
  "serif": [
    "ui-serif",
    "Georgia",
    "Cambria",
    "Times New Roman",
    "Times",
    "serif"
  ],
  "mono": [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    "Liberation Mono",
    "monospace"
  ]
} as const;

/** A font-family token — a stack ending in a generic. Reifies to a generic CSSStyleValue. */
export const FontFamily = z.object({
  $type: z.literal("font-family"),
  $value: z.array(z.string()).min(1),
  $generic: GenericFontFamily,
  $reifiesTo: z.literal("CSSStyleValue"),
  $description: z.string(),
});
export type FontFamily = z.infer<typeof FontFamily>;
