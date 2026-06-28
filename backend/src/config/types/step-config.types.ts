/**
 * TypeScript Type Definitions for Metadata-Driven Architecture
 * 
 * These interfaces define the structure of step configurations that drive:
 * - Form schema generation (what fields to render)
 * - Data fetching strategies (how to get data)
 * - Data saving strategies (how to persist data)
 * - Validation rules (field-level, conditional, cross-step)
 */

// ============================================================================
// CORE CONFIGURATION
// ============================================================================

/**
 * Complete configuration for a single audit step
 * This is the root configuration object loaded by the metadata registry
 */
export interface StepConfig {
  stepKey: string;
  phaseId: number;
  stepId: number;
  stepName: string;
  description?: string;
  formSchema: FormSchema;
  dataConfig: DataConfig;
  businessRules?: Array<{
    name: string;
    description: string;
    type: string;
    config?: Record<string, any>;
  }>;
  dependencies?: StepDependencies;  // NEW
  navigation?: {
    previous?: string;
    next?: string;
  };
}

// ============================================================================
// FORM SCHEMA
// ============================================================================

/**
 * Defines the form structure and validation rules
 * Used by frontend to dynamically build forms and by backend to validate requests
 */
export interface FormSchema {
  fields: FieldDefinition[];
  businessRules?: BusinessRule[];
  layout?: 'vertical' | 'horizontal' | 'grid';
  submitLabel?: string;
}

/**
 * Individual form field definition
 * Supports all common input types plus arrays for repeatable sections
 */
export interface FieldDefinition {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  validation?: FieldValidation;
  options?: string[] | SelectOption[];
  optionsSource?: {
    dataPath: string;          // e.g., 'entities', 'contacts'
    labelField: string;        // e.g., 'name'
    valueField: string;        // e.g., 'id'
  };
  arrayItemType?: 'text' | 'object';
  arrayItemSchema?: {
    fields: FieldDefinition[];
  };
  arraySchema?: FieldDefinition[];
  defaultValue?: any;
  displayConfig?: {
    placeholder?: string;
    helpText?: string;
    rows?: number;
    addButtonLabel?: string;
    removeButtonLabel?: string;
    emptyMessage?: string;
  };
}

export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'textarea'
  | 'date'
  | 'array';

export interface SelectOption {
  label: string;
  value: any;
}

/**
 * Field-level validation rules
 * Maps directly to class-validator decorators and Angular validators
 */
export interface FieldValidation {
  required?: boolean;
  message?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  email?: boolean;
  enum?: string[];
  minItems?: number;
  maxItems?: number;
  customValidator?: string;
}

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * Complex validation rules that depend on multiple fields or previous steps
 */
export interface BusinessRule {
  type: 'conditional' | 'cross-step' | 'cross-field';
  condition?: string;
  then?: {
    field: string;
    validation: FieldValidation;
  };
  fields?: string[];
  message?: string;
  validatorClass?: string;
  params?: string[];
}

// ============================================================================
// DATA CONFIGURATION
// ============================================================================

/**
 * Defines how to fetch and save data for this step
 * Separates read and write strategies for maximum flexibility
 */
export interface DataConfig {
  fetch: FetchStrategy;
  save: SaveStrategy;
}

// ============================================================================
// FETCH STRATEGIES
// ============================================================================

/**
 * Strategy for fetching step data
 * 
 * - prisma-simple: Read from single table using Prisma
 * - prisma-compose: Combine data from multiple sources
 * - custom-query: Use custom repository with raw SQL queries
 * - custom: Use custom repository with complex queries
 */
export interface FetchStrategy {
  strategy: 'prisma-simple' | 'prisma-compose' | 'custom-query' | 'custom';
  model?: string;
  filter?: string;
  returnArray?: boolean; // For prisma-simple: use findMany instead of findUnique
  sources?: Array<{
    name: string;
    model: string;
    filter: string;
  }>;
  customRepositoryName?: string;
  repositoryClass?: string; // Name of custom repository class
  repository?: string;
  method?: string;
}

/**
 * Data source for prisma-compose strategy
 * Each source is a repository method call
 */
