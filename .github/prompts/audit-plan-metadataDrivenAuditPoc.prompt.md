# Metadata-Driven Audit Management System - Complete POC Generator

Generate a complete proof-of-concept for a metadata-driven audit management system with Node.js 22 (TypeScript) backend and Angular 21 frontend.

## System Overview

Build an 8-phase, 80-step audit system where each step has unique forms and data requirements. Instead of creating 80+ endpoints, use a metadata-driven architecture with:
- **Parameterized REST API**: `/api/audits/:auditId/phases/:phaseId/steps/:stepId`
- **TypeScript configuration files** defining form schemas, validation rules, and data access strategies
- **Hybrid metadata storage**: TypeScript configs synced to PostgreSQL
- **Three-tier repository pattern**: Generic (Prisma) + Domain (shared) + Custom (complex queries)
- **Multi-layer validation**: Field-level, business rules, cross-step, role-based
- **Generic UI components**: No step-specific Angular components - one dynamic form handles all steps

## Technology Stack

### Backend
- Node.js 22 with TypeScript 5.5+
- Express.js for REST API
- Prisma ORM with PostgreSQL (Neon remote DB)
- class-validator for validation
- express-json-validator-middleware for request validation

### Frontend
- Angular 21 with standalone components
- Signals API for reactive state
- Angular Reactive Forms with dynamic form building
- TailwindCSS for styling
- HTTP Client with interceptors
- **No unique DTOs per step** - generic form value handling

### Database
- PostgreSQL (Neon remote connection)
- Prisma migrations for schema management

## POC Scope: 6 Representative Steps

Implement 6 steps across 2 phases demonstrating all fetch/save pattern combinations:

### Phase 1: Client Assessment (3 steps)

**Step 1 - Pattern 1: Simple Single-Table CRUD**
- **Fetch**: `prisma-simple` - Read from one table
- **Save**: `prisma-upsert` - Write to one table
- Form: Client basic info (name, email, industry, phone)
- Storage: Single table `clients`
- Validation: Field-level only
- Repository: GenericStepRepository

**Step 2 - Pattern 2: Multi-Source Fetch + Multi-Table Save**
- **Fetch**: `prisma-compose` - Join client + entities + contacts
- **Save**: `multi-table` - Update entity selection + bulk upsert contacts
- Form: Entity selection + contact list
- Storage: 3 tables with relations
- Validation: Field-level + business rule (entity must belong to client)
- Repository: ClientRepository + EntityRepository composition

**Step 3 - Pattern 3: Complex Fetch + Simple Save**
- **Fetch**: `custom` - Custom repository with Prisma $queryRaw (CTEs, aggregations)
- **Save**: `prisma-upsert` - Simple single-table save
- Form: Risk assessment with historical context
- Storage: Fetch from multiple tables with complex SQL, save to one table
- Validation: Field-level + cross-step + conditional
- Repository: Phase1Step3Repository (custom)

### Phase 2: Checklist Execution (3 steps)

**Step 4 - Pattern 4: Array CRUD**
- **Fetch**: `prisma-simple` - Read array from one table
- **Save**: `prisma-create` (bulk) - Delete old + create new items
- Form: Checklist items (array of objects)
- Storage: One table with bulk operations
- Validation: Array min/max items
- Repository: GenericStepRepository with array handling

**Step 5 - Pattern 5: Conditional Save**
- **Fetch**: `prisma-compose` - Document + review data
- **Save**: `multi-table` (conditional) - Save document always, save review only if status changed
- Form: Document review with conditional justification field
- Storage: 2 tables with conditional logic
- Validation: Conditional (if rejected, justification required)
- Repository: DocumentRepository

**Step 6 - Pattern 6: Complex Multi-Table Transaction**
- **Fetch**: `custom` - Prisma nested include (findings + evidence + recommendations)
- **Save**: `custom` - Transaction across 4 tables with audit trail
- Form: Findings with nested evidence array and recommendations array
- Storage: 4 tables (findings, evidence, recommendations, audit_trail)
- Validation: Cross-step (evidence must reference Step 5 documents)
- Repository: Phase2Step6Repository (custom)

## Complete Pattern Reference

| **Pattern** | **Fetch Strategy** | **Save Strategy** | **Use Case** | **Example** |
|-------------|-------------------|-------------------|--------------|-------------|
| 1 | `prisma-simple` | `prisma-upsert` | Single table CRUD | Step 1 - Client info |
| 2 | `prisma-compose` | `multi-table` | Multiple related tables | Step 2 - Entity + contacts |
| 3 | `custom` | `prisma-upsert` | Complex read, simple write | Step 3 - Risk assessment |
| 4 | `prisma-simple` | `prisma-create` (bulk) | Array management | Step 4 - Checklist items |
| 5 | `prisma-compose` | `multi-table` (conditional) | Conditional fields | Step 5 - Document review |
| 6 | `custom` | `custom` | Complex multi-table | Step 6 - Findings + evidence |

## Implementation Requirements

