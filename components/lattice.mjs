// The contract-lattice component — projects the #lattice Dataset (a CLOSED
// subgraph per ck-graph-split) into a native-HTML panel that leads with the
// actual checks. Native, self-contained, accessible; the engine wraps it with
// provenance + a content digest.
export const roots = ["https://bounded.tools/#lattice"];
export const materials = [
  {
    uri: "https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json",
    path: "data/lattice.json",
  },
];
export function render({ read, esc }) {
  const l = read("data/lattice.json");
  const s = l.summary;
  const checks = l.checks.map((c) =>
    `      <li class="lattice__check" data-result="${esc(c.result)}">` +
    `<span class="lattice__type">${esc(c.type)}</span> ` +
    `<span class="lattice__result">${esc(c.result)}</span> ` +
    `<span class="lattice__desc">${esc(c.summary)}</span></li>`
  ).join("\n");
  return `<section class="lattice" aria-labelledby="lattice-heading">
  <h2 id="lattice-heading">Contracts, graded against the running code</h2>
  <p class="lattice__lead">${s.checks} contracts carry a live check — <strong>${s.passing} passing</strong>, ${s.failing} failing — with ${s.declared} more declared. Coverage is not conformance; this is what is actually enforced.</p>
  <ul class="lattice__checks">
${checks}
  </ul>
</section>`;
}
