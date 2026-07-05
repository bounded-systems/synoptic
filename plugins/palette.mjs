// palette plugin — the design system as evidence. Parses design tokens (CSS custom
// properties) into a palette subgraph: each token a PropertyValue node. Now the graph
// holds design alongside content, so components can style FROM it and record which
// tokens they used — inspectable design provenance. kind: parse (evidence → graph).
export const kind = "parse";
export const id = "palette";
export async function parse(ctx) {
  const css = ctx.readTextMaybe("brand/tokens/tokens.css")
    ?? ctx.readTextMaybe("node_modules/@bounded-systems/brand/tokens/tokens.css")
    ?? ctx.readTextMaybe("node_modules/@bdelanghe/brand/tokens/tokens.css")
    ?? ctx.readTextMaybe("dist/brand/tokens/tokens.css")
    ?? ctx.readTextMaybe("vendor/brand/tokens/tokens.css")
    ?? ctx.readTextMaybe("styles.css") ?? "";
  const classify = (n) =>
    /color|fg|bg|accent|ink|surface|border/.test(n) ? "color"
    : /space|gap|pad|margin/.test(n) ? "spacing"
    : /radius|round/.test(n) ? "radius"
    : /font|text|size|weight|leading/.test(n) ? "typography"
    : "token";
  const tokens = [];
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    tokens.push({
      "@type": "PropertyValue",
      "@id": `${ctx.base}/#token-${name}`,
      name: `--${name}`,
      value: m[2].trim(),
      additionalType: classify(name),
      isPartOf: { "@id": `${ctx.base}/#palette` },
    });
  }
  return [
    { "@type": "DefinedTermSet", "@id": `${ctx.base}/#palette`, name: "Design palette", description: `${tokens.length} design tokens`, isPartOf: { "@id": `${ctx.base}/#org` } },
    ...tokens,
  ];
}