### 1. Backend Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── types/
│   │   │   └── step-config.types.ts          # TypeScript interfaces for all patterns
│   │   ├── steps/
│   │   │   ├── phase1/
│   │   │   │   ├── step1.config.ts          # Pattern 1: Simple CRUD
│   │   │   │   ├── step2.config.ts          # Pattern 2: Multi-source
│   │   │   │   └── step3.config.ts          # Pattern 3: Complex fetch
│   │   │   └── phase2/
│   │   │       ├── step4.config.ts          # Pattern 4: Array CRUD
│   │   │       ├── step5.config.ts          # Pattern 5: Conditional
│   │   │       └── step6.config.ts          # Pattern 6: Complex multi-table
│   │   ├── step-registry.ts                 # Map: phaseId-stepId → Config
│   │   └── database.ts                      # Prisma client singleton
│   ├── controllers/
│   │   ├── audit.controller.ts              # Audit CRUD
│   │   ├── step.controller.ts               # Generic step handler (ONE controller for all steps)
│   │   └── metadata.controller.ts           # Form schema endpoint
│   ├── services/
│   │   ├── metadata-registry.service.ts     # Load configs from DB/cache
│   │   ├── step.service.ts                  # Orchestrate fetch/save based on strategy
│   │   └── validation.service.ts            # Multi-layer validation engine
│   ├── repositories/
│   │   ├── base/
│   │   │   └── base-step.repository.ts      # Abstract base class
│   │   ├── generic/
│   │   │   └── generic-step.repository.ts   # Pattern 1 & 4: Simple Prisma CRUD
│   │   ├── domain/
│   │   │   ├── client.repository.ts         # Pattern 2: Shared client ops
│   │   │   ├── entity.repository.ts         # Pattern 2: Shared entity ops
│   │   │   ├── checklist.repository.ts
│   │   │   └── document.repository.ts       # Pattern 5: Conditional save
│   │   ├── custom/
│   │   │   ├── phase1-step3.repository.ts   # Pattern 3: Complex $queryRaw
│   │   │   └── phase2-step6.repository.ts   # Pattern 6: Multi-table transaction
│   │   └── repository-resolver.ts           # DI container for repositories
│   ├── validators/
│   │   ├── validator-registry.ts
│   │   └── custom/
│   │       ├── entity-belongs-to-client.validator.ts
│   │       ├── risk-increased.validator.ts
│   │       └── document-reference.validator.ts
│   ├── middleware/
│   │   ├── validation.middleware.ts         # Schema-based validation
│   │   └── error-handler.middleware.ts
│   ├── routes/
│   │   ├── audit.routes.ts
│   │   ├── step.routes.ts                   # Parameterized routes
│   │   └── metadata.routes.ts
│   ├── scripts/
│   │   └── sync-metadata-to-db.ts           # CI/CD sync script
│   └── server.ts
├── prisma/
│   ├── schema.prisma                        # Complete schema for all 6 steps
│   ├── migrations/
│   └── seed.ts                              # Sample audit data
├── package.json
├── tsconfig.json
└── .env
```

### 2. Frontend Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── features/
│   │   │   └── audit/
│   │   │       ├── components/
│   │   │       │   ├── audit-list.component.ts       # Standalone
│   │   │       │   ├── audit-wizard.component.ts     # Main wizard
│   │   │       │   ├── phase-navigator.component.ts  # Phase tabs
│   │   │       │   └── step-form.component.ts        # Generic step container (handles ALL steps)
│   │   │       ├── services/
│   │   │       │   ├── audit.service.ts              # Audit CRUD HTTP calls
│   │   │       │   ├── metadata.service.ts           # Form schema cache
│   │   │       │   └── step-data.service.ts          # Step CRUD + data adapters
│   │   │       ├── models/
│   │   │       │   ├── audit.model.ts
│   │   │       │   ├── step-config.model.ts          # TypeScript interface matching backend
│   │   │       │   └── form-field.model.ts
│   │   │       └── validators/
│   │   │           └── dynamic-validators.ts         # Angular validators from metadata
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── dynamic-form/
│   │   │   │   │   ├── dynamic-form.component.ts     # Generic form builder (builds ANY step form)
│   │   │   │   │   ├── field-text.component.ts
│   │   │   │   │   ├── field-select.component.ts
│   │   │   │   │   ├── field-textarea.component.ts
│   │   │   │   │   ├── field-array.component.ts      # Repeatable array items with add/remove
│   │   │   │   │   └── field-checkbox.component.ts
│   │   │   │   └── loading-spinner.component.ts
│   │   │   └── utils/
│   │   │       ├── form-builder.util.ts              # FormGroup factory from schema
│   │   │       └── expression-evaluator.util.ts      # Evaluate conditional rules
│   │   ├── core/
│   │   │   ├── interceptors/
│   │   │   │   └── http-error.interceptor.ts
│   │   │   └── services/
│   │   │       └── api.service.ts
│   │   └── app.routes.ts
│   ├── environments/
│   │   └── environment.ts
│   └── main.ts
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

### 3. Complete TypeScript Configuration Interfaces

Create comprehensive interfaces in `src/config/types/step-config.types.ts`:

```typescript
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
  type: 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'array';
  label: string;
  placeholder?: string;
  helpText?: string;
  validation?: FieldValidation;
  options?: string[] | { label: string; value: any }[];
  arrayItemType?: 'text' | 'object';
  arraySchema?: FieldDefinition[];
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
```

### 4. Complete Step Configuration Examples

#### Pattern 1: Step 1 - Simple CRUD

```typescript
// src/config/steps/phase1/step1.config.ts

import { StepConfig } from '../../types/step-config.types';

