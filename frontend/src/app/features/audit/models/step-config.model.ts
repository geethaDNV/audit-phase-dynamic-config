/**
 * Step Configuration Models
 * Must match backend TypeScript configuration interfaces exactly
 */

export interface StepConfig {
  phaseId: number;
  stepId: number;
  stepName: string;
  description?: string;
  formSchema: FormSchema;
  dataConfig: DataConfig;
}

export interface FormSchema {
  fields: FieldDefinition[];
  businessRules?: BusinessRule[];
}

export interface FieldDefinition {
  name: string;
  type: 'text' | 'email' | 'number' | 'select' | 'multi-select' | 'checkbox' | 'textarea' | 'date' | 'array';
  label: string;
  placeholder?: string;
  helpText?: string;
  validation?: FieldValidation;
  options?: string[] | { label: string; value: any }[];
  optionsSource?: {
    dataPath: string;          // e.g., 'entities', 'contacts'
    labelField: string;        // e.g., 'name'
    valueField: string;        // e.g., 'id'
  };
  arrayItemType?: 'text' | 'object';
  arraySchema?: FieldDefinition[];
  arrayItemSchema?: {
    fields: FieldDefinition[];
  };
  displayConfig?: {
    placeholder?: string;
    helpText?: string;
    rows?: number;
    addButtonLabel?: string;
    removeButtonLabel?: string;
    emptyMessage?: string;
  };
}

export interface FieldValidation {
  required?: boolean;
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

export interface DataConfig {
  fetch: FetchStrategy;
  save: SaveStrategy;
}

export interface FetchStrategy {
  strategy: 'prisma-simple' | 'prisma-compose' | 'custom';
  model?: string;
  sources?: DataSource[];
  repository?: string;
  method?: string;
}

export interface DataSource {
  repository: string;
  method: string;
  params: string[];
  resultKey: string;
}

export interface SaveStrategy {
  strategy: 'prisma-upsert' | 'prisma-create' | 'multi-table' | 'custom';
  transactional: boolean;
  model?: string;
  tables?: TableSaveConfig[];
  repository?: string;
  method?: string;
  bulkOperation?: boolean;
  deleteExisting?: boolean;
}

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
