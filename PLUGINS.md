# Plugins attach at clean ends — they assist a derivation, they don't add a layer

The layers are fixed (evidence → graph → site; see CORE.md / LAYERS.md). A plugin
**never interjects a new layer.** It attaches at one of the two clean ends of the
pipeline and **assists an existing derivation**:

```
  evidence ──parse plugins──▶ graph ──project plugins──▶ site
             (evidence end)           (projection end)
```

## Two kinds, two ends

- **`parse` plugins — the evidence end.** Read a source (a data file, a repo, a feed)
  and emit graph nodes. They assist the **evidence → graph** derivation. Each parses
  its *slice* of evidence; the core merges. `org`, `packages`, `lattice`, `jargon`.
    ```js
    export const kind = "parse";           // assists evidence → graph
    export async function parse(ctx) { return nodes; }
    ```
- **`project` plugins — the projection end.** Take a closed subgraph and render it
  (HTML/component/API). They assist the **graph → site** derivation. The `project`
  engine's components (`lattice` → a panel) are these.
    ```js
    export const kind = "project";         // assists graph → site
    export async function project(ctx) { return { html, materials }; }
    ```

## The rule

- A plugin **mutates/contributes to one layer's derivation**, at its input or output
  end. It does not create a layer, and it does not run between layers.
- If a plugin needs to read the graph *and* write back into it, that's a smell — it's
  trying to be a layer. Split it into a `parse` (evidence in) and a `project` (graph
  out).
- The core owns the layers and the merges; plugins own only the parsing at the bottom
  and the rendering at the top. Same core every site; the site's config lists which
  plugins run at each end.
