import { z } from "zod";

/**
 * Schema builder primitives
 */
export interface SchemaBuilder {
  /** String type */
  string(): SchemaType<"string">;
  /** Number type */
  number(): SchemaType<"number">;
  /** Boolean type */
  boolean(): SchemaType<"boolean">;
  /** Array of type */
  array<T extends SchemaType>(item: T): SchemaType<"array", T>;
  /** Object with shape */
  object<T extends Record<string, SchemaType>>(
    shape: T,
  ): SchemaType<"object", T>;
  /** Record/map with value type */
  record<T extends SchemaType>(value: T): SchemaType<"record", T>;
  /** Any type */
  any(): SchemaType<"any">;
  /** Placeholder for user-provided Zod schema */
  zod(): SchemaType<"zod">;
  /** Reference to catalog key (e.g., 'catalog.components') */
  ref(path: string): SchemaType<"ref", string>;
  /** Props from referenced catalog entry */
  propsOf(path: string): SchemaType<"propsOf", string>;
  /** Map of named entries with shared shape */
  map<T extends Record<string, SchemaType>>(
    entryShape: T,
  ): SchemaType<"map", T>;
  /** Optional modifier */
  optional(): { optional: true };
}

/**
 * Schema type representation
 */
export interface SchemaType<TKind extends string = string, TInner = unknown> {
  kind: TKind;
  inner?: TInner;
  optional?: boolean;
}

/**
 * Schema definition shape
 */
export interface SchemaDefinition<
  TSpec extends SchemaType = SchemaType,
  TCatalog extends SchemaType = SchemaType,
> {
  /** What the AI-generated spec looks like */
  spec: TSpec;
  /** What the catalog must provide */
  catalog: TCatalog;
}

/**
 * Schema instance with methods
 */
export interface Schema<TDef extends SchemaDefinition = SchemaDefinition> {
  /** The schema definition */
  readonly definition: TDef;
  /** Custom prompt template for this schema */
  readonly promptTemplate?: PromptTemplate;
  /** Create a catalog from this schema */
  createCatalog<TCatalog extends InferCatalogInput<TDef["catalog"]>>(
    catalog: TCatalog,
  ): Catalog<TDef, TCatalog>;
}

/**
 * Catalog instance with methods
 */
export interface Catalog<
  TDef extends SchemaDefinition = SchemaDefinition,
  TCatalog = unknown,
> {
  /** The schema this catalog is based on */
  readonly schema: Schema<TDef>;
  /** The catalog data */
  readonly data: TCatalog;
  /** Component names */
  readonly componentNames: string[];
  /** Action names */
  readonly actionNames: string[];
  /** Generate system prompt for AI */
  prompt(options?: PromptOptions): string;
  /** Export as JSON Schema for structured outputs */
  jsonSchema(): object;
  /** Validate a spec against this catalog */
  validate(spec: unknown): SpecValidationResult<InferSpec<TDef, TCatalog>>;
  /** Get the Zod schema for the spec */
  zodSchema(): z.ZodType<InferSpec<TDef, TCatalog>>;
  /** Type helper for the spec type */
  readonly _specType: InferSpec<TDef, TCatalog>;
}

/**
 * Prompt generation options
 */
export interface PromptOptions {
  /** Custom system message intro */
  system?: string;
  /** Additional rules to append */
  customRules?: string[];
}

/**
 * Context provided to prompt templates
 */
export interface PromptContext<TCatalog = unknown> {
  /** The catalog data */
  catalog: TCatalog;
  /** Component names from the catalog */
  componentNames: string[];
  /** Action names from the catalog (if any) */
  actionNames: string[];
  /** Prompt options provided by the user */
  options: PromptOptions;
  /** Helper to format a Zod type as a human-readable string */
  formatZodType: (schema: z.ZodType) => string;
}

/**
 * Prompt template function type
 */
export type PromptTemplate<TCatalog = unknown> = (
  context: PromptContext<TCatalog>,
) => string;

