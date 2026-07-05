// org plugin — the Organization root node from the site's content tokens.
export const kind = "parse"; // assists evidence → graph
export const id = "org";
export async function parse(ctx) {
  const s = ctx.readMaybe("content/strings.json") ?? {};
  const tok = (k, fb) => { const t = s[k]; return t?.$value ?? t?.value ?? (typeof t === "string" ? t : fb); };
  return [{
    "@type": "Organization",
    "@id": `${ctx.base}/#org`,
    name: tok("name", "Bounded Systems"),
    alternateName: tok("site-name", undefined),
    url: ctx.base,
    description: tok("description", "Bounded authority for AI agents."),
  }];
}