export const Phase1Step1Config: StepConfig = {
  phaseId: 1,
  stepId: 1,
  stepName: 'Client Basic Information',
  description: 'Capture client details',
  
  formSchema: {
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Client Name',
        placeholder: 'Enter client name',
        validation: {
          required: true,
          minLength: 3,
          maxLength: 100
        }
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        validation: {
          required: true,
          email: true
        }
      },
      {
        name: 'industry',
        type: 'select',
        label: 'Industry',
        options: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Other'],
        validation: {
          required: true,
          enum: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Other']
        }
      },
      {
        name: 'phone',
        type: 'text',
        label: 'Phone Number',
        placeholder: '+1 (555) 123-4567',
        validation: {
          pattern: '^\\+?[1-9]\\d{1,14}$',
          patternMessage: 'Enter a valid phone number'
        }
      }
    ]
  },
  
  dataConfig: {
    fetch: {
      strategy: 'prisma-simple',
      model: 'client'
    },
    
    save: {
      strategy: 'prisma-upsert',
      transactional: false,
      model: 'client',
      fieldMapping: {
        'name': 'name',
        'email': 'email',
        'industry': 'industry',
        'phone': 'phone'
      },
      context: {
        'auditId': 'auditId'
      }
    }
  }
};
```

#### Pattern 2: Step 2 - Multi-Source Compose

```typescript
// src/config/steps/phase1/step2.config.ts

export const Phase1Step2Config: StepConfig = {
  phaseId: 1,
  stepId: 2,
  stepName: 'Entity Selection',
  
  formSchema: {
    fields: [
      {
        name: 'clientName',
        type: 'text',
        label: 'Client Name',
        validation: { required: false }
      },
      {
        name: 'selectedEntityId',
        type: 'select',
        label: 'Select Entity',
        options: [],
        validation: {
          required: true,
          customValidator: 'EntityBelongsToClientValidator'
        }
      },
      {
        name: 'contacts',
        type: 'array',
        label: 'Contact Persons',
        arrayItemType: 'object',
        arraySchema: [
          {
            name: 'name',
            type: 'text',
            label: 'Name',
            validation: { required: true, minLength: 2 }
          },
          {
            name: 'email',
            type: 'email',
            label: 'Email',
            validation: { required: true, email: true }
          },
          {
            name: 'role',
            type: 'text',
            label: 'Role',
            validation: { required: false }
          }
        ],
        validation: {
          minItems: 1,
          maxItems: 10
        }
      }
    ],
    businessRules: [
      {
        type: 'cross-step',
        validatorClass: 'EntityBelongsToClientValidator',
        params: ['auditId', 'selectedEntityId']
      }
    ]
  },
  
  dataConfig: {
    fetch: {
      strategy: 'prisma-compose',
      sources: [
        {
          repository: 'ClientRepository',
          method: 'getByAudit',
          params: ['auditId'],
          resultKey: 'client'
        },
        {
          repository: 'EntityRepository',
          method: 'getByClient',
          params: ['auditId'],
          resultKey: 'entities'
        },
        {
          repository: 'ClientRepository',
          method: 'getContacts',
          params: ['auditId'],
          resultKey: 'contacts'
        }
      ]
    },
    
    save: {
      strategy: 'multi-table',
      transactional: true,
      tables: [
        {
          repository: 'EntityRepository',
          method: 'updateSelection',
          fieldMapping: {
            'selectedEntityId': 'entityId'
          },
          context: {
            'auditId': 'auditId'
          }
        },
        {
          repository: 'ClientRepository',
          method: 'upsertContacts',
          fieldMapping: {
            'contacts': 'contacts'
          },
          context: {
            'auditId': 'auditId'
          }
        }
      ]
    }
  }
};
```

#### Pattern 3: Step 3 - Complex Fetch with Custom Repository

```typescript
// src/config/steps/phase1/step3.config.ts

export const Phase1Step3Config: StepConfig = {
  phaseId: 1,
  stepId: 3,
  stepName: 'Risk Assessment',
  
  formSchema: {
    fields: [
      {
        name: 'currentRiskLevel',
        type: 'select',
        label: 'Current Risk Level',
        options: ['Low', 'Medium', 'High', 'Critical'],
        validation: {
          required: true,
          enum: ['Low', 'Medium', 'High', 'Critical']
        }
      },
      {
        name: 'riskScore',
        type: 'number',
        label: 'Risk Score (0-100)',
        validation: {
          required: true,
          min: 0,
          max: 100
        }
      },
      {
        name: 'justification',
        type: 'textarea',
        label: 'Justification',
        helpText: 'Required if risk increased from previous assessment',
        validation: {
          minLength: 50,
          maxLength: 1000
        }
      },
      {
        name: 'previousRiskLevel',
        type: 'text',
        label: 'Previous Risk Level'
      },
      {
        name: 'historicalTrend',
        type: 'text',
        label: 'Historical Trend'
      },
      {
        name: 'industryAverage',
        type: 'number',
        label: 'Industry Average Risk Score'
      }
    ],
    businessRules: [
      {
        type: 'conditional',
        condition: 'currentRiskLevel === "High" || currentRiskLevel === "Critical"',
        then: {
          field: 'justification',
          validation: {
            required: true,
            minLength: 100
          }
        }
      },
      {
        type: 'cross-step',
        validatorClass: 'RiskIncreasedValidator',
        params: ['auditId', 'currentRiskLevel', 'previousRiskLevel']
      }
    ]
  },
  
  dataConfig: {
    fetch: {
      strategy: 'custom',
      repository: 'Phase1Step3Repository',
      method: 'getRiskAssessmentData'
    },
    
    save: {
      strategy: 'prisma-upsert',
      transactional: false,
      model: 'riskAssessment',
      fieldMapping: {
        'currentRiskLevel': 'riskLevel',
        'riskScore': 'riskScore',
        'justification': 'justification',
        'previousRiskLevel': 'previousRisk'
      },
      context: {
        'auditId': 'auditId',
        'assessedAt': 'NOW()'
      }
    }
  }
};
```

#### Pattern 4: Step 4 - Array CRUD

```typescript
// src/config/steps/phase2/step4.config.ts

