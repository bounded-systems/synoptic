# synoptic — the site-build engine

The validation layers live **here**, not in each site. A site declares its
artifacts in `synoptic.config.json`; `synoptic validate` runs the right
[conformance-kit](https://github.com/bounded-systems/conformance-kit) gate at each
layer, in order, trusting the layer below (see `LAYERS.md`). Change the pipeline
once, every site updates — derive, not copy.

```
0 proof   1 tokens   2 json-ld   3 markdown   4 website
          grounding  shacl       prose+scope  axe/structure
```

## Use (from a site)

```jsonc
// synoptic.config.json
{ "site": "bounded.tools",
  "layers": {
    "tokens":   { "tokens": "content/strings.json", "grounding": "data/audit/grounding.json" },
    "markdown": { "proseCorpus": "prose-corpus.json", "docCorpus": "doc-corpus.json" },
    "website":  { "dist": "dist" } } }
```

```sh
npx @bounded-systems/synoptic validate            # report
npx @bounded-systems/synoptic validate --strict   # fail CI
```

The engine ORCHESTRATES; it never re-implements a gate. Sites stay thin — content
+ config. `bounded.tools` and `bdelanghe/site` consume the same engine, so neither
one's quirks drive the checks.
