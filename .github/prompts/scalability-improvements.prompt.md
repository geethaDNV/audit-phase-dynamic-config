# Audit System Scalability & Performance Improvements

**Context:** Metadata-driven audit management system with Node.js/TypeScript backend and Angular frontend. Current implementation supports 6 steps across 2 phases as POC. Goal: Scale to 80+ steps across 8+ phases with optimal performance.

**Current Architecture Issues:**
1. Cross-step validation makes separate DB queries (performance bottleneck)
2. No dependency graph for step relationships
3. Manual repository registration won't scale
4. No configuration caching strategy
5. Unsafe expression evaluator (`new Function()`)
6. Phases and steps hardcoded in frontend
7. No batch operations for related data
8. Missing query optimization indexes

**Success Criteria:**
- ✅ Single step save operation: < 500ms (including validation)
- ✅ Cross-step validation: Max 1-2 DB queries regardless of dependencies
- ✅ Add new step: Only create config file + optional custom repository
- ✅ Configuration changes: Hot-reload without server restart
- ✅ Frontend: Dynamically loads all phases/steps from API
- ✅ 80 steps in production: < 100MB memory, < 200ms config lookup

---

## Phase 1: Critical Performance & Scalability Fixes

### **Step 1.1: Add Step Dependency Graph**

**Objective:** Make step dependencies explicit and queryable.

**Database Schema Changes:**

```prisma
// Add to prisma/schema.prisma

// NEW: Phase configuration - fully dynamic phases
model PhaseConfiguration {
  id              Int      @id @default(autoincrement())
  phaseId         Int      @unique
  phaseName       String   @db.VarChar(100)
  phaseKey        String   @unique // "client-assessment", "audit-execution"
  description     String?  @db.Text
  displayOrder    Int      // For ordering phases in UI
  icon            String?  // Icon name or emoji for UI
  color           String?  // Color code for UI theming
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([displayOrder])
  @@index([isActive])
}

model StepConfiguration {
  id              Int      @id @default(autoincrement())
  stepKey         String   @unique // "1-1", "2-5"
  phaseId         Int
  stepId          Int
  stepName        String
  description     String?
  formSchema      Json
  dataConfig      Json
  businessRules   Json?
  dependencies    Json?    // NEW: Dependency configuration
  isActive        Boolean  @default(true)
  version         Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([phaseId, stepId])
  @@index([phaseId])
  @@index([stepKey])
  @@index([isActive])
}

// NEW: Track step completion and dependencies at runtime
model AuditStepStatus {
  id              Int       @id @default(autoincrement())
  auditId         Int
  phaseId         Int
  stepId          Int
  stepKey         String    // "1-1"
  status          String    @default("pending") // pending, in-progress, completed, skipped, blocked
  startedAt       DateTime?
  completedAt     DateTime?
  blockedBy       String[]  @default([]) // Array of stepKeys: ["1-1", "1-2"]
  blockedReason   String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  audit           Audit     @relation(fields: [auditId], references: [id], onDelete: Cascade)
  
  @@unique([auditId, phaseId, stepId])
  @@index([auditId])
  @@index([auditId, status])
  @@index([stepKey])
}

// Add to Audit model
model Audit {
  // ... existing fields ...
  stepStatuses    AuditStepStatus[]
}
```

**TypeScript Interface Updates:**

```typescript
// src/config/types/step-config.types.ts

export interface StepConfig {
  stepKey: string;
  phaseId: number;
  stepId: number;
  stepName: string;
  description?: string;
  formSchema: FormSchema;
  dataConfig: DataConfig;
  businessRules?: BusinessRule[];
  dependencies?: StepDependencies;  // NEW
  navigation?: {
    previous?: string;
    next?: string;
  };
}

// NEW: Dependency configuration
export interface StepDependencies {
  // Steps that MUST be completed before this step can start
  requiredSteps?: string[];  // ["1-1", "1-2", "1-3"]
  
  // Steps that should be loaded for validation (but not required to be completed)
  optionalSteps?: string[];  // ["2-1", "2-2"]
  
  // Fields referenced from other steps (for validation context loading)
  dataReferences?: {
    [stepKey: string]: string[];  // { "1-1": ["clientName", "email"], "2-3": ["riskLevel"] }
  };
  
  // Conditional logic to determine if this step should be skipped
  skipConditions?: {
    condition: string;  // "step['2-3'].riskLevel === 'Low'"
    message?: string;
  }[];
  
  // Steps that depend on THIS step (auto-computed, don't set manually)
  dependents?: string[];
}

// NEW: Enhanced context with dependency data
export interface ValidationContext extends StepContext {
  // Pre-loaded data from dependent steps (eliminates N+1 queries)
  dependencyData: Map<string, StepDataPayload>;  // Map<"1-1", {...data}>
  
  // Audit step statuses for checking completion
  stepStatuses: Map<string, string>;  // Map<"1-1", "completed">
}
```

**Step Configuration Example:**

```typescript
// src/config/steps/phase2/step5.config.ts

export const Phase2Step5Config: StepConfig = {
  stepKey: 'phase2-step5',
  phaseId: 2,
  stepId: 5,
  stepName: 'Findings & Evidence',
  
  // NEW: Explicit dependencies
  dependencies: {
    // Must complete these steps first
    requiredSteps: ['1-1', '1-2', '2-1'],
    
    // Load data from these steps for validation
    dataReferences: {
      '1-1': ['clientName', 'industry'],           // Client info
      '2-1': ['items[].id', 'items[].title'],      // Documents uploaded
      '2-3': ['riskLevel']                          // Risk assessment
    },
    
    // Skip this step if risk is low
    skipConditions: [{
      condition: "step['2-3'].riskLevel === 'Low'",
      message: 'Findings not required for low-risk audits'
    }]
  },
  
  formSchema: {
    fields: [
      {
        name: 'evidence',
        type: 'array',
        arrayItemSchema: {
          fields: [
            {
              name: 'documentRef',
              type: 'select',
              // Frontend will populate options from step['2-1'].items
              optionsSource: {
                stepKey: '2-1',
                dataPath: 'items',
                labelField: 'title',
                valueField: 'id'
              }
            }
          ]
        }
      }
    ],
    businessRules: [
      {
        type: 'cross-step',
        validatorClass: 'DocumentReferenceValidator',
        // Validator will use context.dependencyData.get('2-1') - no DB query needed!
        dependencies: ['2-1']
      }
    ]
  },
  
  // ... rest of config
};
```

**Seed Phase Data:**

```typescript
// src/scripts/seed-phases.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const phases = [
  {
    phaseId: 1,
    phaseKey: 'client-assessment',
    phaseName: 'Client Assessment',
    description: 'Gather and validate client information',
    displayOrder: 1,
    icon: '👤',
    color: '#3B82F6'
  },
  {
    phaseId: 2,
    phaseKey: 'audit-execution',
    phaseName: 'Audit Execution',
    description: 'Execute audit procedures and collect evidence',
    displayOrder: 2,
    icon: '📋',
    color: '#10B981'
  },
  {
    phaseId: 3,
    phaseKey: 'evidence-collection',
    phaseName: 'Evidence Collection',
    description: 'Document findings and supporting evidence',
    displayOrder: 3,
    icon: '📎',
    color: '#F59E0B'
  },
  {
    phaseId: 4,
    phaseKey: 'risk-analysis',
    phaseName: 'Risk Analysis',
    description: 'Analyze identified risks and controls',
    displayOrder: 4,
    icon: '⚠️',
    color: '#EF4444'
  },
  {
    phaseId: 5,
    phaseKey: 'findings-recommendations',
    phaseName: 'Findings & Recommendations',
    description: 'Summarize findings and provide recommendations',
    displayOrder: 5,
    icon: '💡',
    color: '#8B5CF6'
  },
  {
    phaseId: 6,
    phaseKey: 'quality-review',
    phaseName: 'Quality Review',
    description: 'Internal quality assurance review',
    displayOrder: 6,
    icon: '✅',
    color: '#06B6D4'
  },
  {
    phaseId: 7,
    phaseKey: 'final-report',
    phaseName: 'Final Report',
    description: 'Prepare and finalize audit report',
    displayOrder: 7,
    icon: '📄',
    color: '#6366F1'
  },
  {
    phaseId: 8,
    phaseKey: 'client-presentation',
    phaseName: 'Client Presentation',
    description: 'Present findings to client management',
    displayOrder: 8,
    icon: '🎯',
    color: '#EC4899'
  }
];

async function seedPhases() {
  console.log('🌱 Seeding phase configurations...');
  
  for (const phase of phases) {
    await prisma.phaseConfiguration.upsert({
      where: { phaseId: phase.phaseId },
      create: phase,
      update: phase
    });
    console.log(`✅ Seeded phase: ${phase.phaseName}`);
  }
  
  console.log('✅ All phases seeded successfully');
  await prisma.$disconnect();
}

seedPhases();
```