export const Phase2Step4Config: StepConfig = {
  phaseId: 2,
  stepId: 4,
  stepName: 'Checklist Execution',
  
  formSchema: {
    fields: [
      {
        name: 'items',
        type: 'array',
        label: 'Checklist Items',
        arrayItemType: 'object',
        arraySchema: [
          {
            name: 'description',
            type: 'text',
            label: 'Task Description',
            validation: { required: true, minLength: 5, maxLength: 200 }
          },
          {
            name: 'status',
            type: 'select',
            label: 'Status',
            options: ['pending', 'in-progress', 'completed', 'blocked'],
            validation: {
              required: true,
              enum: ['pending', 'in-progress', 'completed', 'blocked']
            }
          },
          {
            name: 'notes',
            type: 'textarea',
            label: 'Notes',
            validation: { maxLength: 500 }
          }
        ],
        validation: {
          minItems: 1,
          maxItems: 50
        }
      }
    ]
  },
  
  dataConfig: {
    fetch: {
      strategy: 'prisma-simple',
      model: 'checklistItem'
    },
    
    save: {
      strategy: 'prisma-create',
      transactional: true,
      model: 'checklistItem',
      fieldMapping: {
        'items': '*'
      },
      context: {
        'auditId': 'auditId',
        'phaseId': 'phaseId',
        'stepId': 'stepId'
      },
      bulkOperation: true,
      deleteExisting: true
    }
  }
};
```

#### Pattern 5: Step 5 - Conditional Save

```typescript
// src/config/steps/phase2/step5.config.ts

export const Phase2Step5Config: StepConfig = {
  phaseId: 2,
  stepId: 5,
  stepName: 'Document Review',
  
  formSchema: {
    fields: [
      {
        name: 'fileName',
        type: 'text',
        label: 'Document Name',
        validation: { required: true }
      },
      {
        name: 'fileType',
        type: 'select',
        label: 'Document Type',
        options: ['PDF', 'Excel', 'Word', 'Image'],
        validation: { required: true }
      },
      {
        name: 'reviewStatus',
        type: 'select',
        label: 'Review Status',
        options: ['pending', 'approved', 'rejected'],
        validation: {
          required: true,
          enum: ['pending', 'approved', 'rejected']
        }
      },
      {
        name: 'reviewedBy',
        type: 'text',
        label: 'Reviewed By',
        validation: { minLength: 2 }
      },
      {
        name: 'justification',
        type: 'textarea',
        label: 'Rejection Justification',
        helpText: 'Required when status is rejected',
        validation: { minLength: 20, maxLength: 500 }
      }
    ],
    businessRules: [
      {
        type: 'conditional',
        condition: 'reviewStatus === "rejected"',
        then: {
          field: 'justification',
          validation: {
            required: true,
            minLength: 50
          }
        }
      },
      {
        type: 'conditional',
        condition: 'reviewStatus === "approved" || reviewStatus === "rejected"',
        then: {
          field: 'reviewedBy',
          validation: { required: true }
        }
      }
    ]
  },
  
  dataConfig: {
    fetch: {
      strategy: 'prisma-compose',
      sources: [
        {
          repository: 'DocumentRepository',
          method: 'getByAudit',
          params: ['auditId'],
          resultKey: 'document'
        },
        {
          repository: 'DocumentRepository',
          method: 'getReview',
          params: ['auditId'],
          resultKey: 'review'
        }
      ]
    },
    
    save: {
      strategy: 'multi-table',
      transactional: true,
      tables: [
        {
          repository: 'DocumentRepository',
          method: 'upsertDocument',
          fieldMapping: {
            'fileName': 'fileName',
            'fileType': 'fileType'
          },
          context: {
            'auditId': 'auditId'
          }
        },
        {
          repository: 'DocumentRepository',
          method: 'upsertReview',
          fieldMapping: {
            'reviewStatus': 'status',
            'reviewedBy': 'reviewedBy',
            'justification': 'justification'
          },
          context: {
            'auditId': 'auditId',
            'reviewedAt': 'NOW()'
          },
          conditional: {
            field: 'reviewStatus',
            notEquals: 'pending'
          }
        }
      ]
    }
  }
};
```

#### Pattern 6: Step 6 - Complex Multi-Table Transaction

```typescript
// src/config/steps/phase2/step6.config.ts