/**
 * Schema options
 */
export interface SchemaOptions<TCatalog = unknown> {
  /** Custom prompt template for this schema */
  promptTemplate?: PromptTemplate<TCatalog>;
}

/**
 * Spec validation result
 */
export interface SpecValidationResult<T> {
  success: boolean;
  data?: T;
  error?: z.ZodError;
}

// =============================================================================
// Catalog Type Inference Helpers
// =============================================================================

/**
 * Extract the components map type from a catalog
 * @example type Components = InferCatalogComponents<typeof myCatalog>;
 */
export type InferCatalogComponents<C extends Catalog> =
  C extends Catalog<SchemaDefinition, infer TCatalog>
    ? TCatalog extends { components: infer Comps }
      ? Comps
      : never
    : never;

/**
 * Extract the actions map type from a catalog
 * @example type Actions = InferCatalogActions<typeof myCatalog>;
 */
export type InferCatalogActions<C extends Catalog> =
  C extends Catalog<SchemaDefinition, infer TCatalog>
    ? TCatalog extends { actions: infer Acts }
      ? Acts
      : never
    : never;

/**
 * Infer component props from a catalog by component name
 * @example type ButtonProps = InferComponentProps<typeof myCatalog, 'Button'>;
 */
export type InferComponentProps<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = InferCatalogComponents<C>[K] extends { props: z.ZodType<infer P> }
  ? P
  : never;

/**
 * Infer action params from a catalog by action name
 * @example type ViewCustomersParams = InferActionParams<typeof myCatalog, 'viewCustomers'>;
 */
export type InferActionParams<
  C extends Catalog,
  K extends keyof InferCatalogActions<C>,
> = InferCatalogActions<C>[K] extends { params: z.ZodType<infer P> }
  ? P
  : never;

// =============================================================================
// Internal Type Inference Helpers
// =============================================================================

export type InferCatalogInput<T> =
  T extends SchemaType<"object", infer Shape>
    ? { [K in keyof Shape]: InferCatalogField<Shape[K]> }
    : never;

type InferCatalogField<T> =
  T extends SchemaType<"map", infer EntryShape>
    ? Record<
        string,
        // Only 'props' is required, rest are optional
        InferMapEntryRequired<EntryShape> &
          Partial<InferMapEntryOptional<EntryShape>>
      >
    : T extends SchemaType<"zod">
      ? z.ZodType
      : T extends SchemaType<"string">
        ? string
        : T extends SchemaType<"number">
          ? number
          : T extends SchemaType<"boolean">
            ? boolean
            : T extends SchemaType<"array", infer Item>
              ? InferCatalogField<Item>[]
              : T extends SchemaType<"object", infer Shape>
                ? { [K in keyof Shape]: InferCatalogField<Shape[K]> }
                : unknown;

// Extract required fields (props is always required)
type InferMapEntryRequired<T> = {
  [K in keyof T as K extends "props" ? K : never]: InferMapEntryField<T[K]>;
};

// Extract optional fields (everything except props)
type InferMapEntryOptional<T> = {
  [K in keyof T as K extends "props" ? never : K]: InferMapEntryField<T[K]>;
};

type InferMapEntryField<T> =
  T extends SchemaType<"zod">
    ? z.ZodType
    : T extends SchemaType<"string">
      ? string
      : T extends SchemaType<"number">
        ? number
        : T extends SchemaType<"boolean">
          ? boolean
          : T extends SchemaType<"array", infer Item>
            ? InferMapEntryField<Item>[]
            : T extends SchemaType<"object", infer Shape>
              ? { [K in keyof Shape]: InferMapEntryField<Shape[K]> }
              : unknown;

// Spec inference (simplified - will be expanded)
export type InferSpec<TDef extends SchemaDefinition, TCatalog> = TDef extends {
  spec: SchemaType<"object", infer Shape>;
}
  ? InferSpecObject<Shape, TCatalog>
  : unknown;