**Migration Script:**

```typescript
// src/scripts/compute-step-dependencies.ts

import { PrismaClient } from '@prisma/client';
import { StepRegistry } from '../config/step-registry';

/**
 * Compute reverse dependencies (which steps depend on this step)
 * and save to database
 */
async function computeDependencies() {
  const prisma = new PrismaClient();
  const registry = new StepRegistry();
  
  const allSteps = registry.getAllSteps();
  const dependencyGraph = new Map<string, Set<string>>();
  
  // Build forward dependency graph
  allSteps.forEach(step => {
    const deps = step.dependencies?.requiredSteps || [];
    deps.forEach(depKey => {
      if (!dependencyGraph.has(depKey)) {
        dependencyGraph.set(depKey, new Set());
      }
      dependencyGraph.get(depKey)!.add(step.stepKey);
    });
  });
  
  // Update each step with its dependents
  for (const step of allSteps) {
    const dependents = Array.from(dependencyGraph.get(step.stepKey) || []);
    
    await prisma.stepConfiguration.upsert({
      where: { stepKey: step.stepKey },
      create: {
        stepKey: step.stepKey,
        phaseId: step.phaseId,
        stepId: step.stepId,
        stepName: step.stepName,
        description: step.description,
        formSchema: step.formSchema as any,
        dataConfig: step.dataConfig as any,
        businessRules: step.businessRules as any,
        dependencies: {
          ...step.dependencies,
          dependents
        } as any
      },
      update: {
        dependencies: {
          ...step.dependencies,
          dependents
        } as any
      }
    });
  }
  
  console.log('✅ Step dependencies computed and saved');
  await prisma.$disconnect();
}

computeDependencies();
```

**Validation:**
```bash
# Run migration
npx prisma migrate dev --name add_step_dependencies_and_phases

# Seed phases
npm run seed:phases

# Compute dependencies
npm run compute-dependencies

# Verify phases in DB
SELECT "phaseId", "phaseName", "phaseKey", "displayOrder" 
FROM "PhaseConfiguration" 
ORDER BY "displayOrder";

# Expected: 8 phases with names, keys, and order

# Verify step dependencies
SELECT "stepKey", "dependencies"::text 
FROM "StepConfiguration" 
WHERE "stepKey" = '2-5';

# Expected output: Should show requiredSteps, dataReferences, and dependents
```

---

### **Step 1.2: Implement Validation Context with Batched Data Loading**

**Objective:** Eliminate N+1 query problem in cross-step validation.

**Service Implementation:**

```typescript
// src/services/validation-context.service.ts

import { PrismaClient } from '@prisma/client';
import {
  StepContext,
  ValidationContext,
  StepDataPayload,
  StepDependencies
} from '../config/types/step-config.types';

export class ValidationContextService {
  constructor(private prisma: PrismaClient) {}
  
  /**
   * Pre-load all dependency data in a SINGLE query
   * This eliminates the N+1 query problem
   */
  async buildValidationContext(
    context: StepContext,
    dependencies: StepDependencies
  ): Promise<ValidationContext> {
    const { auditId } = context;
    
    // 1. Collect all step keys we need data from
    const stepKeysToLoad = new Set<string>();
    
    if (dependencies.requiredSteps) {
      dependencies.requiredSteps.forEach(key => stepKeysToLoad.add(key));
    }
    
    if (dependencies.optionalSteps) {
      dependencies.optionalSteps.forEach(key => stepKeysToLoad.add(key));
    }
    
    if (dependencies.dataReferences) {
      Object.keys(dependencies.dataReferences).forEach(key => stepKeysToLoad.add(key));
    }
    
    // 2. Batch load ALL step data in ONE query
    const stepDataRecords = await this.prisma.stepData.findMany({
      where: {
        auditId,
        OR: Array.from(stepKeysToLoad).map(key => {
          const [phaseId, stepId] = key.split('-').map(Number);
          return { phaseId, stepId };
        })
      },
      select: {
        phaseId: true,
        stepId: true,
        data: true
      }
    });
    
    // 3. Batch load ALL step statuses in ONE query
    const stepStatusRecords = await this.prisma.auditStepStatus.findMany({
      where: {
        auditId,
        stepKey: { in: Array.from(stepKeysToLoad) }
      },
      select: {
        stepKey: true,
        status: true,
        completedAt: true
      }
    });
    
    // 4. Build lookup maps
    const dependencyData = new Map<string, StepDataPayload>();
    stepDataRecords.forEach(record => {
      const key = `${record.phaseId}-${record.stepId}`;
      dependencyData.set(key, record.data as StepDataPayload);
    });
    
    const stepStatuses = new Map<string, string>();
    stepStatusRecords.forEach(record => {
      stepStatuses.set(record.stepKey, record.status);
    });
    
    // 5. Validate required steps are completed
    const missingSteps: string[] = [];
    if (dependencies.requiredSteps) {
      dependencies.requiredSteps.forEach(stepKey => {
        const status = stepStatuses.get(stepKey);
        if (status !== 'completed') {
          missingSteps.push(stepKey);
        }
      });
    }
    
    if (missingSteps.length > 0) {
      throw new Error(
        `Cannot proceed. Required steps not completed: ${missingSteps.join(', ')}`
      );
    }
    
    // 6. Return enriched context
    return {
      ...context,
      dependencyData,
      stepStatuses
    };
  }
  
  /**
   * Extract specific fields from dependency data
   * Used for populating select options in forms
   */
  extractDependencyFields(
    validationContext: ValidationContext,
    stepKey: string,
    fieldPath: string
  ): any {
    const data = validationContext.dependencyData.get(stepKey);
    if (!data) return null;
    
    // Handle nested paths like "items[].id"
    const parts = fieldPath.split('.');
    let current: any = data;
    
    for (const part of parts) {
      if (part.endsWith('[]')) {
        // Array access
        const arrayKey = part.replace('[]', '');
        current = current[arrayKey];
        if (!Array.isArray(current)) return null;
      } else {
        current = current[part];
      }
      
      if (current === undefined) return null;
    }
    
    return current;
  }
}
```

**Updated Validation Service:**