export const Phase2Step6Config: StepConfig = {
  phaseId: 2,
  stepId: 6,
  stepName: 'Findings & Recommendations',
  
  formSchema: {
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Finding Title',
        validation: { required: true, minLength: 10, maxLength: 200 }
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Detailed Description',
        validation: { required: true, minLength: 50, maxLength: 2000 }
      },
      {
        name: 'severity',
        type: 'select',
        label: 'Severity',
        options: ['Low', 'Medium', 'High', 'Critical'],
        validation: { required: true }
      },
      {
        name: 'evidence',
        type: 'array',
        label: 'Evidence',
        arrayItemType: 'object',
        arraySchema: [
          {
            name: 'documentId',
            type: 'number',
            label: 'Reference Document',
            validation: {
              required: true,
              customValidator: 'DocumentExistsValidator'
            }
          },
          {
            name: 'description',
            type: 'text',
            label: 'Evidence Description',
            validation: { required: true, minLength: 10 }
          },
          {
            name: 'type',
            type: 'select',
            label: 'Type',
            options: ['Document', 'Screenshot', 'Interview', 'System Log'],
            validation: { required: true }
          }
        ],
        validation: {
          minItems: 1,
          maxItems: 20
        }
      },
      {
        name: 'recommendations',
        type: 'array',
        label: 'Recommendations',
        arrayItemType: 'object',
        arraySchema: [
          {
            name: 'description',
            type: 'textarea',
            label: 'Recommendation',
            validation: { required: true, minLength: 20, maxLength: 500 }
          },
          {
            name: 'priority',
            type: 'select',
            label: 'Priority',
            options: ['Low', 'Medium', 'High'],
            validation: { required: true }
          }
        ],
        validation: {
          minItems: 1,
          maxItems: 10
        }
      }
    ],
    businessRules: [
      {
        type: 'cross-step',
        validatorClass: 'DocumentReferenceValidator',
        params: ['auditId', 'evidence']
      }
    ]
  },
  
  dataConfig: {
    fetch: {
      strategy: 'custom',
      repository: 'Phase2Step6Repository',
      method: 'getFindingsWithDetails'
    },
    
    save: {
      strategy: 'custom',
      transactional: true,
      repository: 'Phase2Step6Repository',
      method: 'saveFindingsWithDetails'
    }
  }
};
```

### 5. Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Audit {
  id          Int       @id @default(autoincrement())
  name        String
  status      String    @default("draft")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  client          Client?
  phases          AuditPhase[]
  checklistItems  ChecklistItem[]
  documents       Document[]
  findings        Finding[]
}

model AuditPhase {
  id          Int      @id @default(autoincrement())
  auditId     Int
  phaseId     Int
  status      String   @default("pending")
  completedAt DateTime?
  
  audit       Audit    @relation(fields: [auditId], references: [id], onDelete: Cascade)
  
  @@unique([auditId, phaseId])
}

model Client {
  id          Int      @id @default(autoincrement())
  auditId     Int      @unique
  name        String
  email       String
  industry    String
  phone       String?
  createdAt   DateTime @default(now())
  
  audit       Audit    @relation(fields: [auditId], references: [id], onDelete: Cascade)
  entities    Entity[]
  contacts    Contact[]
}

model Entity {
  id                  Int      @id @default(autoincrement())
  clientId            Int
  name                String
  type                String
  registrationNumber  String?
  
  client              Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model Contact {
  id          Int      @id @default(autoincrement())
  clientId    Int
  name        String
  email       String
  phone       String?
  role        String?
  
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model RiskAssessment {
  id              Int      @id @default(autoincrement())
  auditId         Int      @unique
  riskLevel       String
  riskScore       Float
  previousRisk    String?
  justification   String?
  assessedAt      DateTime @default(now())
  
  @@index([auditId])
}

model ChecklistItem {
  id              Int      @id @default(autoincrement())
  auditId         Int
  phaseId         Int
  stepId          Int
  description     String
  status          String   @default("pending")
  notes           String?
  completedAt     DateTime?
  
  audit           Audit    @relation(fields: [auditId], references: [id], onDelete: Cascade)
  
  @@index([auditId, phaseId, stepId])
}

model Document {
  id              Int      @id @default(autoincrement())
  auditId         Int
  fileName        String
  fileType        String
  fileSize        Int
  uploadedAt      DateTime @default(now())
  
  audit           Audit    @relation(fields: [auditId], references: [id], onDelete: Cascade)
  review          DocumentReview?
  evidenceLinks   Evidence[]
}

model DocumentReview {
  id              Int      @id @default(autoincrement())
  documentId      Int      @unique
  status          String
  reviewedBy      String?
  reviewedAt      DateTime?
  justification   String?
  
  document        Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}

model Finding {
  id              Int      @id @default(autoincrement())
  auditId         Int
  title           String
  description     String
  severity        String
  status          String   @default("open")
  createdAt       DateTime @default(now())
  
  audit           Audit         @relation(fields: [auditId], references: [id], onDelete: Cascade)
  evidence        Evidence[]
  recommendations Recommendation[]
  auditTrail      FindingAuditTrail[]
  
  @@index([auditId])
}

model Evidence {
  id          Int      @id @default(autoincrement())
  findingId   Int
  documentId  Int?
  description String
  type        String
  
  finding     Finding  @relation(fields: [findingId], references: [id], onDelete: Cascade)
  document    Document? @relation(fields: [documentId], references: [id])
}

model Recommendation {
  id          Int      @id @default(autoincrement())
  findingId   Int
  description String
  priority    String
  status      String   @default("pending")
  
  finding     Finding  @relation(fields: [findingId], references: [id], onDelete: Cascade)
}

model FindingAuditTrail {
  id          Int      @id @default(autoincrement())
  findingId   Int
  action      String
  changedBy   String
  changedAt   DateTime @default(now())
  changes     Json
  
  finding     Finding  @relation(fields: [findingId], references: [id], onDelete: Cascade)
}

model StepConfiguration {
  id          Int      @id @default(autoincrement())
  phaseId     Int
  stepId      Int
  stepName    String
  formSchema  Json
  dataConfig  Json
  isActive    Boolean  @default(true)
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([phaseId, stepId])
}

model StepData {
  id          Int      @id @default(autoincrement())
  auditId     Int
  phaseId     Int
  stepId      Int
  data        Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([auditId, phaseId, stepId])
}
```

### 6. Key Backend Service Implementations

#### Step Service (Strategy Pattern)

