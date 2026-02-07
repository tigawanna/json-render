import { z } from "zod";

/**
 * Dynamic value - can be a literal or a path reference to data model
 */
export type DynamicValue<T = unknown> = T | { path: string };

/**
 * Dynamic string value
 */
export type DynamicString = DynamicValue<string>;

/**
 * Dynamic number value
 */
export type DynamicNumber = DynamicValue<number>;

/**
 * Dynamic boolean value
 */
export type DynamicBoolean = DynamicValue<boolean>;

/**
 * Zod schema for dynamic values
 */
export const DynamicValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.object({ path: z.string() }),
]);

export const DynamicStringSchema = z.union([
  z.string(),
  z.object({ path: z.string() }),
]);

export const DynamicNumberSchema = z.union([
  z.number(),
  z.object({ path: z.string() }),
]);

export const DynamicBooleanSchema = z.union([
  z.boolean(),
  z.object({ path: z.string() }),
]);

/**
 * Base UI element structure for v2
 */
export interface UIElement<
  T extends string = string,
  P = Record<string, unknown>,
> {
  /** Component type from the catalog */
  type: T;
  /** Component props */
  props: P;
  /** Child element keys (flat structure) */
  children?: string[];
  /** Visibility condition */
  visible?: VisibilityCondition;
}

/**
 * Element with key and parentKey for use with flatToTree.
 * When elements are in an array (not a keyed map), key and parentKey
 * are needed to establish identity and parent-child relationships.
 */
export interface FlatElement<
  T extends string = string,
  P = Record<string, unknown>,
> extends UIElement<T, P> {
  /** Unique key identifying this element */
  key: string;
  /** Parent element key (null for root) */
  parentKey?: string | null;
}

/**
 * Visibility condition types
 */
export type VisibilityCondition =
  | boolean
  | { path: string }
  | { auth: "signedIn" | "signedOut" }
  | LogicExpression;

/**
 * Logic expression for complex conditions
 */
export type LogicExpression =
  | { and: LogicExpression[] }
  | { or: LogicExpression[] }
  | { not: LogicExpression }
  | { path: string }
  | { eq: [DynamicValue, DynamicValue] }
  | { neq: [DynamicValue, DynamicValue] }
  | { gt: [DynamicValue<number>, DynamicValue<number>] }
  | { gte: [DynamicValue<number>, DynamicValue<number>] }
  | { lt: [DynamicValue<number>, DynamicValue<number>] }
  | { lte: [DynamicValue<number>, DynamicValue<number>] };

/**
 * Flat UI tree structure (optimized for LLM generation)
 */
export interface Spec {
  /** Root element key */
  root: string;
  /** Flat map of elements by key */
  elements: Record<string, UIElement>;
}

/**
 * Auth state for visibility evaluation
 */
export interface AuthState {
  isSignedIn: boolean;
  user?: Record<string, unknown>;
}

/**
 * Data model type
 */
export type DataModel = Record<string, unknown>;

/**
 * Component schema definition using Zod
 */
export type ComponentSchema = z.ZodType<Record<string, unknown>>;

/**
 * Validation mode for catalog validation
 */
export type ValidationMode = "strict" | "warn" | "ignore";

/**
 * JSON patch operation types (RFC 6902)
 */
export type PatchOp = "add" | "remove" | "replace" | "move" | "copy" | "test";

/**
 * JSON patch operation (RFC 6902)
 */
export interface JsonPatch {
  op: PatchOp;
  path: string;
  /** Required for add, replace, test */
  value?: unknown;
  /** Required for move, copy (source location) */
  from?: string;
}

/**
 * Resolve a dynamic value against a data model
 */
export function resolveDynamicValue<T>(
  value: DynamicValue<T>,
  dataModel: DataModel,
): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "object" && "path" in value) {
    return getByPath(dataModel, value.path) as T | undefined;
  }

  return value as T;
}

/**
 * Unescape a JSON Pointer token per RFC 6901 Section 4.
 * ~1 is decoded to / and ~0 is decoded to ~ (order matters).
 */