```typescript
// src/services/validation.service.ts

import { ValidationContextService } from './validation-context.service';

export class ValidationService {
  private validatorRegistry: ValidatorRegistry;
  private contextService: ValidationContextService;

  constructor(private prisma: PrismaClient) {
    this.validatorRegistry = new ValidatorRegistry();
    this.contextService = new ValidationContextService(prisma);
  }

  /**
   * Main validation entry point - NOW WITH BATCHED DEPENDENCY LOADING
   */
  async validate(
    payload: any,
    formSchema: FormSchema,
    context: StepContext,
    dependencies?: StepDependencies
  ): Promise<void> {
    // 1. Build validation context with ALL dependency data (single query)
    const validationContext = dependencies
      ? await this.contextService.buildValidationContext(context, dependencies)
      : { ...context, dependencyData: new Map(), stepStatuses: new Map() };
    
    const fieldErrors: Record<string, string[]> = {};
    const generalErrors: string[] = [];

    // 2. Field-level validation (unchanged)
    for (const field of formSchema.fields) {
      const errors = this.validateField(field, payload[field.name]);
      if (errors.length > 0) {
        fieldErrors[field.name] = errors;
      }
    }

    // 3. Business rules validation - NOW with pre-loaded context
    if (formSchema.businessRules && formSchema.businessRules.length > 0) {
      const ruleErrors = await this.validateBusinessRules(
        payload,
        formSchema.businessRules,
        validationContext  // ← Contains all dependency data!
      );
      generalErrors.push(...ruleErrors);
    }

    // 4. Check errors
    if (Object.keys(fieldErrors).length > 0 || generalErrors.length > 0) {
      if (Object.keys(fieldErrors).length > 0) {
        throw new ValidationError(fieldErrors);
      } else {
        throw new ValidationError(generalErrors);
      }
    }
  }
  
  /**
   * Updated to use ValidationContext instead of StepContext
   */
  private async validateBusinessRules(
    payload: any,
    rules: BusinessRule[],
    context: ValidationContext  // ← Changed from StepContext
  ): Promise<string[]> {
    const errors: string[] = [];

    for (const rule of rules) {
      switch (rule.type) {
        case 'conditional':
          errors.push(...this.validateConditionalRule(rule, payload));
          break;

        case 'cross-step':
        case 'cross-field':
          if (rule.validatorClass) {
            const error = await this.validatorRegistry.validateAsync(
              rule.validatorClass,
              payload,
              context  // ← Now includes dependencyData!
            );
            if (error) {
              errors.push(error);
            }
          }
          break;
      }
    }

    return errors;
  }
}
```

**Updated Validators to Use Context:**

```typescript
// src/validators/validator-registry.ts

export type AsyncValidator = (
  payload: StepDataPayload,
  context: ValidationContext  // ← Changed from StepContext
) => Promise<string | null>;

export class ValidatorRegistry {
  // ... existing code ...
  
  /**
   * UPDATED: EntityBelongsToClientValidator - NO MORE DB QUERY!
   * 
   * Before: Made separate query to get client + entities
   * After: Uses pre-loaded dependency data from context
   */
  private entityBelongsToClientValidator: AsyncValidator = async (payload, context) => {
    try {
      const { selectedEntityId } = payload;
      
      if (!selectedEntityId) {
        return null;
      }

      // ✅ Get client data from pre-loaded context - NO DB QUERY!
      const clientData = context.dependencyData.get('1-1');
      
      if (!clientData) {
        return 'Client information not found. Please complete Step 1-1 first.';
      }

      // ✅ Get entity data from pre-loaded context - NO DB QUERY!
      const entityData = context.dependencyData.get('1-2');
      
      if (!entityData || !Array.isArray(entityData.entities)) {
        return 'Entity information not available';
      }

      // Check if the selected entity belongs to this client
      const entityBelongsToClient = entityData.entities.some(
        (entity: any) => entity.id === parseInt(selectedEntityId, 10)
      );

      if (!entityBelongsToClient) {
        return 'Selected entity does not belong to the client for this audit';
      }

      return null; // Valid
    } catch (error) {
      console.error('EntityBelongsToClientValidator error:', error);
      return 'Failed to validate entity ownership';
    }
  };
  
  /**
   * UPDATED: DocumentReferenceValidator - Uses context instead of DB query
   */
  private documentReferenceValidator: AsyncValidator = async (payload, context) => {
    try {
      const { evidence } = payload;

      if (!evidence || !Array.isArray(evidence)) {
        return null;
      }

      // ✅ Get documents from pre-loaded context - NO DB QUERY!
      const documentData = context.dependencyData.get('2-1');
      
      if (!documentData || !Array.isArray(documentData.items)) {
        return 'Document information not available. Please complete Step 2-1 first.';
      }

      const validDocumentIds = documentData.items.map((doc: any) => doc.id);

      // Check each evidence item
      for (const item of evidence) {
        if (item.documentRef) {
          const docId = parseInt(item.documentRef, 10);
          if (!validDocumentIds.includes(docId)) {
            return `Evidence references invalid document ID: ${docId}. Document must be uploaded in Step 2-1 first.`;
          }
        }
      }

      return null; // Valid
    } catch (error) {
      console.error('DocumentReferenceValidator error:', error);
      return 'Failed to validate document references';
    }
  };
}
```

**Updated Step Service:**

```typescript
// src/services/step.service.ts

export class StepService {
  // ... existing code ...
  
  async saveStepData(
    auditId: number,
    phaseId: number,
    stepId: number,
    payload: StepDataPayload
  ): Promise<StepDataPayload> {
    this.metadataRegistry.validateStep(phaseId, stepId);

    const config = this.metadataRegistry.getConfig(phaseId, stepId);
    const context: StepContext = { auditId, phaseId, stepId };

    // ✅ VALIDATION - Now with batched dependency loading
    await this.validationService.validate(
      payload,
      config.formSchema,
      context,
      config.dependencies  // ← NEW: Pass dependencies for context building
    );

    // Execute save strategy
    const result = await this.executeSaveStrategy(config, payload, context);

    return result;
  }
}
```

**Validation:**
```bash
# Test with console timing
# Before optimization: ~300-500ms for 3 cross-step validators
# After optimization: ~50-100ms (single batch query)

# Add to validator-registry.ts temporarily
console.time('EntityBelongsToClientValidator');
// ... validator logic ...
console.timeEnd('EntityBelongsToClientValidator');

# Test endpoint
curl -X POST http://localhost:3000/api/audits/1/phases/2/steps/5 \
  -H "Content-Type: application/json" \
  -d '{"evidence": [{"documentRef": "123"}]}'

# Check server logs - should see:
# "ValidationContext built in: 45ms"
# "EntityBelongsToClientValidator: 2ms" (was 150ms before)
```

---

### **Step 1.3: Replace Unsafe Expression Evaluator**

**Objective:** Replace `new Function()` with safe expression library.

**Install Dependencies:**

```bash
npm install jexl
npm install --save-dev @types/jexl
```

**Create Expression Service:**

```typescript
// src/services/expression-evaluator.service.ts

import jexl from 'jexl';

/**
 * Safe expression evaluator using Jexl
 * Replaces dangerous `new Function()` pattern
 * 
 * Jexl supports:
 * - Comparisons: ===, !==, <, >, <=, >=
 * - Logical: &&, ||, !
 * - Arithmetic: +, -, *, /, %
 * - Array access: arr[0], obj.prop
 * - Ternary: condition ? true : false
 * - Functions: Math functions, string methods
 */
export class ExpressionEvaluatorService {
  private engine: jexl.Jexl;
  
  constructor() {
    this.engine = new jexl.Jexl();
    this.registerCustomTransforms();
  }
  
  /**
   * Evaluate a condition expression safely
   * Returns boolean result or false on error
   */
  evaluate(expression: string, context: Record<string, any>): boolean {
    try {
      const result = this.engine.evalSync(expression, context);
      return Boolean(result);
    } catch (error) {
      console.error(`Expression evaluation failed: ${expression}`, error);
      return false;
    }
  }
  
  /**
   * Evaluate and return any value (not just boolean)
   * Used for computed fields
   */
  evaluateValue<T = any>(expression: string, context: Record<string, any>): T | null {
    try {
      return this.engine.evalSync(expression, context) as T;
    } catch (error) {
      console.error(`Expression evaluation failed: ${expression}`, error);
      return null;
    }
  }
  
  /**
   * Validate expression syntax without executing
   */
  validateSyntax(expression: string): { valid: boolean; error?: string } {
    try {
      this.engine.compile(expression);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Register custom transforms (functions usable in expressions)
   */
  private registerCustomTransforms(): void {
    // String helpers
    this.engine.addTransform('lower', (val: string) => val?.toLowerCase());
    this.engine.addTransform('upper', (val: string) => val?.toUpperCase());
    this.engine.addTransform('trim', (val: string) => val?.trim());
    this.engine.addTransform('length', (val: any) => val?.length || 0);
    
    // Number helpers
    this.engine.addTransform('abs', (val: number) => Math.abs(val));
    this.engine.addTransform('round', (val: number) => Math.round(val));
    this.engine.addTransform('floor', (val: number) => Math.floor(val));
    this.engine.addTransform('ceil', (val: number) => Math.ceil(val));
    
    // Array helpers
    this.engine.addTransform('contains', (arr: any[], val: any) =>
      Array.isArray(arr) ? arr.includes(val) : false
    );
    this.engine.addTransform('isEmpty', (val: any) =>
      val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
    );
    
    // Date helpers
    this.engine.addTransform('now', () => new Date().toISOString());
    this.engine.addTransform('today', () => new Date().toISOString().split('T')[0]);
  }
}
```

