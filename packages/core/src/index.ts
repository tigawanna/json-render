// Types
export type {
  DynamicValue,
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  UIElement,
  FlatElement,
  Spec,
  VisibilityCondition,
  LogicExpression,
  AuthState,
  DataModel,
  ComponentSchema,
  ValidationMode,
  PatchOp,
  JsonPatch,
  // SpecStream types
  SpecStreamLine,
  SpecStreamCompiler,
} from "./types";

export {
  DynamicValueSchema,
  DynamicStringSchema,
  DynamicNumberSchema,
  DynamicBooleanSchema,
  resolveDynamicValue,
  getByPath,
  setByPath,
  addByPath,
  removeByPath,
  findFormValue,
  // SpecStream - streaming format for building specs (RFC 6902)
  parseSpecStreamLine,
  applySpecStreamPatch,
  compileSpecStream,
  createSpecStreamCompiler,
} from "./types";

// Visibility
export type { VisibilityContext } from "./visibility";

export {
  VisibilityConditionSchema,
  LogicExpressionSchema,
  evaluateVisibility,
  evaluateLogicExpression,
  visibility,
} from "./visibility";

// Actions
export type {
  Action,
  ActionConfirm,
  ActionOnSuccess,
  ActionOnError,
  ActionHandler,
  ActionDefinition,
  ResolvedAction,
  ActionExecutionContext,
} from "./actions";

export {
  ActionSchema,
  ActionConfirmSchema,
  ActionOnSuccessSchema,
  ActionOnErrorSchema,
  resolveAction,
  executeAction,
  interpolateString,
  action,
} from "./actions";

// Validation
export type {
  ValidationCheck,
  ValidationConfig,
  ValidationFunction,
  ValidationFunctionDefinition,
  ValidationCheckResult,
  ValidationResult,
  ValidationContext,
} from "./validation";

export {
  ValidationCheckSchema,
  ValidationConfigSchema,
  builtInValidationFunctions,
  runValidationCheck,
  runValidation,
  check,
} from "./validation";

// Schema (new API)
export type {
  SchemaBuilder,
  SchemaType,
  SchemaDefinition,
  Schema,
  Catalog,
  PromptOptions,
  PromptContext,
  PromptTemplate,
  SchemaOptions,
  SpecValidationResult,
  InferCatalogInput,
  InferSpec,
  // Catalog type inference
  InferCatalogComponents,
  InferCatalogActions,
  InferComponentProps,
  InferActionParams,
} from "./schema";

export { defineSchema, defineCatalog } from "./schema";

// Legacy Catalog (for backwards compatibility during migration)
export type {
  ComponentDefinition,
  CatalogConfig,
  Catalog as LegacyCatalog,
  InferCatalogComponentProps,
  SystemPromptOptions,
} from "./catalog";

export {
  createCatalog,
  generateCatalogPrompt,
  generateSystemPrompt,
} from "./catalog";