type InferSpecObject<Shape, TCatalog> = {
  [K in keyof Shape]: InferSpecField<Shape[K], TCatalog>;
};

type InferSpecField<T, TCatalog> =
  T extends SchemaType<"string">
    ? string
    : T extends SchemaType<"number">
      ? number
      : T extends SchemaType<"boolean">
        ? boolean
        : T extends SchemaType<"array", infer Item>
          ? InferSpecField<Item, TCatalog>[]
          : T extends SchemaType<"object", infer Shape>
            ? InferSpecObject<Shape, TCatalog>
            : T extends SchemaType<"record", infer Value>
              ? Record<string, InferSpecField<Value, TCatalog>>
              : T extends SchemaType<"ref", infer Path>
                ? InferRefType<Path, TCatalog>
                : T extends SchemaType<"propsOf", infer Path>
                  ? InferPropsOfType<Path, TCatalog>
                  : T extends SchemaType<"any">
                    ? unknown
                    : unknown;

type InferRefType<Path, TCatalog> = Path extends "catalog.components"
  ? TCatalog extends { components: infer C }
    ? keyof C
    : string
  : Path extends "catalog.actions"
    ? TCatalog extends { actions: infer A }
      ? keyof A
      : string
    : string;

type InferPropsOfType<Path, TCatalog> = Path extends "catalog.components"
  ? TCatalog extends { components: infer C }
    ? C extends Record<string, { props: z.ZodType<infer P> }>
      ? P
      : Record<string, unknown>
    : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Create the schema builder
 */
function createBuilder(): SchemaBuilder {
  return {
    string: () => ({ kind: "string" }),
    number: () => ({ kind: "number" }),
    boolean: () => ({ kind: "boolean" }),
    array: (item) => ({ kind: "array", inner: item }),
    object: (shape) => ({ kind: "object", inner: shape }),
    record: (value) => ({ kind: "record", inner: value }),
    any: () => ({ kind: "any" }),
    zod: () => ({ kind: "zod" }),
    ref: (path) => ({ kind: "ref", inner: path }),
    propsOf: (path) => ({ kind: "propsOf", inner: path }),
    map: (entryShape) => ({ kind: "map", inner: entryShape }),
    optional: () => ({ optional: true }),
  };
}

/**
 * Define a schema using the builder pattern
 */
export function defineSchema<TDef extends SchemaDefinition>(
  builder: (s: SchemaBuilder) => TDef,
  options?: SchemaOptions,
): Schema<TDef> {
  const s = createBuilder();
  const definition = builder(s);

  return {
    definition,
    promptTemplate: options?.promptTemplate,
    createCatalog<TCatalog extends InferCatalogInput<TDef["catalog"]>>(
      catalog: TCatalog,
    ): Catalog<TDef, TCatalog> {
      return createCatalogFromSchema(this as Schema<TDef>, catalog);
    },
  };
}

/**
 * Create a catalog from a schema (internal)
 */
function createCatalogFromSchema<TDef extends SchemaDefinition, TCatalog>(
  schema: Schema<TDef>,
  catalogData: TCatalog,
): Catalog<TDef, TCatalog> {
  // Extract component and action names
  const components = (catalogData as Record<string, unknown>).components as
    | Record<string, unknown>
    | undefined;
  const actions = (catalogData as Record<string, unknown>).actions as
    | Record<string, unknown>
    | undefined;

  const componentNames = components ? Object.keys(components) : [];
  const actionNames = actions ? Object.keys(actions) : [];

  // Build the Zod schema for validation
  const zodSchema = buildZodSchemaFromDefinition(
    schema.definition,
    catalogData,
  );

  return {
    schema,
    data: catalogData,
    componentNames,
    actionNames,

    prompt(options: PromptOptions = {}): string {
      return generatePrompt(this, options);
    },

    jsonSchema(): object {
      return zodToJsonSchema(zodSchema);
    },

    validate(spec: unknown): SpecValidationResult<InferSpec<TDef, TCatalog>> {
      const result = zodSchema.safeParse(spec);
      if (result.success) {
        return {
          success: true,
          data: result.data as InferSpec<TDef, TCatalog>,
        };
      }
      return { success: false, error: result.error };
    },

    zodSchema(): z.ZodType<InferSpec<TDef, TCatalog>> {
      return zodSchema as z.ZodType<InferSpec<TDef, TCatalog>>;
    },

    get _specType(): InferSpec<TDef, TCatalog> {
      throw new Error("_specType is only for type inference");
    },
  };
}

