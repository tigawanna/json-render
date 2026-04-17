# Changelog

## 0.18.0

<!-- release:start -->
### New Features

- **Devtools** — Five new packages for inspecting json-render apps in the browser: `@json-render/devtools` (framework-agnostic core), plus `@json-render/devtools-react`, `@json-render/devtools-vue`, `@json-render/devtools-svelte`, and `@json-render/devtools-solid` adapters. Drop `<JsonRenderDevtools />` into your app to get a shadow-DOM-isolated panel with six tabs (Spec, State, Actions, Stream, Catalog, Pick), a DOM picker that maps clicked elements back to spec keys via `data-jr-key`, a capped event store, and server-side stream tap utilities. Floating toggle or `Cmd`/`Ctrl` + `Shift` + `J`, tree-shakes to `null` in production (#273)
- **Devtools example** — New `examples/devtools` Next.js demo showing the full devtools panel wired up to an AI chat endpoint and a component catalog (#273)
- **Action observer and devtools flag in core** — `@json-render/core` now exposes an action observer and a devtools enablement flag that adapters use to mirror actions and stream events into the panel (#273)

### Bug Fixes

- **Zod 4 schema formatting** — `formatZodType` now correctly handles `z.record()`, `z.default()`, and `z.literal()` types from Zod 4, which previously produced incorrect or empty output in generated prompts and schemas (#239)

### Improvements

- **Zod 4 test coverage** — Added unit tests for `formatZodType` covering record, default, and literal types to guard against regressions (#272)

### Contributors

- @ctate
- @mvanhorn
<!-- release:end -->

## 0.17.0

### New Features

- **Gaussian Splatting** — Added `GaussianSplat` component to `@json-render/react-three-fiber`, bringing the component count to 20. Composable with all existing R3F components (lights, controls, post-processing) via drei's Splat loader (#259)
- **Standalone gsplat example** — Experimental demo app showcasing Gaussian Splatting with gsplat.js (no Three.js dependency), featuring scene selector, live JSON spec viewer, and progress indicator (#259)
- **R3F gsplat example** — Demo app with five scenes: splat showroom, splat with primitives, multi-splat, post-processing effects, and animated floating splat (#259)

### Improved

- **AI output quality** — Improved prompt output and schema generation for more reliable AI-generated specs (#268)

### Contributors

- @ctate
- @willmanzoli

## 0.16.0

### Improved

- **Release process** — Switched from Changesets to a manual single-PR release workflow with changelog markers and automatic npm publish on version bump