function unescapeJsonPointer(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * Parse a JSON Pointer path into unescaped segments.
 */
function parseJsonPointer(path: string): string[] {
  const raw = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  return raw.map(unescapeJsonPointer);
}

/**
 * Get a value from an object by JSON Pointer path (RFC 6901)
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === "/") {
    return obj;
  }

  const segments = parseJsonPointer(path);

  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      current = current[index];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Check if a string is a numeric index
 */
function isNumericIndex(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * Set a value in an object by JSON Pointer path (RFC 6901).
 * Automatically creates arrays when the path segment is a numeric index.
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = parseJsonPointer(path);

  if (segments.length === 0) return;

  let current: Record<string, unknown> | unknown[] = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const nextSegment = segments[i + 1];
    const nextIsNumeric =
      nextSegment !== undefined &&
      (isNumericIndex(nextSegment) || nextSegment === "-");

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (current[index] === undefined || typeof current[index] !== "object") {
        current[index] = nextIsNumeric ? [] : {};
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      if (!(segment in current) || typeof current[segment] !== "object") {
        current[segment] = nextIsNumeric ? [] : {};
      }
      current = current[segment] as Record<string, unknown> | unknown[];
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    if (lastSegment === "-") {
      current.push(value);
    } else {
      const index = parseInt(lastSegment, 10);
      current[index] = value;
    }
  } else {
    current[lastSegment] = value;
  }
}

/**
 * Add a value per RFC 6902 "add" semantics.
 * For objects: create-or-replace the member.
 * For arrays: insert before the given index, or append if "-".
 */
export function addByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = parseJsonPointer(path);

  if (segments.length === 0) return;

  let current: Record<string, unknown> | unknown[] = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const nextSegment = segments[i + 1];
    const nextIsNumeric =
      nextSegment !== undefined &&
      (isNumericIndex(nextSegment) || nextSegment === "-");

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (current[index] === undefined || typeof current[index] !== "object") {
        current[index] = nextIsNumeric ? [] : {};
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      if (!(segment in current) || typeof current[segment] !== "object") {
        current[segment] = nextIsNumeric ? [] : {};
      }
      current = current[segment] as Record<string, unknown> | unknown[];
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    if (lastSegment === "-") {
      current.push(value);
    } else {
      const index = parseInt(lastSegment, 10);
      current.splice(index, 0, value);
    }
  } else {
    current[lastSegment] = value;
  }
}

/**
 * Remove a value per RFC 6902 "remove" semantics.
 * For objects: delete the property.
 * For arrays: splice out the element at the given index.
 */
export function removeByPath(obj: Record<string, unknown>, path: string): void {
  const segments = parseJsonPointer(path);

  if (segments.length === 0) return;

  let current: Record<string, unknown> | unknown[] = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (current[index] === undefined || typeof current[index] !== "object") {
        return; // path does not exist
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      if (!(segment in current) || typeof current[segment] !== "object") {
        return; // path does not exist
      }
      current = current[segment] as Record<string, unknown> | unknown[];
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    const index = parseInt(lastSegment, 10);
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
    }
  } else {
    delete current[lastSegment];
  }
}

/**
 * Deep equality check for RFC 6902 "test" operation.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

/**
 * Find a form value from params and/or data.
 * Useful in action handlers to locate form input values regardless of path format.
 *
 * Checks in order:
 * 1. Direct param key (if not a path reference)
 * 2. Param keys ending with the field name
 * 3. Data keys ending with the field name (dot notation)
 * 4. Data paths using getByPath (slash notation)
 *
 * @example
 * // Find "name" from params or data
 * const name = findFormValue("name", params, data);
 *
 * // Will find from: params.name, params["form.name"], data["customerForm.name"], data.customerForm.name
 */
export function findFormValue(
  fieldName: string,
  params?: Record<string, unknown>,
  data?: Record<string, unknown>,
): unknown {
  // Check params first (but not if it looks like a data path reference)
  if (params?.[fieldName] !== undefined) {
    const val = params[fieldName];
    // If the value looks like a path reference (contains dots), skip it
    if (typeof val !== "string" || !val.includes(".")) {
      return val;
    }
  }

  // Check param keys that end with the field name
  if (params) {
    for (const key of Object.keys(params)) {
      if (key.endsWith(`.${fieldName}`)) {
        const val = params[key];
        if (typeof val !== "string" || !val.includes(".")) {
          return val;
        }
      }
    }
  }

  // Check data keys that end with the field name (handles any form naming)
  if (data) {
    for (const key of Object.keys(data)) {
      if (key === fieldName || key.endsWith(`.${fieldName}`)) {
        return data[key];
      }
    }

    // Try getByPath with common prefixes
    const prefixes = ["form", "newCustomer", "customer", ""];
    for (const prefix of prefixes) {
      const path = prefix ? `${prefix}/${fieldName}` : fieldName;
      const val = getByPath(data, path);
      if (val !== undefined) {
        return val;
      }
    }
  }

  return undefined;
}

// =============================================================================
// SpecStream - Streaming format for progressively building specs
// =============================================================================

/**
 * A SpecStream line - a single patch operation in the stream.
 */
export type SpecStreamLine = JsonPatch;

/**
 * Parse a single SpecStream line into a patch operation.
 * Returns null if the line is invalid or empty.
 *
 * SpecStream is json-render's streaming format where each line is a JSON patch
 * operation that progressively builds up the final spec.
 */