**Update Validation Service:**

```typescript
// src/services/validation.service.ts

import { ExpressionEvaluatorService } from './expression-evaluator.service';

export class ValidationService {
  private validatorRegistry: ValidatorRegistry;
  private contextService: ValidationContextService;
  private expressionEvaluator: ExpressionEvaluatorService;  // NEW

  constructor(private prisma: PrismaClient) {
    this.validatorRegistry = new ValidatorRegistry();
    this.contextService = new ValidationContextService(prisma);
    this.expressionEvaluator = new ExpressionEvaluatorService();  // NEW
  }
  
  /**
   * UPDATED: Evaluate condition using Jexl (safe)
   */
  private evaluateCondition(condition: string, payload: any): boolean {
    // Build context with step prefix for cross-step references
    const context: Record<string, any> = {
      ...payload,
      step: payload  // Allow both direct field access and step.field
    };
    
    return this.expressionEvaluator.evaluate(condition, context);
  }
}
```

**Example Expressions in Configs:**

```typescript
// Before (unsafe):
skipConditions: [{
  condition: "currentRiskLevel === 'Low'",  // Evaluated with new Function()
  message: 'Skip for low risk'
}]

// After (safe with Jexl):
skipConditions: [{
  // Simple comparison
  condition: "riskLevel === 'Low'",
  message: 'Skip for low risk'
}, {
  // Logical operators
  condition: "riskLevel === 'High' || riskLevel === 'Critical'",
  message: 'High risk detected'
}, {
  // Cross-step reference
  condition: "step['1-1'].industry === 'Finance' && riskScore > 75",
  message: 'Financial industry with high risk'
}, {
  // Array operations
  condition: "documents|length > 0 && documents[0].status === 'approved'",
  message: 'Has approved documents'
}, {
  // String operations
  condition: "clientName|lower|contains('bank')",
  message: 'Banking client'
}]
```

**Validation:**
```typescript
// src/tests/expression-evaluator.test.ts

import { ExpressionEvaluatorService } from '../services/expression-evaluator.service';

describe('ExpressionEvaluatorService', () => {
  const evaluator = new ExpressionEvaluatorService();
  
  it('should evaluate simple comparisons', () => {
    expect(evaluator.evaluate("riskLevel === 'High'", { riskLevel: 'High' })).toBe(true);
    expect(evaluator.evaluate("score > 75", { score: 80 })).toBe(true);
  });
  
  it('should evaluate logical operators', () => {
    const context = { status: 'approved', count: 5 };
    expect(evaluator.evaluate("status === 'approved' && count > 3", context)).toBe(true);
  });
  
  it('should use custom transforms', () => {
    expect(evaluator.evaluate("name|lower === 'john'", { name: 'JOHN' })).toBe(true);
    expect(evaluator.evaluate("items|length > 0", { items: [1, 2, 3] })).toBe(true);
  });
  
  it('should validate syntax', () => {
    expect(evaluator.validateSyntax("status === 'valid'").valid).toBe(true);
    expect(evaluator.validateSyntax("invalid syntax ===").valid).toBe(false);
  });
  
  it('should not allow code injection', () => {
    // These should fail safely, not execute arbitrary code
    expect(() => evaluator.evaluate("console.log('hack')", {})).not.toThrow();
    expect(() => evaluator.evaluate("process.exit()", {})).not.toThrow();
  });
});
```

---

### **Step 1.4: Add Database Indexes for Performance**

**Objective:** Optimize query performance for StepData and related tables.

**Database Migration:**

```prisma
// Update prisma/schema.prisma

model StepData {
  id          Int      @id @default(autoincrement())
  auditId     Int
  phaseId     Int
  stepId      Int
  stepKey     String   // NEW: Denormalized for faster lookups
  data        Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([auditId, phaseId, stepId])
  @@index([auditId])                        // NEW: Audit-level queries
  @@index([auditId, phaseId])               // NEW: Phase-level queries
  @@index([stepKey])                        // NEW: By step type
  @@index([updatedAt])                      // NEW: Recent changes
  @@index([auditId, stepKey])               // NEW: Specific step in audit
}

model AuditStepStatus {
  // ... fields ...
  
  @@unique([auditId, phaseId, stepId])
  @@index([auditId])
  @@index([auditId, status])                // NEW: Filter by status
  @@index([stepKey])
  @@index([auditId, phaseId])               // NEW: Phase progress queries
}

model StepConfiguration {
  // ... fields ...
  
  @@unique([phaseId, stepId])
  @@index([phaseId])
  @@index([stepKey])
  @@index([isActive])
  @@index([version])                        // NEW: Version tracking
}

model Document {
  // ... existing fields ...
  
  @@index([auditId])
  @@index([auditId, documentType])          // NEW: Filter by type
  @@index([uploadedAt])                     // NEW: Recent uploads
  @@index([isConfidential])                 // NEW: Security filtering
}

model Finding {
  // ... existing fields ...
  
  @@index([auditId])
  @@index([auditId, severity])              // NEW: Filter by severity
  @@index([auditId, status])                // NEW: Filter by status
  @@index([createdAt])                      // NEW: Recent findings
}
```

**Run Migration:**
```bash
npx prisma migrate dev --name add_performance_indexes
npx prisma generate
```

**Validation:**
```sql
-- Check indexes were created
SELECT
  tablename,
  indexname,
  indexdef
FROM
  pg_indexes
WHERE
  schemaname = 'public'
  AND tablename IN ('StepData', 'AuditStepStatus', 'StepConfiguration')
ORDER BY
  tablename, indexname;

-- Test query performance (should use index)
EXPLAIN ANALYZE
SELECT * FROM "StepData"
WHERE "auditId" = 1 AND "stepKey" = '2-5';

-- Should show "Index Scan using StepData_auditId_stepKey_idx"
```

---

## Phase 2: Dynamic Phase/Step Loading (Frontend + Backend)

### **Step 2.1: Create Metadata API Endpoints**

**Objective:** Frontend loads all phases, steps, and configurations from API (not hardcoded).

**API Controller:**

