---
"@json-render/core": minor
"@json-render/react": minor
"@json-render/shadcn": minor
---

New `@json-render/shadcn` package, event handles, built-in actions, and stream improvements.

### New: `@json-render/shadcn` Package

Pre-built [shadcn/ui](https://ui.shadcn.com/) component library for json-render. 30+ components built on Radix UI + Tailwind CSS, ready to use with `defineCatalog` and `defineRegistry`.

- `shadcnComponentDefinitions` — Zod-based catalog definitions for all components (server-safe, no React dependency via `@json-render/shadcn/catalog`)
- `shadcnComponents` — React implementations for all components
- Layout: Card, Stack, Grid, Separator
- Navigation: Tabs, Accordion, Collapsible, Pagination
- Overlay: Dialog, Drawer, Tooltip, Popover, DropdownMenu
- Content: Heading, Text, Image, Avatar, Badge, Alert, Carousel, Table
- Feedback: Progress, Skeleton, Spinner
- Input: Button, Link, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Toggle, ToggleGroup, ButtonGroup

### New: Event Handles (`on()`)

Components now receive an `on(event)` function in addition to `emit(event)`. The `on()` function returns an `EventHandle` with metadata:
- `emit()` — fire the event
- `shouldPreventDefault` — whether any action binding requested `preventDefault`
- `bound` — whether any handler is bound to this event

### New: `BaseComponentProps`

Catalog-agnostic base type for component render functions. Use when building reusable component libraries (like `@json-render/shadcn`) that are not tied to a specific catalog.

### New: Built-in Actions in Schema

Schemas can now declare `builtInActions` — actions that are always available at runtime and automatically injected into prompts. The React schema declares `setState`, `pushState`, and `removeState` as built-in, so they appear in prompts without needing to be listed in catalog `actions`.

### New: `preventDefault` on `ActionBinding`

Action bindings now support a `preventDefault` boolean field, allowing the LLM to request that default browser behavior (e.g. navigation on links) be prevented.

### Improved: Stream Transform Text Block Splitting

`createJsonRenderTransform()` now properly splits text blocks around spec data by emitting `text-end`/`text-start` pairs. This ensures the AI SDK creates separate text parts, preserving correct interleaving of prose and UI in `message.parts`.

### Improved: `defineRegistry` Actions Requirement

`defineRegistry` now conditionally requires the `actions` field only when the catalog declares actions. Catalogs with no actions (e.g. `actions: {}`) no longer need to pass an empty actions object.
