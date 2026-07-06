// CSS Typed OM Level 1 — value interfaces (subset we project). Source of truth is
// @webref/idl (css-typed-om); this is the vendored fallback.
[Exposed=(Window,Worker,PaintWorklet,LayoutWorklet)]
interface CSSStyleValue {
  stringifier;
};

[Exposed=(Window,Worker,LayoutWorklet,PaintWorklet)]
interface CSSNumericValue : CSSStyleValue {
};

[Exposed=(Window,Worker,LayoutWorklet,PaintWorklet)]
interface CSSUnitValue : CSSNumericValue {
  constructor(double value, USVString unit);
  attribute double value;
  readonly attribute USVString unit;
};

[Exposed=(Window,Worker,LayoutWorklet,PaintWorklet)]
interface CSSKeywordValue : CSSStyleValue {
  constructor(USVString value);
  attribute USVString value;
};