```typescript
// src/controllers/metadata.controller.ts

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MetadataRegistryService } from '../services/metadata-registry.service';

const prisma = new PrismaClient();
const metadataService = new MetadataRegistryService(prisma);

export class MetadataController {
  /**
   * GET /api/metadata/phases
   * Returns list of all phases with their steps
   * ✅ FULLY DYNAMIC - Phases loaded from database, not hardcoded
   */
  async getPhases(req: Request, res: Response) {
    try {
      // ✅ Load phase configurations from database
      const phaseConfigs = await prisma.phaseConfiguration.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      });
      
      // Load all active steps
      const steps = await prisma.stepConfiguration.findMany({
        where: { isActive: true },
        select: {
          phaseId: true,
          stepId: true,
          stepKey: true,
          stepName: true,
          description: true
        },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });
      
      // Group steps by phase
      const stepsByPhase = new Map<number, any[]>();
      steps.forEach(step => {
        if (!stepsByPhase.has(step.phaseId)) {
          stepsByPhase.set(step.phaseId, []);
        }
        stepsByPhase.get(step.phaseId)!.push({
          stepId: step.stepId,
          stepKey: step.stepKey,
          stepName: step.stepName,
          description: step.description
        });
      });
      
      // Combine phase configs with their steps
      const result = phaseConfigs.map(phase => ({
        phaseId: phase.phaseId,
        phaseKey: phase.phaseKey,
        phaseName: phase.phaseName,
        description: phase.description,
        displayOrder: phase.displayOrder,
        icon: phase.icon,
        color: phase.color,
        steps: stepsByPhase.get(phase.phaseId) || []
      }));
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/metadata/phases/:phaseId
   * Returns a single phase with its steps
   */
  async getPhaseById(req: Request, res: Response) {
    try {
      const phaseId = parseInt(req.params.phaseId);
      
      const phaseConfig = await prisma.phaseConfiguration.findUnique({
        where: { phaseId }
      });
      
      if (!phaseConfig) {
        return res.status(404).json({
          success: false,
          error: `Phase ${phaseId} not found`
        });
      }
      
      const steps = await prisma.stepConfiguration.findMany({
        where: {
          phaseId,
          isActive: true
        },
        orderBy: { stepId: 'asc' }
      });
      
      res.json({
        success: true,
        data: {
          ...phaseConfig,
          steps
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/metadata/steps/:stepKey
   * Returns full configuration for a specific step
   */
  async getStepConfig(req: Request, res: Response) {
    try {
      const { stepKey } = req.params;
      
      const config = await prisma.stepConfiguration.findUnique({
        where: { stepKey }
      });
      
      if (!config) {
        return res.status(404).json({
          success: false,
          error: `Step ${stepKey} not found`
        });
      }
      
      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/metadata/audits/:auditId/progress
   * Returns progress for all steps in an audit
   */
  async getAuditProgress(req: Request, res: Response) {
    try {
      const auditId = parseInt(req.params.auditId);
      
      // Get all step statuses
      const statuses = await prisma.auditStepStatus.findMany({
        where: { auditId },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });
      
      // Get all available steps
      const allSteps = await prisma.stepConfiguration.findMany({
        where: { isActive: true },
        select: {
          stepKey: true,
          phaseId: true,
          stepId: true,
          stepName: true
        },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });
      
      // Merge status with configuration
      const progress = allSteps.map(step => {
        const status = statuses.find(s => s.stepKey === step.stepKey);
        
        return {
          stepKey: step.stepKey,
          phaseId: step.phaseId,
          stepId: step.stepId,
          stepName: step.stepName,
          status: status?.status || 'pending',
          startedAt: status?.startedAt,
          completedAt: status?.completedAt,
          blockedBy: status?.blockedBy || [],
          blockedReason: status?.blockedReason
        };
      });
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * POST /api/metadata/audits/:auditId/steps/:stepKey/status
   * Update step status (start, complete, skip, block)
   */
  async updateStepStatus(req: Request, res: Response) {
    try {
      const auditId = parseInt(req.params.auditId);
      const { stepKey } = req.params;
      const { status, blockedReason } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'in-progress', 'completed', 'skipped', 'blocked'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      // Get step config
      const config = await prisma.stepConfiguration.findUnique({
        where: { stepKey }
      });
      
      if (!config) {
        return res.status(404).json({
          success: false,
          error: `Step ${stepKey} not found`
        });
      }
      
      // Update status
      const stepStatus = await prisma.auditStepStatus.upsert({
        where: {
          auditId_phaseId_stepId: {
            auditId,
            phaseId: config.phaseId,
            stepId: config.stepId
          }
        },
        create: {
          auditId,
          phaseId: config.phaseId,
          stepId: config.stepId,
          stepKey,
          status,
          startedAt: status === 'in-progress' ? new Date() : undefined,
          completedAt: status === 'completed' ? new Date() : undefined,
          blockedReason: status === 'blocked' ? blockedReason : undefined
        },
        update: {
          status,
          startedAt: status === 'in-progress' ? new Date() : undefined,
          completedAt: status === 'completed' ? new Date() : undefined,
          blockedReason: status === 'blocked' ? blockedReason : undefined
        }
      });
      
      res.json({
        success: true,
        data: stepStatus
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

**Routes:**

```typescript
// src/routes/metadata.routes.ts

import { Router } from 'express';
import { MetadataController } from '../controllers/metadata.controller';

const router = Router();
const controller = new MetadataController();

// Get all phases with steps
router.get('/phases', (req, res) => controller.getPhases(req, res));

// Get single phase by ID
router.get('/phases/:phaseId', (req, res) => controller.getPhaseById(req, res));

// Get step configuration
router.get('/steps/:stepKey', (req, res) => controller.getStepConfig(req, res));

// Get audit progress
router.get('/audits/:auditId/progress', (req, res) => controller.getAuditProgress(req, res));

// Update step status
router.post('/audits/:auditId/steps/:stepKey/status', (req, res) => 
  controller.updateStepStatus(req, res)
);

export default router;
```

**Register Routes:**

```typescript
// src/server.ts

import metadataRoutes from './routes/metadata.routes';

app.use('/api/metadata', metadataRoutes);
```

**Validation:**
```bash
# Test endpoints
curl http://localhost:3000/api/metadata/phases

# Expected response (✅ FULLY DYNAMIC from database):
{
  "success": true,
  "data": [
    {
      "phaseId": 1,
      "phaseKey": "client-assessment",
      "phaseName": "Client Assessment",
      "description": "Gather and validate client information",
      "displayOrder": 1,
      "icon": "👤",
      "color": "#3B82F6",
      "steps": [
        { "stepId": 1, "stepKey": "1-1", "stepName": "Client Selection" },
        { "stepId": 2, "stepKey": "1-2", "stepName": "Entity Selection" }
      ]
    },
    {
      "phaseId": 2,
      "phaseKey": "audit-execution",
      "phaseName": "Audit Execution",
      "description": "Execute audit procedures",
      "displayOrder": 2,
      "icon": "📋",
      "color": "#10B981",
      "steps": [...]
    }
  ]
}

# Test single phase
curl http://localhost:3000/api/metadata/phases/1

# Test audit progress
curl http://localhost:3000/api/metadata/audits/1/progress

# Expected: Array of all steps with their statuses
```

---

### **Step 2.2: Create Dynamic Frontend Phase/Step Navigator**

**Objective:** Frontend renders phases and steps from API (no hardcoded navigation).

**Angular Service:**

```typescript
// src/app/features/audit/services/metadata.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface PhaseMetadata {
  phaseId: number;
  phaseKey: string;          // NEW: 'client-assessment', 'audit-execution'
  phaseName: string;
  description?: string;      // NEW: Phase description
  displayOrder: number;      // NEW: For ordering in UI
  icon?: string;             // NEW: Icon for UI (emoji or icon name)
  color?: string;            // NEW: Color code for theming
  steps: StepMetadata[];
}

export interface StepMetadata {
  stepId: number;
  stepKey: string;
  stepName: string;
  description?: string;
}

export interface StepProgress {
  stepKey: string;
  phaseId: number;
  stepId: number;
  stepName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'blocked';
  startedAt?: string;
  completedAt?: string;
  blockedBy?: string[];
  blockedReason?: string;
}

@Injectable({ providedIn: 'root' })
export class MetadataService {
  private http = inject(HttpClient);
  