export interface DataSource {
  repository: string;
  method: string;
  params: string[];
  resultKey: string;
}

// ============================================================================
// SAVE STRATEGIES
// ============================================================================

/**
 * Strategy for saving step data
 * 
 * - prisma-upsert: Insert or update single table
 * - prisma-create: Bulk create (for arrays)
 * - multi-table: Save to multiple related tables
 * - conditional-save: Save with validation based on conditions
 * - complex-transaction: Multi-table transaction with nested data
 * - custom: Use custom repository with transactions
 */
export interface SaveStrategy {
  strategy: 'prisma-upsert' | 'prisma-create' | 'multi-table' | 'conditional-save' | 'complex-transaction' | 'custom';
  transactional: boolean;
  model?: string;
  tables?: Array<{
    model?: string;
    idField?: string;
    operation?: string;
    fields?: string[];
  }>;
  repositoryClass?: string; // Name of custom repository class
  repository?: string;
  method?: string;
  bulkOperation?: boolean;
  deleteExisting?: boolean;
  validationRules?: Array<{
    type: string;
    field: string;
    message: string;
    value?: any;
    validatorName?: string;
  }>;
}

/**
 * Configuration for saving to a specific table
 * Used in multi-table strategy
 */
export interface TableSaveConfig {
  model?: string;
  repository?: string;
  method: string;
  fieldMapping: Record<string, string>;
  context?: Record<string, string>;
  primaryKey?: string[];
  conditional?: {
    field: string;
    notEquals?: any;
  };
}

// ============================================================================
// RUNTIME TYPES
// ============================================================================

/**
 * Context passed to repository methods
 */
export interface StepContext {
  auditId: number;
  phaseId: number;
  stepId: number;
  userId?: string;
}

/**
 * NEW: Dependency configuration
 */
export interface StepDependencies {
  // Steps that MUST be completed before this step can start
  requiredSteps?: string[];  // ["1-1", "1-2", "1-3"]
  
  // Steps that should be loaded for validation (but not required to be completed)
  optionalSteps?: string[];  // ["2-1", "2-2"]
  
  // Fields referenced from other steps (for validation context loading)
  dataReferences?: {
    [stepKey: string]: DependencyDataConfig;
  };
  
  // Conditional logic to determine if this step should be skipped
  skipConditions?: {
    condition: string;  // "step['2-3'].riskLevel === 'Low'"
    message?: string;
  }[];
  
  // Steps that depend on THIS step (auto-computed, don't set manually)
  dependents?: string[];
}

/**
 * Configuration for how to load dependency data
 */
export interface DependencyDataConfig {
  // Fields to load from this step
  fields?: string[];  // ['id', 'name', 'email']
  
  // Validation strategy
  strategy?: 'preload' | 'auto' | 'direct-db' | 'foreign-key';
  
  // Threshold for auto strategy (pre-load if count < threshold, else direct DB)
  threshold?: number;  // Default: 100
  
  // For backward compatibility, allow string array
  // e.g., '2-1': ['id', 'name'] becomes { fields: ['id', 'name'], strategy: 'auto' }
}

/**
 * NEW: Enhanced context with dependency data
 */
export interface ValidationContext extends StepContext {
  // Pre-loaded data from dependent steps (eliminates N+1 queries)
  dependencyData: Map<string, StepDataPayload>;  // Map<"1-1", {...data}>
  
  // Audit step statuses for checking completion
  stepStatuses: Map<string, string>;  // Map<"1-1", "completed">
  
  // Strategy metadata for each dependency (how to validate)
  dependencyStrategies: Map<string, DependencyStrategy>;  // Map<"2-1", {strategy: 'direct-db', ...}>
}

/**
 * Strategy information for a loaded dependency
 */
export interface DependencyStrategy {
  strategy: 'preloaded' | 'direct-db' | 'foreign-key';
  auditId?: number;  // For direct-db queries
  count?: number;    // Number of records (for debugging)
}

/**
 * Generic step data structure
 */
export interface StepDataPayload {
  [key: string]: any;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
