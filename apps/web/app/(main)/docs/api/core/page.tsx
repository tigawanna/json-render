import { Code } from "@/components/code";

export const metadata = {
  title: "@json-render/core API | json-render",
};

export default function CoreApiPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">@json-render/core</h1>
      <p className="text-muted-foreground mb-8">
        Core types, schemas, and utilities.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">defineCatalog</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Creates a type-safe catalog definition with schema validation.
      </p>
      <Code lang="typescript">{`import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react';

function defineCatalog<T extends ZodType>(
  s: T,
  config: CatalogConfig
): Catalog

// Use the React schema for standard UI specs
const catalog = defineCatalog(schema, {
  components: {...},
  actions: {...},
});`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">CatalogConfig</h3>
      <Code lang="typescript">{`interface CatalogConfig {
  components: Record<string, ComponentDefinition>;
  actions?: Record<string, ActionDefinition>;
  functions?: Record<string, FunctionDefinition>;
}

interface ComponentDefinition {
  props: ZodObject;         // Use .nullable() for optional props
  slots?: string[];         // Named slots (e.g., ["default"])
  description?: string;     // Help AI understand usage
}

interface ActionDefinition {
  params?: ZodObject;
  description?: string;
}

interface FunctionDefinition {
  description?: string;
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Catalog Instance</h3>
      <p className="text-sm text-muted-foreground mb-4">
        The returned catalog provides methods for AI prompt generation,
        validation, and schema export:
      </p>
      <Code lang="typescript">{`interface Catalog {
  // Data
  readonly data: CatalogConfig;         // The catalog configuration
  readonly componentNames: string[];    // List of component names
  readonly actionNames: string[];       // List of action names

  // AI Prompt Generation
  prompt(options?: PromptOptions): string;

  // Validation
  validate(spec: unknown): SpecValidationResult;
  zodSchema(): z.ZodType;               // Get the Zod schema for specs

  // Export
  jsonSchema(): object;                 // Export as JSON Schema
}

interface PromptOptions {
  system?: string;        // Custom system message intro
  customRules?: string[]; // Additional rules to append
}

interface SpecValidationResult<T> {
  success: boolean;
  data?: T;               // Validated spec (if success)
  error?: z.ZodError;     // Validation errors (if failed)
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Catalog Methods</h3>
      <Code lang="typescript">{`// Generate AI system prompt
const systemPrompt = catalog.prompt({
  customRules: ["Always use Card as root element"],
});

// Validate a spec from AI
const result = catalog.validate(aiOutput);
if (result.success) {
  render(result.data);
} else {
  console.error(result.error);
}

// Get Zod schema for custom validation
const schema = catalog.zodSchema();
const parsed = schema.safeParse(aiOutput);

// Export as JSON Schema (for structured outputs)
const jsonSchema = catalog.jsonSchema();`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Schema System</h2>
      <p className="text-sm text-muted-foreground mb-4">
        json-render uses a flexible schema system that defines both the AI
        output format (spec) and what catalogs must provide. Each renderer
        package provides its own schema (e.g., @json-render/react exports{" "}
        <code className="text-foreground">schema</code>).
      </p>

      <h3 className="text-lg font-semibold mt-8 mb-4">schema</h3>
      <p className="text-sm text-muted-foreground mb-4">
        The schema for flat UI element trees. This is exported from
        @json-render/react.
      </p>
      <Code lang="typescript">{`import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react';

// schema defines:
// - Spec shape: { root: string, elements: Record<string, UIElement> }
// - Catalog shape: { components: {...}, actions: {...} }

const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      slots: ["default"],
      description: "Container card",
    },
  },
  actions: {
    submit: {
      params: z.object({ formId: z.string() }),
      description: "Submit a form",
    },
  },
});`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">defineSchema</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create custom schemas for different output formats (e.g., page-based,
        block-based).
      </p>
      <Code lang="typescript">{`import { defineSchema } from '@json-render/core';

const mySchema = defineSchema((s) => ({
  // What the AI outputs (spec)
  spec: s.object({
    title: s.string(),
    blocks: s.array(s.object({
      type: s.ref("catalog.blocks"),
      content: s.any(),
    })),
  }),

  // What the catalog must provide
  catalog: s.object({
    blocks: s.map({
      props: s.zod(),
      description: s.string(),
    }),
  }),
}));`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Schema Builder API</h3>
      <p className="text-sm text-muted-foreground mb-4">
        The schema builder provides these methods:
      </p>
      <Code lang="typescript">{`// Primitive types
s.string()           // String value
s.number()           // Number value
s.boolean()          // Boolean value
s.any()              // Any value

// Compound types
s.array(item)        // Array of items
s.object({ ... })    // Object with shape
s.record(value)      // Record/map with value type

// Catalog references (for type safety)
s.ref("catalog.components")      // Reference to catalog key (becomes enum)
s.propsOf("catalog.components")  // Props schema from catalog entry

// Catalog definitions
s.map({ props: s.zod(), ... })   // Map of named entries with shared shape
s.zod()                          // Placeholder for user-provided Zod schema

// Modifiers
s.optional()         // Mark field as optional`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Zod Schemas</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Pre-built Zod schemas for common json-render types:
      </p>

      <h3 className="text-lg font-semibold mt-8 mb-4">Dynamic Value Schemas</h3>
      <Code lang="typescript">{`import {
  DynamicValueSchema,    // string | number | boolean | null | { path: string }
  DynamicStringSchema,   // string | { path: string }
  DynamicNumberSchema,   // number | { path: string }
  DynamicBooleanSchema,  // boolean | { path: string }
} from '@json-render/core';

// Dynamic values can be literals or data path references
type DynamicValue<T> = T | { path: string };

// Example: a prop that can be a literal or bound to data
const schema = z.object({
  label: DynamicStringSchema,  // "Hello" or { path: "/user/name" }
});`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">
        Visibility &amp; Logic Schemas
      </h3>
      <Code lang="typescript">{`import {
  VisibilityConditionSchema,  // Full visibility condition
  LogicExpressionSchema,      // Logic operators (and, or, not, eq, gt, etc.)
} from '@json-render/core';

// Use in component props that need conditional rendering
const schema = z.object({
  visible: VisibilityConditionSchema.optional(),
});`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Action Schemas</h3>
      <Code lang="typescript">{`import {
  ActionSchema,           // Full action definition
  ActionConfirmSchema,    // Confirmation dialog config
  ActionOnSuccessSchema,  // Success handler config
  ActionOnErrorSchema,    // Error handler config
} from '@json-render/core';`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Validation Schemas</h3>
      <Code lang="typescript">{`import {
  ValidationCheckSchema,   // Single validation check
  ValidationConfigSchema,  // Full validation config with checks array
} from '@json-render/core';`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">SpecStream</h2>
      <p className="text-sm text-muted-foreground mb-4">
        SpecStream is json-render&apos;s streaming format for progressively
        building specs from JSONL patches.
      </p>

      <h3 className="text-lg font-semibold mt-8 mb-4">
        createSpecStreamCompiler
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create a streaming compiler that incrementally builds a spec:
      </p>
      <Code lang="typescript">{`import { createSpecStreamCompiler } from '@json-render/core';

const compiler = createSpecStreamCompiler<MySpec>();

// Process streaming chunks
const { result, newPatches } = compiler.push(chunk);

// Get final result
const spec = compiler.getResult();

// Reset for reuse
compiler.reset();`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">compileSpecStream</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Compile an entire SpecStream string at once:
      </p>
      <Code lang="typescript">{`import { compileSpecStream } from '@json-render/core';

const jsonl = \`{"op":"add","path":"/root","value":{}}
{"op":"add","path":"/root/type","value":"Card"}\`;

const spec = compileSpecStream<MySpec>(jsonl);`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Low-Level Utilities</h3>
      <Code lang="typescript">{`import {
  parseSpecStreamLine,
  applySpecStreamPatch,
} from '@json-render/core';

// Parse a single line
const patch = parseSpecStreamLine('{"op":"add","path":"/root","value":{}}');

// Apply patch to object (mutates in place)
const obj = {};
applySpecStreamPatch(obj, patch);`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">SpecStream Types</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Fully compliant with{" "}
        <a
          href="https://datatracker.ietf.org/doc/html/rfc6902"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          RFC 6902
        </a>
        :
      </p>
      <Code lang="typescript">{`interface SpecStreamLine {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;  // Required for add, replace, test
  from?: string;    // Required for move, copy
}

interface SpecStreamCompiler<T> {
  push(chunk: string): { result: T; newPatches: SpecStreamLine[] };
  getResult(): T;
  getPatches(): SpecStreamLine[];
  reset(): void;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Utility Functions</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">Path Utilities</h3>
      <Code lang="typescript">{`import { getByPath, setByPath } from '@json-render/core';

// Get value by JSON Pointer path
const value = getByPath(data, '/user/name');  // "Alice"

// Set value by path (mutates object)
setByPath(data, '/user/email', 'alice@example.com');`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">resolveDynamicValue</h3>
      <Code lang="typescript">{`import { resolveDynamicValue } from '@json-render/core';

// Resolve a dynamic value against data
const name = resolveDynamicValue("Hello", data);        // "Hello"
const name2 = resolveDynamicValue({ path: "/user/name" }, data);  // "Alice"`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">findFormValue</h3>
      <Code lang="typescript">{`import { findFormValue } from '@json-render/core';

// Find form values regardless of path format
// Checks: params.name, params["form.name"], data["form.name"], data.form.name
const value = findFormValue("name", params, data);`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">evaluateVisibility</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Evaluates a visibility condition against data and auth state.
      </p>
      <Code lang="typescript">{`function evaluateVisibility(
  condition: VisibilityCondition | undefined,
  data: Record<string, unknown>,
  auth?: AuthState
): boolean

type VisibilityCondition =
  | { path: string }
  | { auth: 'signedIn' | 'signedOut' | string }
  | { and: VisibilityCondition[] }
  | { or: VisibilityCondition[] }
  | { not: VisibilityCondition }
  | { eq: [DynamicValue, DynamicValue] }
  | { gt: [DynamicValue, DynamicValue] }
  | { gte: [DynamicValue, DynamicValue] }
  | { lt: [DynamicValue, DynamicValue] }
  | { lte: [DynamicValue, DynamicValue] };`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Types</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">UIElement</h3>
      <Code lang="typescript">{`interface UIElement {
  key: string;
  type: string;
  props: Record<string, unknown>;
  children?: string[];          // Keys of child elements
  visible?: VisibilityCondition;
  validation?: ValidationSchema;
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Spec (Element Tree)</h3>
      <Code lang="typescript">{`interface Spec {
  root: string | null;         // Key of root element
  elements: Record<string, UIElement>;
}`}</Code>
      <p className="text-sm text-muted-foreground mt-2 mb-4">
        Elements are stored as a flat map with string keys. The tree structure
        is built by following the{" "}
        <code className="text-foreground">children</code> arrays.
      </p>

      <h3 className="text-lg font-semibold mt-8 mb-4">Action</h3>
      <Code lang="typescript">{`interface Action {
  name: string;
  params?: Record<string, unknown>;
  confirm?: {
    title: string;
    message: string;
    variant?: 'default' | 'danger';
  };
  onSuccess?: { set: Record<string, unknown> };
  onError?: { set: Record<string, unknown> };
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">ValidationSchema</h3>
      <Code lang="typescript">{`interface ValidationSchema {
  checks: ValidationCheck[];
  validateOn?: 'change' | 'blur' | 'submit';
}

interface ValidationCheck {
  fn: string;
  args?: Record<string, unknown>;
  message: string;
}`}</Code>
    </article>
  );
}