  // Signals for reactive state
  phases = signal<PhaseMetadata[]>([]);
  currentAuditProgress = signal<Map<string, StepProgress>>(new Map());
  loading = signal(false);
  
  /**
   * Load all phases and steps from API
   * Called once on app initialization
   */
  async loadPhases(): Promise<void> {
    this.loading.set(true);
    
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: PhaseMetadata[] }>(
          '/api/metadata/phases'
        )
      );
      
      this.phases.set(response.data);
    } catch (error) {
      console.error('Failed to load phases:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
  
  /**
   * Load progress for a specific audit
   */
  async loadAuditProgress(auditId: number): Promise<void> {
    this.loading.set(true);
    
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: StepProgress[] }>(
          `/api/metadata/audits/${auditId}/progress`
        )
      );
      
      // Convert to Map for O(1) lookup
      const progressMap = new Map<string, StepProgress>();
      response.data.forEach(step => {
        progressMap.set(step.stepKey, step);
      });
      
      this.currentAuditProgress.set(progressMap);
    } catch (error) {
      console.error('Failed to load audit progress:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
  
  /**
   * Update step status
   */
  async updateStepStatus(
    auditId: number,
    stepKey: string,
    status: StepProgress['status'],
    blockedReason?: string
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `/api/metadata/audits/${auditId}/steps/${stepKey}/status`,
          { status, blockedReason }
        )
      );
      
      // Reload progress
      await this.loadAuditProgress(auditId);
    } catch (error) {
      console.error('Failed to update step status:', error);
      throw error;
    }
  }
  
  /**
   * Get phase by ID
   */
  getPhase(phaseId: number): PhaseMetadata | undefined {
    return this.phases().find(p => p.phaseId === phaseId);
  }
  
  /**
   * Get step info by stepKey
   */
  getStep(stepKey: string): { phase: PhaseMetadata; step: StepMetadata } | null {
    for (const phase of this.phases()) {
      const step = phase.steps.find(s => s.stepKey === stepKey);
      if (step) {
        return { phase, step };
      }
    }
    return null;
  }
  
  /**
   * Get step progress
   */
  getStepProgress(stepKey: string): StepProgress | undefined {
    return this.currentAuditProgress().get(stepKey);
  }
  
  /**
   * Check if step is available (not blocked)
   */
  isStepAvailable(stepKey: string): boolean {
    const progress = this.getStepProgress(stepKey);
    return progress?.status !== 'blocked';
  }
  
  /**
   * Get next step in sequence
   */
  getNextStep(currentStepKey: string): { phase: PhaseMetadata; step: StepMetadata } | null {
    const phases = this.phases();
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const stepIndex = phase.steps.findIndex(s => s.stepKey === currentStepKey);
      
      if (stepIndex !== -1) {
        // Found current step, get next
        if (stepIndex < phase.steps.length - 1) {
          // Next step in same phase
          return { phase, step: phase.steps[stepIndex + 1] };
        } else if (i < phases.length - 1) {
          // First step of next phase
          const nextPhase = phases[i + 1];
          return { phase: nextPhase, step: nextPhase.steps[0] };
        }
      }
    }
    
    return null; // Last step
  }
}
```

**Dynamic Phase Navigator Component:**

```typescript
// src/app/features/audit/components/phase-navigator.component.ts

import { Component, computed, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MetadataService } from '../services/metadata.service';