```typescript
// src/services/step.service.ts

export class StepService {
  constructor(
    private prisma: PrismaClient,
    private metadataRegistry: MetadataRegistry,
    private validationService: ValidationService,
    private repositoryResolver: RepositoryResolver,
    private genericRepo: GenericStepRepository
  ) {}

  async getStepData(auditId: number, phaseId: number, stepId: number) {
    const config = this.metadataRegistry.getConfig(phaseId, stepId);
    
    switch (config.dataConfig.fetch.strategy) {
      case 'prisma-simple':
        return this.genericRepo.fetchSimple(config, { auditId, phaseId, stepId });
      
      case 'prisma-compose':
        return this.executeCompose(config.dataConfig.fetch.sources, { auditId, phaseId, stepId });
      
      case 'custom':
        const repo = this.repositoryResolver.get(config.dataConfig.fetch.repository);
        return repo[config.dataConfig.fetch.method](auditId);
    }
  }
  
  private async executeCompose(sources: DataSource[], context: any) {
    const result: any = {};
    
    for (const source of sources) {
      const repo = this.repositoryResolver.get(source.repository);
      const params = source.params.map(p => context[p]);
      result[source.resultKey] = await repo[source.method](...params);
    }
    
    return result;
  }
  
  async saveStepData(auditId: number, phaseId: number, stepId: number, payload: any) {
    const config = this.metadataRegistry.getConfig(phaseId, stepId);
    
    // Validate first
    await this.validationService.validate(payload, config.formSchema);
    
    // Save based on strategy
    if (config.dataConfig.save.transactional) {
      return this.prisma.$transaction(async (trx) => {
        return this.executeSave(config.dataConfig.save, payload, { auditId, phaseId, stepId }, trx);
      });
    } else {
      return this.executeSave(config.dataConfig.save, payload, { auditId, phaseId, stepId });
    }
  }
  
  private async executeSave(saveConfig: SaveStrategy, payload: any, context: any, trx?: any) {
    switch (saveConfig.strategy) {
      case 'prisma-upsert':
      case 'prisma-create':
        return this.genericRepo.save(saveConfig, payload, context, trx);
      
      case 'multi-table':
        const results = [];
        for (const tableConfig of saveConfig.tables) {
          const repo = this.repositoryResolver.get(tableConfig.repository);
          const data = this.mapFields(payload, tableConfig.fieldMapping);
          const ctx = this.buildContext(tableConfig.context, context);
          results.push(await repo[tableConfig.method](data, ctx, trx));
        }
        return results;
      
      case 'custom':
        const customRepo = this.repositoryResolver.get(saveConfig.repository);
        return customRepo[saveConfig.method](payload, context, trx);
    }
  }
  
  private mapFields(payload: any, fieldMapping: Record<string, string>): any {
    const mapped: any = {};
    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      if (sourceField === '*') {
        return payload;
      }
      mapped[targetField] = payload[sourceField];
    }
    return mapped;
  }
  
  private buildContext(contextConfig: Record<string, string>, context: any): any {
    const result: any = {};
    for (const [key, value] of Object.entries(contextConfig)) {
      result[key] = context[value] || value;
    }
    return result;
  }
}
```

### 7. Frontend Generic Components

#### Step Form Container (Handles ALL Steps)

```typescript
// src/app/features/audit/components/step-form.component.ts

@Component({
  selector: 'app-step-form',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent, LoadingSpinnerComponent],
  template: `
    <div class="step-container max-w-4xl mx-auto p-6">
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900">{{ stepMetadata()?.stepName }}</h2>
          @if (stepMetadata()?.description) {
            <p class="mt-2 text-gray-600">{{ stepMetadata()!.description }}</p>
          }
        </div>
        
        <app-dynamic-form
          [formSchema]="stepMetadata()!.formSchema"
          [initialData]="stepData()"
          (formSubmit)="onSubmit($event)"
          (formCancel)="onCancel()"
        />
      }
    </div>
  `
})
export class StepFormComponent implements OnInit {
  auditId = input.required<number>();
  phaseId = input.required<number>();
  stepId = input.required<number>();
  
  loading = signal(true);
  stepMetadata = signal<StepConfig | null>(null);
  stepData = signal<any>(null);
  
  constructor(
    private metadataService: MetadataService,
    private stepDataService: StepDataService,
    private router: Router
  ) {}
  
  async ngOnInit() {
    await this.loadStepMetadata();
    await this.loadStepData();
    this.loading.set(false);
  }
  
  private async loadStepMetadata() {
    const metadata = await this.metadataService.getStepMetadata(
      this.phaseId(),
      this.stepId()
    );
    this.stepMetadata.set(metadata);
  }
  
  private async loadStepData() {
    try {
      const data = await this.stepDataService.getStepData(
        this.auditId(),
        this.phaseId(),
        this.stepId()
      );
      this.stepData.set(data);
    } catch (error) {
      this.stepData.set(null);
    }
  }
  
  async onSubmit(formValue: any) {
    this.loading.set(true);
    
    try {
      await this.stepDataService.saveStepData(
        this.auditId(),
        this.phaseId(),
        this.stepId(),
        formValue
      );
      
      this.router.navigate(['/audits', this.auditId(), 'wizard']);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      this.loading.set(false);
    }
  }
  
  onCancel() {
    this.router.navigate(['/audits', this.auditId(), 'wizard']);
  }
}
```

#### Dynamic Form Builder

