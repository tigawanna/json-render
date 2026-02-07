# @json-render/core

Core library for json-render. Define schemas, create catalogs, generate AI prompts, and stream specs.

## Installation

```bash
npm install @json-render/core zod
```

## Key Concepts

- **Schema**: Defines the structure of specs and catalogs
- **Catalog**: Maps component/action names to their definitions with Zod props
- **Spec**: JSON output from AI that conforms to the schema
- **SpecStream**: JSONL streaming format for progressive spec building

## Quick Start

### Define a Schema

```typescript
import { defineSchema } from "@json-render/core";

export const schema = defineSchema((s) => ({
  spec: s.object({
    root: s.object({
      type: s.ref("catalog.components"),
      props: s.propsOf("catalog.components"),
      children: s.array(s.self()),
    }),
  }),
  catalog: s.object({
    components: s.map({
      props: s.zod(),
      description: s.string(),
    }),
    actions: s.map({
      description: s.string(),
    }),
  }),
}), {
  promptTemplate: myPromptTemplate, // Optional custom AI prompt generator
});
```

### Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "./schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
      }),
      description: "A card container with title",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).nullable(),
      }),
      description: "A clickable button",
    },
  },
  actions: {
    submit: { description: "Submit the form" },
    cancel: { description: "Cancel and close" },
  },
});
```

### Generate AI Prompts

```typescript
// Generate system prompt for AI
const systemPrompt = catalog.prompt();

// With custom rules
const systemPrompt = catalog.prompt({
  system: "You are a dashboard builder.",
  customRules: [
    "Always include a header",
    "Use Card components for grouping",
  ],
});
```

### Stream AI Responses (SpecStream)

The SpecStream format uses JSONL patches to progressively build specs:

```typescript
import { createSpecStreamCompiler } from "@json-render/core";

// Create a compiler for your spec type
const compiler = createSpecStreamCompiler<MySpec>();

// Process streaming chunks from AI
while (streaming) {
  const chunk = await reader.read();
  const { result, newPatches } = compiler.push(chunk);
  
  if (newPatches.length > 0) {
    // Update UI with partial result
    setSpec(result);
  }
}

// Get final compiled result
const finalSpec = compiler.getResult();
```

SpecStream format uses [RFC 6902 JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902) operations (each line is a patch):

```jsonl
{"op":"add","path":"/root/type","value":"Card"}
{"op":"add","path":"/root/props","value":{"title":"Hello"}}
{"op":"add","path":"/root/children/0","value":{"type":"Button","props":{"label":"Click"}}}
```

All six RFC 6902 operations are supported: `add`, `remove`, `replace`, `move`, `copy`, `test`.

### Low-Level Utilities

```typescript
import {
  parseSpecStreamLine,
  applySpecStreamPatch,
  compileSpecStream,
} from "@json-render/core";

// Parse a single line
const patch = parseSpecStreamLine('{"op":"add","path":"/root","value":{}}');
// { op: "add", path: "/root", value: {} }

// Apply a patch to an object
const obj = {};
applySpecStreamPatch(obj, patch);
// obj is now { root: {} }

// Compile entire JSONL string at once
const spec = compileSpecStream<MySpec>(jsonlString);
```

## API Reference

### Schema

| Export | Purpose |
|--------|---------|
| `defineSchema(builder, options?)` | Create a schema with spec/catalog structure |
| `SchemaBuilder` | Builder with `s.object()`, `s.array()`, `s.map()`, etc. |

### Catalog

| Export | Purpose |
|--------|---------|
| `defineCatalog(schema, data)` | Create a type-safe catalog from schema |
| `catalog.prompt(options?)` | Generate AI system prompt |

### SpecStream

| Export | Purpose |
|--------|---------|
| `createSpecStreamCompiler<T>()` | Create streaming compiler |
| `parseSpecStreamLine(line)` | Parse single JSONL line |
| `applySpecStreamPatch(obj, patch)` | Apply patch to object |
| `compileSpecStream<T>(jsonl)` | Compile entire JSONL string |

### Types

| Export | Purpose |
|--------|---------|
| `Spec` | Base spec type |
| `Catalog` | Catalog type |
| `SpecStreamLine` | Single patch operation |
| `SpecStreamCompiler` | Streaming compiler interface |

## Custom Schemas

json-render supports completely different spec formats for different renderers:

```typescript
// React: Element tree
{ root: { type: "Card", props: {...}, children: [...] } }

// Remotion: Timeline
{ composition: {...}, tracks: [...], clips: [...] }

// Your own: Whatever you need
{ pages: [...], navigation: {...}, theme: {...} }
```

Each renderer defines its own schema with `defineSchema()` and its own prompt template.