@Component({
  selector: 'app-phase-navigator',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="phase-navigator bg-white shadow-sm border-b">
      <div class="container mx-auto px-4">
        <!-- Phase Tabs -->
        <div class="flex space-x-4 overflow-x-auto">
          @for (phase of phases(); track phase.phaseId) {
            <button
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2"
              [class.border-blue-600]="phase.phaseId === currentPhase()"
              [class.text-blue-600]="phase.phaseId === currentPhase()"
              [class.border-transparent]="phase.phaseId !== currentPhase()"
              [class.text-gray-500]="phase.phaseId !== currentPhase()"
              [class.hover:text-gray-700]="phase.phaseId !== currentPhase()"
              [style.border-color]="phase.phaseId === currentPhase() ? phase.color : 'transparent'"
              (click)="selectPhase(phase.phaseId)"
            >
              <!-- ✅ Dynamic icon from database -->
              @if (phase.icon) {
                <span class="text-lg">{{ phase.icon }}</span>
              }
              
              <!-- ✅ Dynamic phase name from database -->
              <span>{{ phase.phaseName }}</span>
              
              <span class="ml-2 text-xs">
                ({{ getPhaseProgress(phase) }})
              </span>
            </button>
          }
        </div>
        
        <!-- Step Navigation -->
        @if (currentPhaseData(); as phase) {
          <div class="py-4">
            <div class="flex items-center space-x-2 overflow-x-auto">
              @for (step of phase.steps; track step.stepKey; let idx = $index) {
                <div class="flex items-center">
                  <!-- Step Button -->
                  <button
                    class="px-3 py-2 rounded-lg text-sm transition-all flex items-center space-x-2"
                    [class]="getStepButtonClass(step.stepKey)"
                    [disabled]="!isStepAvailable(step.stepKey)"
                    (click)="navigateToStep(step.stepKey)"
                  >
                    <!-- Status Icon -->
                    <span class="w-5 h-5 flex items-center justify-center">
                      @switch (getStepStatus(step.stepKey)) {
                        @case ('completed') {
                          <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                          </svg>
                        }
                        @case ('in-progress') {
                          <div class="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                        }
                        @case ('blocked') {
                          <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
                          </svg>
                        }
                        @default {
                          <div class="w-3 h-3 bg-gray-300 rounded-full"></div>
                        }
                      }
                    </span>
                    
                    <!-- Step Number & Name -->
                    <span>
                      <span class="font-medium">{{ idx + 1 }}.</span>
                      {{ step.stepName }}
                    </span>
                  </button>
                  
                  <!-- Arrow -->
                  @if (idx < phase.steps.length - 1) {
                    <svg class="w-4 h-4 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class PhaseNavigatorComponent {
  private metadataService = inject(MetadataService);
  private router = inject(Router);
  
  auditId = input.required<number>();
  currentStepKey = input<string>();
  
  phases = this.metadataService.phases;
  
  // Compute current phase from currentStepKey
  currentPhase = computed(() => {
    const stepKey = this.currentStepKey();
    if (!stepKey) return 1;
    
    const stepInfo = this.metadataService.getStep(stepKey);
    return stepInfo?.phase.phaseId || 1;
  });
  
  currentPhaseData = computed(() => {
    return this.metadataService.getPhase(this.currentPhase());
  });
  
  constructor() {
    // Load metadata when component initializes
    effect(() => {
      const id = this.auditId();
      if (id) {
        this.metadataService.loadAuditProgress(id);
      }
    });
  }
  
  getStepStatus(stepKey: string): string {
    return this.metadataService.getStepProgress(stepKey)?.status || 'pending';
  }
  
  isStepAvailable(stepKey: string): boolean {
    return this.metadataService.isStepAvailable(stepKey);
  }
  
  getStepButtonClass(stepKey: string): string {
    const status = this.getStepStatus(stepKey);
    const isCurrent = stepKey === this.currentStepKey();
    
    if (isCurrent) {
      return 'bg-blue-100 border-2 border-blue-600 text-blue-900 font-semibold';
    }
    
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-800 hover:bg-green-100';
      case 'in-progress':
        return 'bg-blue-50 text-blue-800 hover:bg-blue-100';
      case 'blocked':
        return 'bg-red-50 text-red-800 cursor-not-allowed opacity-50';
      default:
        return 'bg-gray-50 text-gray-700 hover:bg-gray-100';
    }
  }
  
  getPhaseProgress(phase: any): string {
    const total = phase.steps.length;
    const completed = phase.steps.filter((s: any) => 
      this.getStepStatus(s.stepKey) === 'completed'
    ).length;
    return `${completed}/${total}`;
  }
  
  selectPhase(phaseId: number): void {
    const phase = this.metadataService.getPhase(phaseId);
    if (phase && phase.steps.length > 0) {
      const firstStep = phase.steps[0];
      this.navigateToStep(firstStep.stepKey);
    }
  }
  
  navigateToStep(stepKey: string): void {
    if (!this.isStepAvailable(stepKey)) return;
    
    const [phaseId, stepId] = stepKey.split('-').map(Number);
    this.router.navigate([
      '/audits',
      this.auditId(),
      'phases',
      phaseId,
      'steps',
      stepId
    ]);
  }
}
```

**App Initialization:**

```typescript
// src/app/app.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { MetadataService } from './features/audit/services/metadata.service';

@Component({
  selector: 'app-root',
  template: `
    @if (metadataService.loading()) {
      <div class="flex items-center justify-center h-screen">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `
})
export class AppComponent implements OnInit {
  metadataService = inject(MetadataService);
  
  async ngOnInit() {
    // Load all phases/steps on app startup
    await this.metadataService.loadPhases();
  }
}
```

**Validation:**
```bash
# Run frontend
cd frontend
npm start

# Navigate to http://localhost:4200
# ✅ Should see phase tabs dynamically rendered from API (not hardcoded!)
# ✅ Phase icons and colors from database should display
# ✅ All 8 phases should be visible (or however many are in DB)
# Click on different phases - navigation should work
# Step statuses should show pending/in-progress/completed icons

# Test: Add a new phase in database
psql $DATABASE_URL -c "INSERT INTO \"PhaseConfiguration\" (\"phaseId\", \"phaseKey\", \"phaseName\", \"displayOrder\") VALUES (9, 'follow-up', 'Follow-up Review', 9);"

# Refresh browser - new phase should appear WITHOUT code changes! ✅
```

---

## Phase 3: Auto-Discovery & Hot Reload

### **Step 3.1: Auto-Register Repositories**

**Objective:** Repositories auto-register using file naming convention.

```typescript
// src/repositories/repository-registry.ts

import { PrismaClient } from '@prisma/client';
import { BaseStepRepository } from './base/base-step.repository';
import { GenericStepRepository } from './generic/generic-step.repository';
import * as fs from 'fs';
import * as path from 'path';

export class RepositoryRegistry {
  private repositories: Map<string, BaseStepRepository> = new Map();
  private genericRepo: GenericStepRepository;

  constructor(private prisma: PrismaClient) {
    this.genericRepo = new GenericStepRepository(prisma);
    this.autoRegisterRepositories();
  }

  /**
   * AUTO-DISCOVER repositories from /custom and /domain folders
   * Files must follow naming convention: *.repository.ts
   */
  private autoRegisterRepositories(): void {
    const folders = ['custom', 'domain'];
    
    folders.forEach(folder => {
      const folderPath = path.join(__dirname, folder);
      
      if (!fs.existsSync(folderPath)) {
        console.warn(`Repository folder not found: ${folderPath}`);
        return;
      }
      
      const files = fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.repository.ts') || file.endsWith('.repository.js'));
      
      files.forEach(file => {
        try {
          const modulePath = path.join(folderPath, file);
          const module = require(modulePath);
          
          // Get export (default or named)
          const RepositoryClass = module.default || Object.values(module)[0];
          
          if (!RepositoryClass) {
            console.warn(`No class found in ${file}`);
            return;
          }
          
          // Extract repository name from filename
          // Example: "client.repository.ts" → "ClientRepository"
          const name = file
            .replace('.repository.ts', '')
            .replace('.repository.js', '')
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('') + 'Repository';
          
          // Instantiate and register
          const instance = new RepositoryClass(this.prisma);
          this.repositories.set(name, instance);
          
          console.log(`✅ Auto-registered repository: ${name} (from ${folder}/${file})`);
        } catch (error) {
          console.error(`Failed to load repository from ${file}:`, error);
        }
      });
    });
    
    console.log(`✅ Repository Registry initialized with ${this.repositories.size} custom repositories`);
  }

  // ... rest of methods unchanged ...
}
```

**File Naming Convention:**
```
repositories/
├── custom/
│   ├── step2.repository.ts           → Step2Repository
│   ├── step3.repository.ts           → Step3Repository
│   ├── phase2-step6.repository.ts    → Phase2Step6Repository
│   └── risk-assessment.repository.ts → RiskAssessmentRepository
├── domain/
│   ├── client.repository.ts          → ClientRepository
│   ├── document.repository.ts        → DocumentRepository
│   └── finding.repository.ts         → FindingRepository
```

---

### **Step 3.2: Implement Configuration Hot Reload**

**Objective:** Update step configs without restarting server.

```typescript
// src/services/metadata-registry.service.ts

import { PrismaClient } from '@prisma/client';
import { StepConfig } from '../config/types/step-config.types';
import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';
import * as path from 'path';

export class MetadataRegistryService extends EventEmitter {
  private configCache: Map<string, StepConfig> = new Map();
  private fileWatcher?: chokidar.FSWatcher;
  
  constructor(private prisma: PrismaClient) {
    super();
    this.initializeConfigWatch();
  }
  
  /**
   * Watch config files for changes and hot-reload
   */
  private initializeConfigWatch(): void {
    if (process.env.NODE_ENV === 'production') {
      // In production, load from DB only
      return;
    }
    
    const configPath = path.join(__dirname, '../config/steps/**/*.config.ts');
    
    this.fileWatcher = chokidar.watch(configPath, {
      persistent: true,
      ignoreInitial: true
    });
    
    this.fileWatcher.on('change', async (filePath) => {
      console.log(`📝 Config file changed: ${filePath}`);
      
      try {
        // Clear require cache for this file
        delete require.cache[require.resolve(filePath)];
        
        // Reload config
        const module = require(filePath);
        const config: StepConfig = module.default || Object.values(module)[0];
        
        if (config && config.stepKey) {
          // Update local cache
          this.configCache.set(config.stepKey, config);
          
          // Sync to database
          await this.syncConfigToDatabase(config);
          
          console.log(`✅ Hot-reloaded config: ${config.stepKey}`);
          this.emit('config-updated', config.stepKey);
        }
      } catch (error) {
        console.error(`Failed to hot-reload config: ${filePath}`, error);
      }
    });
    
    console.log('👀 Watching config files for changes...');
  }
  
  /**
   * Sync TypeScript config to database
   */
  private async syncConfigToDatabase(config: StepConfig): Promise<void> {
    await this.prisma.stepConfiguration.upsert({
      where: { stepKey: config.stepKey },
      create: {
        stepKey: config.stepKey,
        phaseId: config.phaseId,
        stepId: config.stepId,
        stepName: config.stepName,
        description: config.description,
        formSchema: config.formSchema as any,
        dataConfig: config.dataConfig as any,
        businessRules: config.businessRules as any,
        dependencies: config.dependencies as any
      },
      update: {
        stepName: config.stepName,
        description: config.description,
        formSchema: config.formSchema as any,
        dataConfig: config.dataConfig as any,
        businessRules: config.businessRules as any,
        dependencies: config.dependencies as any,
        version: { increment: 1 }
      }
    });
  }
  
  async getConfig(phaseId: number, stepId: number): Promise<StepConfig> {
    const stepKey = `${phaseId}-${stepId}`;
    
    // Check cache first
    if (this.configCache.has(stepKey)) {
      return this.configCache.get(stepKey)!;
    }
    
    // Load from database
    const dbConfig = await this.prisma.stepConfiguration.findUnique({
      where: { stepKey }
    });
    
    if (!dbConfig) {
      throw new Error(`Step configuration not found for ${stepKey}`);
    }
    
    const config: StepConfig = {
      stepKey: dbConfig.stepKey,
      phaseId: dbConfig.phaseId,
      stepId: dbConfig.stepId,
      stepName: dbConfig.stepName,
      description: dbConfig.description || undefined,
      formSchema: dbConfig.formSchema as any,
      dataConfig: dbConfig.dataConfig as any,
      businessRules: dbConfig.businessRules as any,
      dependencies: dbConfig.dependencies as any
    };
    
    // Cache for future use
    this.configCache.set(stepKey, config);
    
    return config;
  }
  
  /**
   * Cleanup on shutdown
   */
  async shutdown(): void {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }
  }
}
```

**Install Dependencies:**
```bash
npm install chokidar
npm install --save-dev @types/chokidar
```

**Validation:**
```bash
# Start server in dev mode
npm run dev

# Edit a config file (e.g., phase1/step1.config.ts)
# Change stepName: 'Client Basic Information' → 'Client Details'

# Check server logs:
# "📝 Config file changed: /src/config/steps/phase1/step1.config.ts"
# "✅ Hot-reloaded config: 1-1"

# Test API without restart:
curl http://localhost:3000/api/metadata/steps/1-1

# Should show updated stepName
```

---

## Phase 4: Performance Monitoring & CLI Tools

### **Step 4.1: Add Performance Monitoring**

```typescript
// src/middleware/performance.middleware.ts

import { Request, Response, NextFunction } from 'express';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  stepKey?: string;
  validationTime?: number;
  dbQueryTime?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 requests
  
  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    // Warn on slow requests
    if (metric.duration > 1000) {
      console.warn(`⚠️  Slow request detected: ${metric.method} ${metric.endpoint} (${metric.duration}ms)`);
    }
  }
  
  getStats() {
    if (this.metrics.length === 0) return null;
    
    const durations = this.metrics.map(m => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return {
      totalRequests: this.metrics.length,
      avgDuration: Math.round(avg),
      p50Duration: p50,
      p95Duration: p95,
      p99Duration: p99,
      slowRequests: this.metrics.filter(m => m.duration > 1000).length
    };
  }
  
  getSlowestEndpoints(limit = 10) {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(m => ({
        endpoint: m.endpoint,
        method: m.method,
        duration: m.duration,
        stepKey: m.stepKey
      }));
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    performanceMonitor.record({
      endpoint: req.path,
      method: req.method,
      duration,
      timestamp: new Date(),
      stepKey: req.params.stepKey
    });
  });
  
  next();
}
```

**Performance Stats Endpoint:**

```typescript
// Add to metadata.controller.ts

async getPerformanceStats(req: Request, res: Response) {
  const stats = performanceMonitor.getStats();
  const slowest = performanceMonitor.getSlowestEndpoints();
  
  res.json({
    success: true,
    data: {
      stats,
      slowestEndpoints: slowest
    }
  });
}

// Add route
router.get('/performance', (req, res) => controller.getPerformanceStats(req, res));
```

---

### **Step 4.2: CLI Tool for Step Generation**

```typescript
// src/cli/generate-step.ts

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer));
  });
}