/**
 * Build Zod schema from schema definition
 */
function buildZodSchemaFromDefinition(
  definition: SchemaDefinition,
  catalogData: unknown,
): z.ZodType {
  return buildZodType(definition.spec, catalogData);
}

function buildZodType(schemaType: SchemaType, catalogData: unknown): z.ZodType {
  switch (schemaType.kind) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "any":
      return z.any();
    case "array": {
      const inner = buildZodType(schemaType.inner as SchemaType, catalogData);
      return z.array(inner);
    }
    case "object": {
      const shape = schemaType.inner as Record<string, SchemaType>;
      const zodShape: Record<string, z.ZodType> = {};
      for (const [key, value] of Object.entries(shape)) {
        let zodType = buildZodType(value, catalogData);
        if (value.optional) {
          zodType = zodType.optional();
        }
        zodShape[key] = zodType;
      }
      return z.object(zodShape);
    }
    case "record": {
      const inner = buildZodType(schemaType.inner as SchemaType, catalogData);
      return z.record(z.string(), inner);
    }
    case "ref": {
      // Reference to catalog key - create enum of valid keys
      const path = schemaType.inner as string;
      const keys = getKeysFromPath(path, catalogData);
      if (keys.length === 0) {
        return z.string();
      }
      if (keys.length === 1) {
        return z.literal(keys[0]!);
      }
      return z.enum(keys as [string, ...string[]]);
    }
    case "propsOf": {
      // Props from catalog entry - create union of all props schemas
      const path = schemaType.inner as string;
      const propsSchemas = getPropsFromPath(path, catalogData);
      if (propsSchemas.length === 0) {
        return z.record(z.string(), z.unknown());
      }
      if (propsSchemas.length === 1) {
        return propsSchemas[0]!;
      }
      // For propsOf, we need to be lenient since type determines which props apply
      return z.record(z.string(), z.unknown());
    }
    default:
      return z.unknown();
  }
}

function getKeysFromPath(path: string, catalogData: unknown): string[] {
  const parts = path.split(".");
  let current: unknown = { catalog: catalogData };
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return [];
    }
  }
  if (current && typeof current === "object") {
    return Object.keys(current);
  }
  return [];
}

function getPropsFromPath(path: string, catalogData: unknown): z.ZodType[] {
  const parts = path.split(".");
  let current: unknown = { catalog: catalogData };
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return [];
    }
  }
  if (current && typeof current === "object") {
    return Object.values(current as Record<string, { props?: z.ZodType }>)
      .map((entry) => entry.props)
      .filter((props): props is z.ZodType => props !== undefined);
  }
  return [];
}

/**
 * Generate system prompt from catalog
 */
