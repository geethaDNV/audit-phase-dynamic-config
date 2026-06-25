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