```typescript
// src/app/shared/components/dynamic-form/dynamic-form.component.ts

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FieldTextComponent,
    FieldSelectComponent,
    FieldArrayComponent,
    FieldCheckboxComponent
  ],
  template: `
    <form [formGroup]="form()" (ngSubmit)="handleSubmit()" class="space-y-6">
      @for (field of formSchema().fields; track field.name) {
        <div class="form-field">
          @switch (field.type) {
            @case ('text') {
              <app-field-text [field]="field" [control]="getControl(field.name)" />
            }
            @case ('email') {
              <app-field-text [field]="field" [control]="getControl(field.name)" type="email" />
            }
            @case ('number') {
              <app-field-text [field]="field" [control]="getControl(field.name)" type="number" />
            }
            @case ('select') {
              <app-field-select [field]="field" [control]="getControl(field.name)" />
            }
            @case ('checkbox') {
              <app-field-checkbox [field]="field" [control]="getControl(field.name)" />
            }
            @case ('textarea') {
              <app-field-text [field]="field" [control]="getControl(field.name)" type="textarea" />
            }
            @case ('array') {
              <app-field-array [field]="field" [formArray]="getFormArray(field.name)" />
            }
          }
          
          @if (getControl(field.name).invalid && getControl(field.name).touched) {
            <div class="mt-1 text-sm text-red-600">
              @for (error of getFieldErrors(field.name); track error) {
                <div>{{ error }}</div>
              }
            </div>
          }
        </div>
      }
      
      @if (formErrors().length > 0) {
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 class="text-red-800 font-semibold mb-2">Validation Errors:</h4>
          <ul class="list-disc list-inside space-y-1">
            @for (error of formErrors(); track error) {
              <li class="text-red-700">{{ error }}</li>
            }
          </ul>
        </div>
      }
      
      <div class="flex gap-3">
        <button 
          type="submit" 
          [disabled]="form().invalid || submitting()"
          class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {{ submitting() ? 'Saving...' : 'Save & Continue' }}
        </button>
        <button 
          type="button"
          (click)="handleCancel()"
          class="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  `
})
export class DynamicFormComponent implements OnInit {
  formSchema = input.required<FormSchema>();
  initialData = input<any>(null);
  
  form = signal<FormGroup>(new FormGroup({}));
  formErrors = signal<string[]>([]);
  submitting = signal(false);
  
  formSubmit = output<any>();
  formCancel = output<void>();
  
  private fb = inject(FormBuilder);
  
  ngOnInit() {
    this.buildForm();
  }
  
  private buildForm() {
    const group: any = {};
    
    for (const field of this.formSchema().fields) {
      const validators = this.buildValidators(field.validation || {});
      const initialValue = this.getInitialValue(field);
      
      if (field.type === 'array') {
        group[field.name] = this.fb.array(
          this.buildArrayItems(field, initialValue),
          validators
        );
      } else {
        group[field.name] = this.fb.control(initialValue, validators);
      }
    }
    
    this.form.set(this.fb.group(group));
    this.applyBusinessRuleValidators();
  }
  
  private getInitialValue(field: FieldDefinition): any {
    const data = this.initialData();
    if (!data) {
      return field.type === 'array' ? [] : '';
    }
    return this.extractFieldValue(data, field.name);
  }
  
  private extractFieldValue(data: any, fieldName: string): any {
    if (data.hasOwnProperty(fieldName)) {
      return data[fieldName];
    }
    
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        const nestedValue = this.extractFieldValue(data[key], fieldName);
        if (nestedValue !== undefined) {
          return nestedValue;
        }
      }
    }
    
    return '';
  }
  
  private buildValidators(validation: FieldValidation): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    
    if (validation.required) validators.push(Validators.required);
    if (validation.email) validators.push(Validators.email);
    if (validation.minLength) validators.push(Validators.minLength(validation.minLength));
    if (validation.maxLength) validators.push(Validators.maxLength(validation.maxLength));
    if (validation.min !== undefined) validators.push(Validators.min(validation.min));
    if (validation.max !== undefined) validators.push(Validators.max(validation.max));
    if (validation.pattern) validators.push(Validators.pattern(validation.pattern));
    
    return validators;
  }
  
  private applyBusinessRuleValidators() {
    const businessRules = this.formSchema().businessRules || [];
    
    for (const rule of businessRules) {
      if (rule.type === 'conditional') {
        this.form().valueChanges.subscribe(value => {
          if (this.evaluateCondition(rule.condition!, value)) {
            const control = this.getControl(rule.then!.field);
            const validators = this.buildValidators(rule.then!.validation);
            control.setValidators(validators);
            control.updateValueAndValidity();
          } else {
            const control = this.getControl(rule.then!.field);
            control.clearValidators();
            control.updateValueAndValidity();
          }
        });
      }
    }
  }
  
  private evaluateCondition(condition: string, formValue: any): boolean {
    try {
      const context = { ...formValue };
      let expression = condition;
      for (const key of Object.keys(context)) {
        expression = expression.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          JSON.stringify(context[key])
        );
      }
      return new Function(`return ${expression}`)();
    } catch {
      return false;
    }
  }
  
  getControl(fieldName: string): FormControl {
    return this.form().get(fieldName) as FormControl;
  }
  
  getFormArray(fieldName: string): FormArray {
    return this.form().get(fieldName) as FormArray;
  }
  
  getFieldErrors(fieldName: string): string[] {
    const control = this.getControl(fieldName);
    const errors: string[] = [];
    
    if (control.errors) {
      if (control.errors['required']) errors.push('This field is required');
      if (control.errors['email']) errors.push('Invalid email format');
      if (control.errors['minlength']) {
        errors.push(`Minimum length is ${control.errors['minlength'].requiredLength}`);
      }
      if (control.errors['pattern']) {
        const field = this.formSchema().fields.find(f => f.name === fieldName);
        errors.push(field?.validation?.patternMessage || 'Invalid format');
      }
    }
    
    return errors;
  }
  
  handleSubmit() {
    if (this.form().invalid) {
      this.form().markAllAsTouched();
      return;
    }
    
    this.submitting.set(true);
    this.formSubmit.emit(this.form().value);
  }
  
  handleCancel() {
    this.formCancel.emit();
  }
}
```

#### Data Adapter Service

```typescript
// src/app/features/audit/services/step-data.service.ts