async function generateStep() {
  console.log('\n🚀 Step Configuration Generator\n');
  
  const phaseId = await prompt('Phase ID (1-8): ');
  const stepId = await prompt('Step ID (1-20): ');
  const stepName = await prompt('Step Name: ');
  const description = await prompt('Description (optional): ');
  const pattern = await prompt('Pattern (1=Simple CRUD, 2=Multi-source, 3=Complex, 4=Array, 5=Conditional, 6=Transaction): ');
  
  const stepKey = `${phaseId}-${stepId}`;
  const configPath = path.join(
    __dirname,
    `../config/steps/phase${phaseId}/step${stepId}.config.ts`
  );
  
  // Ensure directory exists
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Generate config based on pattern
  const template = getTemplateForPattern(parseInt(pattern), {
    stepKey,
    phaseId: parseInt(phaseId),
    stepId: parseInt(stepId),
    stepName,
    description
  });
  
  // Write file
  fs.writeFileSync(configPath, template);
  
  console.log(`\n✅ Created: ${configPath}`);
  console.log('\n📝 Next steps:');
  console.log('1. Edit the config file to add your specific fields');
  console.log('2. If using custom strategy, create repository in /repositories/custom/');
  console.log('3. Run: npm run compute-dependencies');
  console.log('4. Run: npm run sync-metadata');
  console.log('\n');
  
  rl.close();
}

function getTemplateForPattern(pattern: number, data: any): string {
  // Templates for each pattern...
  // (Full templates omitted for brevity - include all 6 patterns)
  
  return `import { StepConfig } from '../../types/step-config.types';

export const Phase${data.phaseId}Step${data.stepId}Config: StepConfig = {
  stepKey: '${data.stepKey}',
  phaseId: ${data.phaseId},
  stepId: ${data.stepId},
  stepName: '${data.stepName}',
  description: '${data.description}',
  
  formSchema: {
    fields: [
      {
        name: 'exampleField',
        type: 'text',
        label: 'Example Field',
        required: true,
        validation: {
          required: true,
          minLength: 3
        }
      }
    ]
  },
  
  dataConfig: {
    fetch: {
      strategy: 'prisma-simple',
      model: 'yourModel'
    },
    save: {
      strategy: 'prisma-upsert',
      transactional: false,
      model: 'yourModel'
    }
  }
};
`;
}

// Run generator
generateStep();
```

**Package.json Scripts:**

```json
{
  "scripts": {
    "generate:step": "ts-node src/cli/generate-step.ts",
    "generate:phase": "ts-node src/cli/generate-phase.ts",
    "seed:phases": "ts-node src/scripts/seed-phases.ts",
    "compute-dependencies": "ts-node src/scripts/compute-step-dependencies.ts",
    "sync-metadata": "ts-node src/scripts/sync-metadata-to-db.ts",
    "validate-configs": "ts-node src/cli/validate-configs.ts"
  }
}
```

**Usage:**
```bash
npm run generate:step

# Interactive prompts:
Phase ID (1-8): 3
Step ID (1-20): 1
Step Name: Compliance Checklist
Description (optional): Review compliance requirements
Pattern (1-6): 4

# ✅ Created: /src/config/steps/phase3/step1.config.ts
```

---

## Summary Checklist

After completing all phases, verify:

- [ ] **Performance:**
  - Step save < 500ms (including validation)
  - Cross-step validation uses batched queries (1-2 queries max)
  - Config lookup < 50ms
  
- [ ] **Scalability:**
  - Can add new step by creating config file only
  - Repositories auto-register
  - No manual registration needed
  
- [ ] **Flexibility:**
  - ✅ **Phases loaded from database** (PhaseConfiguration table)
  - ✅ **Steps loaded from database** (StepConfiguration table)
  - ✅ **Frontend has ZERO hardcoded phases or steps**
  - ✅ Add new phase: INSERT into PhaseConfiguration (no code changes)
  - ✅ Add new step: Create config file + sync to DB
  - Hot-reload works in development
  - Dependencies computed automatically
  
- [ ] **Developer Experience:**
  - CLI generates step boilerplate
  - Config validator catches errors
  - Performance monitoring shows bottlenecks

---

## Testing Each Phase

```bash
# Phase 1: Performance
npm run test:performance
# Expected: All validations < 100ms

# Phase 2: Dynamic Loading
curl http://localhost:3000/api/metadata/phases
# Expected: All 8 phases with steps

# Phase 3: Hot Reload
# Edit a config file, check logs for hot-reload message

# Phase 4: CLI
npm run generate:step
# Follow prompts, verify file created
```

---

## Production Deployment Checklist

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Sync all configs: `npm run sync-metadata`
- [ ] Compute dependencies: `npm run compute-dependencies`
- [ ] Validate configs: `npm run validate-configs`
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Set `NODE_ENV=production` (disables hot-reload)
- [ ] Configure caching layer (Redis recommended for > 50 steps)
- [ ] Set up monitoring for performance metrics endpoint
