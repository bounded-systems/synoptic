// packages plugin — the org's packages as SoftwareSourceCode, linked by buildsOn
// (registry edges). This is the RDF spine: nodes + @id references between them.
export const id = "packages";
export async function parse(ctx) {
  const reg = ctx.readMaybe("data/registry.json") ?? { nodes: [], edges: [] };
  const pid = (n) => `${ctx.base}/#pkg-${n}`;
  return reg.nodes.map((n) => {
    const deps = reg.edges.filter((e) => e.from === n.name).map((e) => ({ "@id": pid(e.to) }));
    return {
      "@type": "SoftwareSourceCode",
      "@id": pid(n.name),
      name: n.name,
      ...(n.pkg ? { identifier: n.pkg } : {}),
      codeRepository: `https://github.com/bounded-systems/${n.name}`,
      ...(n.tagline ? { description: n.tagline } : {}),
      keywords: [n.kind, n.facet, n.role, n.domain].filter(Boolean),
      isPartOf: { "@id": `${ctx.base}/#org` },
      ...(deps.length ? { buildsOn: deps } : {}),
    };
  });
}