@Injectable({ providedIn: 'root' })
export class StepDataService {
  constructor(private http: HttpClient) {}
  
  async getStepData(auditId: number, phaseId: number, stepId: number): Promise<any> {
    const response = await firstValueFrom(
      this.http.get<any>(`/api/audits/${auditId}/phases/${phaseId}/steps/${stepId}`)
    );
    
    return this.adaptResponseToFormData(response, phaseId, stepId);
  }
  
  private adaptResponseToFormData(apiResponse: any, phaseId: number, stepId: number): any {
    // Pattern 2: Multi-source response transformation
    if (phaseId === 1 && stepId === 2) {
      return {
        clientName: apiResponse.client?.name || '',
        selectedEntityId: apiResponse.client?.selectedEntityId || null,
        contacts: apiResponse.contacts || []
      };
    }
    
    // Pattern 3: Complex risk data flattening
    if (phaseId === 1 && stepId === 3) {
      return {
        currentRiskLevel: '',
        riskScore: 0,
        justification: '',
        previousRiskLevel: apiResponse.previous_risk_level || 'N/A',
        historicalTrend: apiResponse.historical_trend || 'N/A',
        industryAverage: apiResponse.industry_average || 0
      };
    }
    
    // Default: return as-is (works for patterns 1, 4, 5, 6)
    return apiResponse;
  }
  
  async saveStepData(auditId: number, phaseId: number, stepId: number, formData: any): Promise<any> {
    return firstValueFrom(
      this.http.post(`/api/audits/${auditId}/phases/${phaseId}/steps/${stepId}`, formData)
    );
  }
}
```

### 8. API Endpoints

```
# Audit CRUD
GET    /api/audits                    # List all audits
GET    /api/audits/:id                # Get audit details
POST   /api/audits                    # Create new audit
PUT    /api/audits/:id                # Update audit
DELETE /api/audits/:id                # Delete audit

# Metadata (Form Schemas)
GET    /api/metadata/phases/:phaseId/steps/:stepId
       Returns: StepConfig (formSchema + dataConfig)

# Step Data (Dynamic - ONE endpoint handles ALL steps!)
GET    /api/audits/:auditId/phases/:phaseId/steps/:stepId
       Returns: Step-specific data (shape varies)

POST   /api/audits/:auditId/phases/:phaseId/steps/:stepId
       Body: Form data (shape matches formSchema)
       Returns: Saved data + success message

# Phase Management
GET    /api/audits/:auditId/phases
       Returns: Array of phase statuses
PUT    /api/audits/:auditId/phases/:phaseId/complete
       Mark phase as complete
```

### 9. Environment Setup

```env
# .env
DATABASE_URL="postgresql://user:password@neon-host/database?sslmode=require"
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:4200
```

### 10. Success Criteria

The POC must demonstrate:

1. ✅ **Single endpoint handles all steps** - Same route works for all 6 patterns
2. ✅ **Zero hardcoded step logic** - Adding Step 7 requires only a config file
3. ✅ **All 6 patterns work** - Simple, compose, custom, array, conditional, complex
4. ✅ **All validation layers execute** - Field, conditional, cross-step
5. ✅ **Generic UI renders all forms** - ONE DynamicFormComponent handles everything
6. ✅ **No unique DTOs needed** - FormGroup.value matches formSchema
7. ✅ **Prisma handles most cases** - Generic and domain repos work
8. ✅ **Custom repos work** - Complex queries use $queryRaw
9. ✅ **Transactions work** - Multi-table saves are atomic
10. ✅ **Signals provide reactivity** - Angular signals for state management
11. ✅ **Array fields work** - Add/remove dynamic items
12. ✅ **Metadata sync works** - TypeScript configs sync to PostgreSQL

### 11. Implementation Order

**Day 1: Backend Foundation**
1. Prisma schema with all models
2. TypeScript config type definitions
3. Step registry and metadata service
4. Generic repository base

**Day 2: Simple Patterns**
5. Implement Step 1 config (Pattern 1)
6. Implement Step 4 config (Pattern 4)
7. GenericStepRepository with array handling
8. Test with Postman

**Day 3: Medium Complexity**
9. Implement Step 2 config (Pattern 2)
10. Implement Step 5 config (Pattern 5)
11. Domain repositories (Client, Entity, Document)
12. Test compose and conditional save

**Day 4: Complex Patterns**
13. Implement Step 3 config (Pattern 3)
14. Implement Step 6 config (Pattern 6)
15. Custom repositories with $queryRaw
16. Cross-step validation

**Day 5-6: Frontend**
17. Angular project setup
18. Dynamic form builder component
19. Field components (text, select, array)
20. Step container component
21. Data adapter service

**Day 7: Integration & Testing**
22. End-to-end workflow testing
23. All validation scenarios
24. Performance testing
25. Documentation

### 12. Deliverables

1. ✅ Working backend API (Node.js 22 + TypeScript + Prisma)
2. ✅ Working frontend (Angular 21 standalone + signals)
3. ✅ All 6 step configurations demonstrating patterns
4. ✅ Database migrations and seed data
5. ✅ README with setup instructions
6. ✅ Test results document with feasibility assessment

### 13. Code Quality Requirements

- ✅ TypeScript strict mode enabled
- ✅ ESLint and Prettier configured
- ✅ Async/await throughout
- ✅ Proper error handling
- ✅ Request validation middleware
- ✅ API documentation comments
- ✅ Environment variables for config
- ✅ CORS properly configured
- ✅ Logging for debugging

Generate the complete implementation following this specification. Include detailed comments explaining the metadata-driven architecture patterns and how each component contributes to eliminating hardcoded step logic.
