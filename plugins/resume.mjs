// resume plugin — a JSON Resume (basics + work + skills) parsed into a Person subgraph
// + the organizations they worked for, linked by worksFor. The personal-site analogue
// of org/packages. kind: parse (evidence → graph).
export const kind = "parse";
export const id = "resume";
export async function parse(ctx) {
  const r = ctx.readMaybe("data/linkedin/resume.json") ?? ctx.readMaybe("data/resume.json");
  if (!r) return [];
  const b = r.basics ?? {};
  const personId = `${ctx.base}/#person`;
  const person = {
    "@type": "Person",
    "@id": personId,
    name: b.name,
    ...(b.label ? { jobTitle: b.label } : {}),
    ...(b.url ? { url: b.url } : {}),
    ...(b.summary ? { description: b.summary } : {}),
    ...(Array.isArray(b.profiles) ? { sameAs: b.profiles.map((p) => p.url).filter(Boolean) } : {}),
    ...(Array.isArray(r.skills) ? { knowsAbout: r.skills.map((s) => s.name).filter(Boolean) } : {}),
  };
  const orgs = [];
  (r.work ?? []).forEach((w, i) => {
    if (!w.name) return;
    const oid = `${ctx.base}/#work-${i}`;
    orgs.push({
      "@type": "Organization",
      "@id": oid,
      name: w.name,
      ...(w.position ? { description: w.position } : {}),
      ...(w.startDate ? { foundingDate: undefined } : {}),
    });
    (person.worksFor ??= []).push({ "@id": oid });
  });
  return [person, ...orgs];
}
