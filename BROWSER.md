# Browser gates run on WebKit (tezcatl), not Chromium

Gates that need a real browser (`axe`, `lighthouse`) run against **tezcatl** — the
org's headless **WebKit** renderer, packaged as a Nix flake
([`bdelanghe/tezcatl-flake`](https://github.com/bdelanghe/tezcatl-flake)) — not
Playwright/Chromium. One engine, one browser, built and pinned like everything else.

- **The kit already supports it.** `axe-gate.mjs` takes `$AXE_RUNNER=tezcatl`; it
  injects `axe.min.js` into a tezcatl-rendered page (`$AXE_TEZCATL_WAIT` ms to
  settle). Chromium/Playwright is only the fallback default.
- **tezcatl is WebKit + macOS-native**, so browser gates run on a **macOS runner**
  with the flake in scope:
  ```yaml
  runs-on: macos-14
  steps:
    - uses: DeterminateSystems/nix-installer-action
    - run: nix run github:bdelanghe/tezcatl-flake -- --version   # provision tezcatl
    - run: AXE_RUNNER=tezcatl node .conformance-kit/gates/axe-gate.mjs dist
  ```
- **In `site-ci.yml`** this is a `browser: true` path: a separate macOS job that
  provisions tezcatl and runs the browser gates the config declares, so the site
  still just configures — the engine owns the WebKit provisioning.

Why WebKit and not Chromium: it's the org's own renderer (auditable, pinned via the
flake's lock), it matches Safari/WebKit reality, and it keeps the toolchain Nix-pure
instead of pulling a large vendor browser binary at CI time.
