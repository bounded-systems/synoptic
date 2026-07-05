// jargon plugin — the grounded vocabulary as a DefinedTermSet (term → source).
export const id = "jargon";
export async function parse(ctx) {
  const j = ctx.readMaybe("data/jargon.json") ?? {};
  const terms = Object.entries(j).filter(([k]) => !k.startsWith("$"))
    .map(([term, v]) => ({ "@type": "DefinedTerm", name: term, ...(typeof v === "string" ? { url: v } : v?.url ? { url: v.url } : {}) }));
  return [{ "@type": "DefinedTermSet", "@id": `${ctx.base}/#jargon`, name: "Grounded jargon", hasDefinedTerm: terms }];
}