export function parseSpecStreamLine(line: string): SpecStreamLine | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("{")) return null;

  try {
    const patch = JSON.parse(trimmed) as SpecStreamLine;
    if (patch.op && patch.path !== undefined) {
      return patch;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Apply a single RFC 6902 JSON Patch operation to an object.
 * Mutates the object in place.
 *
 * Supports all six RFC 6902 operations: add, remove, replace, move, copy, test.
 *
 * @throws {Error} If a "test" operation fails (value mismatch).
 */
export function applySpecStreamPatch<T extends Record<string, unknown>>(
  obj: T,
  patch: SpecStreamLine,
): T {
  switch (patch.op) {
    case "add":
      addByPath(obj, patch.path, patch.value);
      break;
    case "replace":
      // RFC 6902: target must exist. For streaming tolerance we set regardless.
      setByPath(obj, patch.path, patch.value);
      break;
    case "remove":
      removeByPath(obj, patch.path);
      break;
    case "move": {
      if (!patch.from) break;
      const moveValue = getByPath(obj, patch.from);
      removeByPath(obj, patch.from);
      addByPath(obj, patch.path, moveValue);
      break;
    }
    case "copy": {
      if (!patch.from) break;
      const copyValue = getByPath(obj, patch.from);
      addByPath(obj, patch.path, copyValue);
      break;
    }
    case "test": {
      const actual = getByPath(obj, patch.path);
      if (!deepEqual(actual, patch.value)) {
        throw new Error(
          `Test operation failed: value at "${patch.path}" does not match`,
        );
      }
      break;
    }
  }
  return obj;
}

/**
 * Compile a SpecStream string into a JSON object.
 * Each line should be a patch operation.
 *
 * @example
 * const stream = `{"op":"add","path":"/name","value":"Alice"}
 * {"op":"add","path":"/age","value":30}`;
 * const result = compileSpecStream(stream);
 * // { name: "Alice", age: 30 }
 */
export function compileSpecStream<
  T extends Record<string, unknown> = Record<string, unknown>,
>(stream: string, initial: T = {} as T): T {
  const lines = stream.split("\n");
  const result = { ...initial };

  for (const line of lines) {
    const patch = parseSpecStreamLine(line);
    if (patch) {
      applySpecStreamPatch(result, patch);
    }
  }

  return result as T;
}

/**
 * Streaming SpecStream compiler.
 * Useful for processing SpecStream data as it streams in from AI.
 *
 * @example
 * const compiler = createSpecStreamCompiler<MySpec>();
 *
 * // As chunks arrive:
 * const { result, newPatches } = compiler.push(chunk);
 * if (newPatches.length > 0) {
 *   updateUI(result);
 * }
 *
 * // When done:
 * const finalResult = compiler.getResult();
 */
export interface SpecStreamCompiler<T> {
  /** Push a chunk of text. Returns the current result and any new patches applied. */
  push(chunk: string): { result: T; newPatches: SpecStreamLine[] };
  /** Get the current compiled result */
  getResult(): T;
  /** Get all patches that have been applied */
  getPatches(): SpecStreamLine[];
  /** Reset the compiler to initial state */
  reset(initial?: Partial<T>): void;
}

/**
 * Create a streaming SpecStream compiler.
 *
 * SpecStream is json-render's streaming format. AI outputs patch operations
 * line by line, and this compiler progressively builds the final spec.
 *
 * @example
 * const compiler = createSpecStreamCompiler<TimelineSpec>();
 *
 * // Process streaming response
 * const reader = response.body.getReader();
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *
 *   const { result, newPatches } = compiler.push(decoder.decode(value));
 *   if (newPatches.length > 0) {
 *     setSpec(result); // Update UI with partial result
 *   }
 * }
 */
export function createSpecStreamCompiler<T = Record<string, unknown>>(
  initial: Partial<T> = {},
): SpecStreamCompiler<T> {
  let result = { ...initial } as T;
  let buffer = "";
  const appliedPatches: SpecStreamLine[] = [];
  const processedLines = new Set<string>();

  return {
    push(chunk: string): { result: T; newPatches: SpecStreamLine[] } {
      buffer += chunk;
      const newPatches: SpecStreamLine[] = [];

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || processedLines.has(trimmed)) continue;
        processedLines.add(trimmed);

        const patch = parseSpecStreamLine(trimmed);
        if (patch) {
          applySpecStreamPatch(result as Record<string, unknown>, patch);
          appliedPatches.push(patch);
          newPatches.push(patch);
        }
      }

      // Return a shallow copy to trigger re-renders
      if (newPatches.length > 0) {
        result = { ...result };
      }

      return { result, newPatches };
    },

    getResult(): T {
      // Process any remaining buffer
      if (buffer.trim()) {
        const patch = parseSpecStreamLine(buffer);
        if (patch && !processedLines.has(buffer.trim())) {
          processedLines.add(buffer.trim());
          applySpecStreamPatch(result as Record<string, unknown>, patch);
          appliedPatches.push(patch);
          result = { ...result };
        }
        buffer = "";
      }
      return result;
    },

    getPatches(): SpecStreamLine[] {
      return [...appliedPatches];
    },

    reset(newInitial: Partial<T> = {}): void {
      result = { ...newInitial } as T;
      buffer = "";
      appliedPatches.length = 0;
      processedLines.clear();
    },
  };
}
