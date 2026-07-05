// lattice plugin — the contract lattice (gen-lattice's data) piped into the graph as
// a Dataset with each verified contract a PropertyValue. Pipes into jsonld.
export const id = "lattice";
export async function parse(ctx) {
  const l = ctx.readMaybe("data/lattice.json");
  if (!l) return [];
  const s = l.summary ?? {};
  return [{
    "@type": "Dataset",
    "@id": `${ctx.base}/#lattice`,
    name: "The contract lattice",
    description: `${s.checks} contracts with a live check (${s.passing} passing, ${s.failing} failing); ${s.declared} declared; across ${s.nodes} repos.`,
    isPartOf: { "@id": `${ctx.base}/#org` },
    variableMeasured: (l.checks ?? []).map((c) => ({ "@type": "PropertyValue", name: c.type, value: c.result, description: c.summary })),
    distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: "https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json" },
  }];
}