function generatePrompt<TDef extends SchemaDefinition, TCatalog>(
  catalog: Catalog<TDef, TCatalog>,
  options: PromptOptions,
): string {
  // Check if schema has a custom prompt template
  if (catalog.schema.promptTemplate) {
    const context: PromptContext<TCatalog> = {
      catalog: catalog.data,
      componentNames: catalog.componentNames,
      actionNames: catalog.actionNames,
      options,
      formatZodType,
    };
    return catalog.schema.promptTemplate(context);
  }

  // Default JSONL element-tree format (for @json-render/react and similar)
  const {
    system = "You are a UI generator that outputs JSON.",
    customRules = [],
  } = options;

  const lines: string[] = [];
  lines.push(system);
  lines.push("");

  // Output format section - explain JSONL streaming patch format
  lines.push("OUTPUT FORMAT:");
  lines.push(
    "Output JSONL (one JSON object per line) with patches to build a UI tree.",
  );
  lines.push(
    "Each line is a JSON patch operation. Start with the root, then add each element.",
  );
  lines.push("");
  lines.push("Example output (each line is a separate JSON object):");
  lines.push("");
  lines.push(`{"op":"add","path":"/root","value":"card-1"}
{"op":"add","path":"/elements/card-1","value":{"type":"Card","props":{"title":"Dashboard"},"children":["metric-1","chart-1"]}}
{"op":"add","path":"/elements/metric-1","value":{"type":"Metric","props":{"label":"Revenue","valuePath":"analytics.revenue","format":"currency"},"children":[]}}
{"op":"add","path":"/elements/chart-1","value":{"type":"Chart","props":{"type":"bar","dataPath":"analytics.salesByRegion"},"children":[]}}`);
  lines.push("");

  // Components section
  const components = (catalog.data as Record<string, unknown>).components as
    | Record<
        string,
        { props?: z.ZodType; description?: string; slots?: string[] }
      >
    | undefined;

  if (components) {
    lines.push(`AVAILABLE COMPONENTS (${catalog.componentNames.length}):`);
    lines.push("");

    for (const [name, def] of Object.entries(components)) {
      const propsStr = def.props ? formatZodType(def.props) : "{}";
      const hasChildren = def.slots && def.slots.length > 0;
      const childrenStr = hasChildren ? " [accepts children]" : "";
      const descStr = def.description ? ` - ${def.description}` : "";
      lines.push(`- ${name}: ${propsStr}${descStr}${childrenStr}`);
    }
    lines.push("");
  }

  // Actions section
  const actions = (catalog.data as Record<string, unknown>).actions as
    | Record<string, { params?: z.ZodType; description?: string }>
    | undefined;

  if (actions && catalog.actionNames.length > 0) {
    lines.push("AVAILABLE ACTIONS:");
    lines.push("");
    for (const [name, def] of Object.entries(actions)) {
      lines.push(`- ${name}${def.description ? `: ${def.description}` : ""}`);
    }
    lines.push("");
  }

  // Rules
  lines.push("RULES:");
  const baseRules = [
    "Output ONLY JSONL patches - one JSON object per line, no markdown, no code fences",
    'First line sets root: {"op":"add","path":"/root","value":"<root-key>"}',
    'Then add each element: {"op":"add","path":"/elements/<key>","value":{...}}',
    "ONLY use components listed above",
    "Each element value needs: type, props, children (array of child keys)",
    "Use unique keys for the element map entries (e.g., 'header', 'metric-1', 'chart-revenue')",
  ];
  const allRules = [...baseRules, ...customRules];
  allRules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });

  return lines.join("\n");
}

/**
 * Get Zod type name from schema (handles different Zod versions)
 */
function getZodTypeName(schema: z.ZodType): string {
  if (!schema || !schema._def) return "";
  const def = schema._def as unknown as Record<string, unknown>;
  // Zod 4+ uses _def.type, older versions use _def.typeName
  return (def.typeName as string) ?? (def.type as string) ?? "";
}

/**
 * Format a Zod type into a human-readable string
 */
