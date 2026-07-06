// CSS Typed OM (css-typed-om + css-typed-om-2) — the AUTHORITATIVE WebIDL, vendored
// verbatim. gen-value-schemas derives value/* from THIS (or @webref/idl in CI).
//
// PIN — Houdini specs are EDITOR'S DRAFTS (ED, provisional, they MOVE). This is a vendored
// SNAPSHOT, pinned so the grounding is hermetic:
//   spec:     CSS Typed OM Level 1 + 2  (css-typed-om, css-typed-om-2)
//   source:   drafts.css-houdini.org/css-typed-om/ · github.com/w3c/csswg-drafts (Bikeshed)
//   status:   ED (no W3C maturity; pin the snapshot, expect churn)
//   vendored: 2026-07-06  (bump this date + re-run gen-value-schemas when re-vendoring)
//   CI:       @webref/idl pins css-typed-om by release; prefer it over this snapshot
[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSStyleValue {
    stringifier;
    [Exposed=Window] static CSSStyleValue parse(USVString property, USVString cssText);
    [Exposed=Window] static sequence<CSSStyleValue> parseAll(USVString property, USVString cssText);
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSUnparsedValue : CSSStyleValue {
    constructor(sequence<CSSUnparsedSegment> members);
    iterable<CSSUnparsedSegment>;
    readonly attribute unsigned long length;
    getter CSSUnparsedSegment (unsigned long index);
    setter undefined (unsigned long index, CSSUnparsedSegment val);
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSVariableReferenceValue {
    constructor(USVString variable, optional CSSUnparsedValue? fallback = null);
    attribute USVString variable;
    readonly attribute CSSUnparsedValue? fallback;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSKeywordValue : CSSStyleValue {
    constructor(USVString value);
    attribute USVString value;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSNumericValue : CSSStyleValue {
    CSSUnitValue to(USVString unit);
    CSSNumericType type();
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSUnitValue : CSSNumericValue {
    constructor(double value, USVString unit);
    attribute double value;
    readonly attribute USVString unit;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSMathValue : CSSNumericValue {
    readonly attribute CSSMathOperator operator;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSColorValue : CSSStyleValue {
    [Exposed=Window] static (CSSColorValue or CSSStyleValue) parse(USVString cssText);
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSRGB : CSSColorValue {
    constructor(CSSColorRGBComp r, CSSColorRGBComp g, CSSColorRGBComp b, optional CSSColorPercent alpha);
    attribute CSSColorRGBComp r;
    attribute CSSColorRGBComp g;
    attribute CSSColorRGBComp b;
    attribute CSSColorPercent alpha;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSHSL : CSSColorValue {
    constructor(CSSColorAngle h, CSSColorPercent s, CSSColorPercent l, optional CSSColorPercent alpha);
    attribute CSSColorAngle h;
    attribute CSSColorPercent s;
    attribute CSSColorPercent l;
    attribute CSSColorPercent alpha;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSLab : CSSColorValue {
    constructor(CSSColorPercent l, CSSColorNumber a, CSSColorNumber b, optional CSSColorPercent alpha);
    attribute CSSColorPercent l;
    attribute CSSColorNumber a;
    attribute CSSColorNumber b;
    attribute CSSColorPercent alpha;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSLCH : CSSColorValue {
    constructor(CSSColorPercent l, CSSColorPercent c, CSSColorAngle h, optional CSSColorPercent alpha);
    attribute CSSColorPercent l;
    attribute CSSColorPercent c;
    attribute CSSColorAngle h;
    attribute CSSColorPercent alpha;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSOKLab : CSSColorValue {
    constructor(CSSColorPercent l, CSSColorNumber a, CSSColorNumber b, optional CSSColorPercent alpha);
    attribute CSSColorPercent l;
    attribute CSSColorNumber a;
    attribute CSSColorNumber b;
    attribute CSSColorPercent alpha;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSOKLCH : CSSColorValue {
    constructor(CSSColorPercent l, CSSColorPercent c, CSSColorAngle h, optional CSSColorPercent alpha);
    attribute CSSColorPercent l;
    attribute CSSColorPercent c;
    attribute CSSColorAngle h;
    attribute CSSColorPercent alpha;
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface CSSColor : CSSColorValue {
    constructor(CSSKeywordish colorSpace, sequence<CSSColorPercent> channels, optional CSSNumberish alpha);
    attribute CSSKeywordish colorSpace;
    attribute CSSNumberish alpha;
};

// CSS Color 5 §12.1 — the @color-profile rule's CSSOM interface. NOT a value type (it's a
// CSSRule); it's the machine shape of a COLOR PROFILE, which we treat as a content atom
// {name, src, renderingIntent, components}. A profiled/CMYK color = {profile-ref, channels}.
[Exposed=Window]
interface CSSColorProfileRule {
  readonly attribute CSSOMString name;
  readonly attribute CSSOMString src;
  readonly attribute CSSOMString renderingIntent;
  readonly attribute CSSOMString components;
};