function formatZodType(schema: z.ZodType): string {
  if (!schema || !schema._def) return "unknown";
  const def = schema._def as unknown as Record<string, unknown>;
  const typeName = getZodTypeName(schema);

  switch (typeName) {
    case "ZodString":
    case "string":
      return "string";
    case "ZodNumber":
    case "number":
      return "number";
    case "ZodBoolean":
    case "boolean":
      return "boolean";
    case "ZodLiteral":
    case "literal":
      return JSON.stringify(def.value);
    case "ZodEnum":
    case "enum": {
      // Zod 3 uses values array, Zod 4 uses entries object
      let values: string[];
      if (Array.isArray(def.values)) {
        values = def.values as string[];
      } else if (def.entries && typeof def.entries === "object") {
        values = Object.values(def.entries as Record<string, string>);
      } else {
        return "enum";
      }
      return values.map((v) => `"${v}"`).join(" | ");
    }
    case "ZodArray":
    case "array": {
      const inner = (def.type as z.ZodType) ?? (def.element as z.ZodType);
      return inner ? `Array<${formatZodType(inner)}>` : "Array<unknown>";
    }
    case "ZodObject":
    case "object": {
      // Shape can be a function (Zod 3) or direct object (Zod 4)
      const shape =
        typeof def.shape === "function"
          ? (def.shape as () => Record<string, z.ZodType>)()
          : (def.shape as Record<string, z.ZodType>);
      if (!shape) return "object";
      const props = Object.entries(shape)
        .map(([key, value]) => {
          const innerTypeName = getZodTypeName(value);
          const isOptional =
            innerTypeName === "ZodOptional" ||
            innerTypeName === "ZodNullable" ||
            innerTypeName === "optional" ||
            innerTypeName === "nullable";
          return `${key}${isOptional ? "?" : ""}: ${formatZodType(value)}`;
        })
        .join(", ");
      return `{ ${props} }`;
    }
    case "ZodOptional":
    case "optional":
    case "ZodNullable":
    case "nullable": {
      const inner = (def.innerType as z.ZodType) ?? (def.wrapped as z.ZodType);
      return inner ? formatZodType(inner) : "unknown";
    }
    case "ZodUnion":
    case "union": {
      const options = def.options as z.ZodType[] | undefined;
      return options
        ? options.map((opt) => formatZodType(opt)).join(" | ")
        : "unknown";
    }
    default:
      return "unknown";
  }
}

/**
 * Convert Zod schema to JSON Schema
 */
function zodToJsonSchema(schema: z.ZodType): object {
  // Simplified JSON Schema conversion
  const def = schema._def as unknown as Record<string, unknown>;
  const typeName = (def.typeName as string) ?? "";

  switch (typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodLiteral":
      return { const: def.value };
    case "ZodEnum":
      return { enum: def.values };
    case "ZodArray": {
      const inner = def.type as z.ZodType | undefined;
      return {
        type: "array",
        items: inner ? zodToJsonSchema(inner) : {},
      };
    }
    case "ZodObject": {
      const shape = (def.shape as () => Record<string, z.ZodType>)?.();
      if (!shape) return { type: "object" };
      const properties: Record<string, object> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value);
        const innerDef = value._def as unknown as Record<string, unknown>;
        if (
          innerDef.typeName !== "ZodOptional" &&
          innerDef.typeName !== "ZodNullable"
        ) {
          required.push(key);
        }
      }
      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
        additionalProperties: false,
      };
    }
    case "ZodRecord": {
      const valueType = def.valueType as z.ZodType | undefined;
      return {
        type: "object",
        additionalProperties: valueType ? zodToJsonSchema(valueType) : true,
      };
    }
    case "ZodOptional":
    case "ZodNullable": {
      const inner = def.innerType as z.ZodType | undefined;
      return inner ? zodToJsonSchema(inner) : {};
    }
    case "ZodUnion": {
      const options = def.options as z.ZodType[] | undefined;
      return options ? { anyOf: options.map(zodToJsonSchema) } : {};
    }
    case "ZodAny":
      return {};
    default:
      return {};
  }
}

/**
 * Shorthand: Define a catalog directly from a schema
 */
export function defineCatalog<
  TDef extends SchemaDefinition,
  TCatalog extends InferCatalogInput<TDef["catalog"]>,
>(schema: Schema<TDef>, catalog: TCatalog): Catalog<TDef, TCatalog> {
  return schema.createCatalog(catalog);
}
