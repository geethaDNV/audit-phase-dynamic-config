# Audit Phase Dynamic - Complete System Explanation

## 📚 Table of Contents
1. [System Overview](#system-overview)
2. [Configuration System](#configuration-system)
3. [Data Flow - Complete Journey](#data-flow---complete-journey)
4. [Dynamic Form Rendering](#dynamic-form-rendering)
5. [Validation System](#validation-system)
6. [Fetch Strategies](#fetch-strategies)
7. [Save Strategies](#save-strategies)
8. [Step-by-Step Example](#step-by-step-example)

---

## System Overview

### The Big Idea 💡

**Instead of creating 80 different forms, controllers, and endpoints**, this system uses **ONE generic controller, ONE generic form component**, and **metadata configuration files** that define how each step behaves.

### Key Innovation

```
Traditional Approach:
- Step 1: ClientFormComponent + ClientController + ClientService
- Step 2: EntityFormComponent + EntityController + EntityService
- Step 3: RiskFormComponent + RiskController + RiskService
... (80 times!)

Metadata-Driven Approach:
- ONE: DynamicFormComponent (renders ANY step)
- ONE: StepController (handles ANY step)
- ONE: StepService (processes ANY step)
- 80 configuration files (JSON-like TypeScript objects)
```

---

## Configuration System

### Two Sources of Configuration

#### 1. **TypeScript Config Files** (Development Source)

**Location:** `backend/src/config/steps/`

**Purpose:** 
- Type-safe configuration at compile time
- IDE autocomplete and validation
- Version controlled with code
- **Synced to database** via `npm run sync:steps`
- Backend loads form schemas from these files
- Dependencies are synced to database but frontend uses status tracking instead

**Example Structure:**
```typescript
// backend/src/config/steps/phase1/step1.config.ts
export const Phase1Step1Config: StepConfig = {
  stepKey: '1-1',
  phaseId: 1,
  stepId: 1,
  stepName: 'Client Basic Information',
  description: 'Capture essential client details',
  
  formSchema: { /* defines form fields */ },
  dataConfig: { /* defines how to fetch/save */ },
  dependencies: { /* defines required steps */ }
}
```

#### 2. **Database Tables** (Runtime Tracking & Configuration Storage)

**Tables:** 
- `StepConfiguration` - Stores step configs synced from TypeScript
- `AuditStepStatus` - Tracks step completion and dependencies
- `PhaseConfiguration` - Stores phase metadata

**Purpose:**
- **`StepConfiguration`**: Stores form schemas, data configs, and dependency definitions (synced from TypeScript)
- **`AuditStepStatus`**: Tracks which steps are completed, pending, or blocked per audit
- Frontend loads phases/steps list from database
- Frontend enforces dependencies via step status tracking, NOT config dependencies field

**Current Status:** TypeScript files are synced to database. Frontend uses database for step flow enforcement.

### How Configs Are Loaded

```
Development Time:
  TypeScript config files (source of truth)
    ↓
  npm run sync:steps
    ↓
  Database (StepConfiguration table)

Runtime:
  Backend:
    step-registry.ts loads TypeScript configs → form schemas/validation
    
  Frontend:
    GET /api/metadata/phases → database (StepConfiguration)
    GET /api/metadata/audits/:id/progress → database (AuditStepStatus)
    Dependency enforcement via step statuses, NOT config dependencies
```

**Key File:** `backend/src/config/step-registry.ts`
```typescript
class StepRegistry {
  private registerSteps(): void {
    this.register(Phase1Step1Config);  // Loads 1-1
    this.register(Phase1Step2Config);  // Loads 1-2
    this.register(Phase1Step3Config);  // Loads 1-3
    // ...
  }
  
  public getConfig(phaseId: number, stepId: number): StepConfig {
    const key = `${phaseId}-${stepId}`;
    return this.configs.get(key);
  }
}
```

---

## Data Flow - Complete Journey

### Frontend → Backend → Database → Backend → Frontend

Let me trace a complete request for **Step 1-2 (Entity Selection)**:

### Step 1: User Navigates to Step
```
User clicks "Step 2: Entity Selection"
    ↓
Angular Router: /audits/1/phase/1/step/2
    ↓
AuditWizardComponent activates
```

### Step 2: Frontend Fetches Metadata + Data
```typescript
// frontend/src/app/features/audit/components/audit-wizard.component.ts

// 1. Load step metadata (form schema)
GET /api/metadata/phases/1/steps/2
    ↓
Backend MetadataController returns:
{
  formSchema: {
    fields: [
      { name: 'selectedEntityId', type: 'select', ... },
      { name: 'selectedContacts', type: 'multi-select', ... }
    ]
  }
}

// 2. Load step data (entities and contacts to populate dropdowns)
GET /api/audits/1/phases/1/steps/2
    ↓
Backend StepController.getStepData() is called
```

### Step 3: Backend Fetches Data (Based on Fetch Strategy)

**In StepService.getStepData():**

```typescript
// backend/src/services/step.service.ts

async getStepData(auditId: number, phaseId: number, stepId: number) {
  // 1. Load configuration for step 1-2
  const config = metadataRegistry.getConfig(phaseId, stepId);
  
  // 2. Execute fetch strategy (from config.dataConfig.fetch)
  const data = await this.executeFetchStrategy(config, context);
  
  return data;
}
```

**For Step 1-2, the config says:**
```typescript
dataConfig: {
  fetch: {
    strategy: 'prisma-compose',  // ← Combine multiple data sources
    repositoryClass: 'Step2Repository',
    sources: [
      { name: 'entities', model: 'entity', filter: 'byAuditClientId' },
      { name: 'contacts', model: 'contact', filter: 'byAuditClientId' }
    ]
  }
}
```

**StepService calls Step2Repository:**
```typescript
// backend/src/repositories/custom/step2.repository.ts

async fetch(auditId: number) {
  // Get client record from Step 1
  const client = await prisma.client.findUnique({
    where: { auditId }
  });
  
  // Load all entities for this client
  const entities = await prisma.entity.findMany({
    where: { clientId: client.id }
  });
  
  // Load all contacts for this client
  const contacts = await prisma.contact.findMany({
    where: { clientId: client.id }
  });
  
  return {
    entities: entities,
    contacts: contacts,
    selectedEntityId: client.selectedEntityId,
    selectedContacts: [] // Previously saved selections
  };
}
```

**Response to Frontend:**
```json
{
  "success": true,
  "data": {
    "entities": [
      { "id": 1, "name": "Acme Corp LLC", "type": "llc" },
      { "id": 2, "name": "Acme Holdings Inc", "type": "corporation" }
    ],
    "contacts": [
      { "id": 1, "name": "John Doe", "email": "john@acme.com", "displayName": "John Doe (john@acme.com)" },
      { "id": 2, "name": "Jane Smith", "email": "jane@acme.com", "displayName": "Jane Smith (jane@acme.com)" }
    ],
    "selectedEntityId": null,
    "selectedContacts": []
  }
}
```

### Step 4: Frontend Renders Dynamic Form

```typescript
// frontend/src/app/shared/components/dynamic-form/dynamic-form.component.ts

private buildForm(): void {
  // 1. Populate select field options from fetched data
  this.populateDynamicOptions();
  
  // 2. Build form controls with validators
  const formGroup = FormBuilderUtil.buildFormGroup(
    this.fb,
    this.formSchema().fields,
    this.initialData()
  );
  
  this.form.set(formGroup);
}

private populateDynamicOptions(): void {
  for (const field of this.formSchema().fields) {
    if (field.optionsSource) {
      const { dataPath, labelField, valueField } = field.optionsSource;
      const sourceData = this.initialData()[dataPath];
      
      // For selectedEntityId field:
      // dataPath = 'entities'
      // sourceData = [{ id: 1, name: 'Acme Corp LLC' }, ...]
      // Creates options: [{ label: 'Acme Corp LLC', value: 1 }, ...]
      
      field.options = sourceData.map(item => ({
        label: item[labelField],
        value: item[valueField]
      }));
    }
  }
}
```

**Result: Form is rendered with populated dropdowns!**

```html
<!-- Auto-generated HTML based on formSchema -->
<form>
  <!-- Field 1: selectedEntityId -->
  <app-field-select
    [field]="{
      name: 'selectedEntityId',
      type: 'select',
      label: 'Primary Entity',
      options: [
        { label: 'Acme Corp LLC', value: 1 },
        { label: 'Acme Holdings Inc', value: 2 }
      ]
    }"
  />
  
  <!-- Field 2: selectedContacts -->
  <app-field-multi-select
    [field]="{
      name: 'selectedContacts',
      type: 'multi-select',
      label: 'Key Contacts',
      options: [
        { label: 'John Doe (john@acme.com)', value: 1 },
        { label: 'Jane Smith (jane@acme.com)', value: 2 }
      ]
    }"
  />
</form>
```

### Step 5: User Fills Form and Submits

```
User selects:
  - Primary Entity: "Acme Corp LLC" (id: 1)
  - Key Contacts: ["John Doe" (id: 1), "Jane Smith" (id: 2)]
    ↓
User clicks "Save & Continue"
    ↓
DynamicFormComponent.handleSubmit()
```

### Step 6: Frontend Validation (Client-Side)

```typescript
// Built from formSchema.fields[].validation

handleSubmit(): void {
  // Angular FormGroup validators check:
  // - selectedEntityId: required ✓
  // - selectedContacts: minItems(1) ✓
  
  if (this.form().invalid) {
    this.collectFormErrors();
    return; // Stop submission
  }
  
  // Validation passed!
  const formValue = {
    selectedEntityId: 1,
    selectedContacts: [1, 2]
  };
  
  this.formSubmit.emit(formValue);
}
```

### Step 7: POST Request to Backend

```
POST /api/audits/1/phases/1/steps/2
Body: {
  "selectedEntityId": 1,
  "selectedContacts": [1, 2]
}
    ↓
StepController.saveStepData() receives request
```

### Step 8: Backend Validation (Server-Side)

```typescript
// backend/src/services/step.service.ts

async saveStepData(auditId, phaseId, stepId, payload) {
  const config = metadataRegistry.getConfig(phaseId, stepId);
  
  // VALIDATION - Multi-layer
  await this.validationService.validate(
    payload,
    config.formSchema,
    context,
    config.dependencies
  );
  
  // ...continue if validation passes
}
```

**ValidationService performs:**

```typescript
// backend/src/services/validation.service.ts

async validate(payload, formSchema, context, dependencies) {
  // 1. Build validation context (loads data from dependent steps)
  const validationContext = await this.contextService.buildValidationContext(
    context,
    dependencies
  );
  
  // 2. Field-level validation
  for (const field of formSchema.fields) {
    // Check: required, minLength, maxLength, pattern, etc.
    this.validateField(field, payload[field.name]);
  }
  
  // 3. Business rules validation
  if (formSchema.businessRules) {
    await this.validateBusinessRules(
      payload,
      formSchema.businessRules,
      validationContext
    );
  }
  
  // 4. Cross-step validation (check step 1-1 was completed)
  // validationContext contains client data from step 1-1
  
  if (errors) {
    throw new ValidationError(errors);
  }
}
```

### Step 9: Save to Database (Based on Save Strategy)

**For Step 1-2, the config says:**
```typescript
dataConfig: {
  save: {
    strategy: 'custom',
    repositoryClass: 'Step2Repository',
    transactional: false
  }
}
```

**StepService calls Step2Repository:**
```typescript
// backend/src/repositories/custom/step2.repository.ts

async save(auditId: number, payload: any) {
  // Get client record
  const client = await prisma.client.findUnique({
    where: { auditId }
  });
  
  // Update client with selected entity
  await prisma.client.update({
    where: { id: client.id },
    data: {
      selectedEntityId: payload.selectedEntityId
    }
  });
  
  // Store selected contacts (could be junction table)
  // For simplicity, this is conceptual
  
  return payload;
}
```

### Step 10: Update Step Status

```typescript
// Mark step as completed
await prisma.auditStepStatus.upsert({
  where: { auditId_phaseId_stepId: { auditId, phaseId, stepId } },
  update: { status: 'completed' },
  create: { auditId, phaseId, stepId, status: 'completed' }
});
```

### Step 11: Response to Frontend

```json
{
  "success": true,
  "data": {
    "selectedEntityId": 1,
    "selectedContacts": [1, 2]
  }
}
```

### Step 12: Frontend Updates UI

```typescript
// Navigate to next step
this.router.navigate(['/audits', auditId, 'phase', phaseId, 'step', nextStepId]);
```

---

## Dynamic Form Rendering

### How ANY Form is Rendered from Metadata

The `DynamicFormComponent` is a **generic form builder** that renders based on `formSchema`:

```typescript
formSchema: {
  fields: [
    {
      name: 'clientName',
      type: 'text',
      label: 'Client Name',
      validation: { required: true, minLength: 3 }
    },
    {
      name: 'industry',
      type: 'select',
      label: 'Industry',
      options: ['Technology', 'Finance', 'Healthcare']
    },
    {
      name: 'documents',
      type: 'array',
      arrayItemType: 'object',
      arrayItemSchema: {
        fields: [
          { name: 'title', type: 'text', ... },
          { name: 'fileSize', type: 'number', ... }
        ]
      }
    }
  ]
}
```

### Field Type → Component Mapping

```typescript
// dynamic-form.component.ts template

@for (field of formSchema().fields; track field.name) {
  @if (field.type === 'text' || field.type === 'email' || field.type === 'number') {
    <app-field-text [field]="field" [control]="getControl(field.name)" />
  }
  @else if (field.type === 'select') {
    <app-field-select [field]="field" [control]="getControl(field.name)" />
  }
  @else if (field.type === 'array') {
    <app-field-array [field]="field" [formArray]="getFormArray(field.name)" />
  }
  // ... etc
}
```

### Form Builder Creates Validators

```typescript
// frontend/src/app/shared/utils/form-builder.util.ts

static buildValidators(validation: FieldValidation): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  
  if (validation.required) validators.push(Validators.required);
  if (validation.email) validators.push(Validators.email);
  if (validation.minLength) validators.push(Validators.minLength(validation.minLength));
  if (validation.maxLength) validators.push(Validators.maxLength(validation.maxLength));
  if (validation.pattern) validators.push(Validators.pattern(validation.pattern));
  
  return validators;
}
```

**Result:** Form validation happens automatically based on `formSchema.fields[].validation`!

---

## Validation System

### Multi-Layer Validation Architecture

```
Layer 1: Frontend Field-Level Validation
    ↓ (User submits form)
Layer 2: Backend Field-Level Validation
    ↓ (Re-validates same rules server-side)
Layer 3: Conditional Validation
    ↓ (If field X = Y, then field Z required)
Layer 4: Cross-Step Validation
    ↓ (Verify step 1-1 was completed)
Layer 5: Business Rules Validation
    ↓ (Custom validators for complex rules)
```

### Example: Step 2-3 (Audit Findings) Validation

```typescript
// From your StepConfiguration.json

formSchema: {
  fields: [
    {
      name: 'severity',
      type: 'select',
      validation: {
        required: true,
        enum: ['Low', 'Medium', 'High', 'Critical']
      }
    },
    {
      name: 'description',
      type: 'textarea',
      validation: {
        required: true,
        minLength: 20
      }
    }
  ]
},

businessRules: [
  {
    name: 'critical-finding-validation',
    type: 'conditional',
    config: {
      condition: "severity === 'Critical'",
      message: 'Critical findings require evidence and recommendations'
    }
  }
]
```

**Validation Flow:**

1. **Field Validation:** Checks required, minLength, enum
2. **Conditional Validation:** If severity = 'Critical', additional requirements apply
3. **Cross-Step Validation:** Verifies documents from Step 2-1 exist before allowing references

### Validation Context Service

**Purpose:** Load ALL dependency data in ONE batch query to avoid N+1 queries

```typescript
// backend/src/services/validation-context.service.ts

async buildValidationContext(context, dependencies) {
  const validationContext = { ...context };
  
  if (dependencies?.dataReferences) {
    // For step 2-3, dependencies are:
    // '1-1': { fields: ['name', 'email', 'industry'] }
    // '2-1': { fields: ['id'], threshold: 100 }
    
    for (const [stepKey, reference] of Object.entries(dependencies.dataReferences)) {
      const data = await this.loadDependencyData(context, stepKey, reference);
      validationContext[`step_${stepKey}`] = data;
    }
  }
  
  return validationContext;
}
```

**Result:** Validator has access to:
- Current step data
- Client data from step 1-1
- Document IDs from step 2-1
- All in ONE query batch!

---

## Fetch Strategies

### Strategy 1: `prisma-simple`

**Use Case:** Single table, no joins

**Example:** Step 1-1 (Client Basic Information)

```typescript
dataConfig: {
  fetch: {
    strategy: 'prisma-simple',
    model: 'client'
  }
}
```

**Implementation:**
```typescript
// backend/src/services/step.service.ts

case 'prisma-simple':
  const repo = this.repoRegistry.getRepository(config.dataConfig.fetch.model);
  data = await repo.findByAuditId(context.auditId);
```

**SQL Generated:**
```sql
SELECT * FROM "Client" WHERE "auditId" = 1;
```

### Strategy 2: `prisma-compose`

**Use Case:** Multiple related tables, combine results

**Example:** Step 1-2 (Entity Selection)

```typescript
dataConfig: {
  fetch: {
    strategy: 'prisma-compose',
    repositoryClass: 'Step2Repository',
    sources: [
      { name: 'entities', model: 'entity', filter: 'byAuditClientId' },
      { name: 'contacts', model: 'contact', filter: 'byAuditClientId' }
    ]
  }
}
```

**Implementation:**
```typescript
// Custom repository method
async fetch(auditId: number) {
  const client = await prisma.client.findUnique({ where: { auditId } });
  
  const [entities, contacts] = await Promise.all([
    prisma.entity.findMany({ where: { clientId: client.id } }),
    prisma.contact.findMany({ where: { clientId: client.id } })
  ]);
  
  return { entities, contacts, selectedEntityId: client.selectedEntityId };
}
```

### Strategy 3: `custom-query`

**Use Case:** Complex queries with aggregations, joins, raw SQL

**Example:** Step 1-3 (Risk Assessment)

```typescript
dataConfig: {
  fetch: {
    strategy: 'custom-query',
    repositoryClass: 'Step3Repository'
  }
}
```

**Implementation:**
```typescript
// backend/src/repositories/custom/step3.repository.ts

async fetch(auditId: number) {
  // Complex query with aggregations
  const riskData = await prisma.$queryRaw`
    SELECT 
      r.*,
      c.name as clientName,
      c.industry,
      e.name as entityName,
      COUNT(f.id) as findingsCount,
      AVG(CASE 
        WHEN f.severity = 'Critical' THEN 100
        WHEN f.severity = 'High' THEN 75
        WHEN f.severity = 'Medium' THEN 50
        ELSE 25
      END) as averageRiskScore
    FROM "RiskAssessment" r
    LEFT JOIN "Client" c ON c.auditId = r.auditId
    LEFT JOIN "Entity" e ON e.id = c.selectedEntityId
    LEFT JOIN "Finding" f ON f.auditId = r.auditId
    WHERE r.auditId = ${auditId}
    GROUP BY r.id, c.name, c.industry, e.name
  `;
  
  return riskData;
}
```

---

## Save Strategies

### Strategy 1: `prisma-upsert`

**Use Case:** Simple create or update, single table

**Example:** Step 1-1 (Client)

```typescript
dataConfig: {
  save: {
    strategy: 'prisma-upsert',
    model: 'client',
    transactional: false
  }
}
```

**Implementation:**
```typescript
case 'prisma-upsert':
  const repo = this.repoRegistry.getRepository(config.dataConfig.save.model);
  result = await repo.upsert(context.auditId, payload);
```

**SQL Generated:**
```sql
INSERT INTO "Client" (auditId, name, email, industry, ...)
VALUES (1, 'Acme Corp', 'info@acme.com', 'Technology', ...)
ON CONFLICT (auditId) 
DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, ...;
```

### Strategy 2: `prisma-create` (Bulk)

**Use Case:** Array of items (checklist, documents)

**Example:** Step 2-2 (Checklist Items)

```typescript
dataConfig: {
  save: {
    strategy: 'prisma-create',
    model: 'checklistItem',
    bulkOperation: true,
    transactional: true,
    deleteExisting: true  // ← Delete old items first
  }
}
```

**Implementation:**
```typescript
case 'prisma-create':
  await prisma.$transaction(async (tx) => {
    // 1. Delete existing items
    if (config.dataConfig.save.deleteExisting) {
      await tx.checklistItem.deleteMany({ where: { auditId } });
    }
    
    // 2. Create new items
    await tx.checklistItem.createMany({
      data: payload.items.map(item => ({
        ...item,
        auditId: context.auditId
      }))
    });
  });
```

### Strategy 3: `custom`

**Use Case:** Complex multi-table operations

**Example:** Step 1-2 (Entity Selection)

```typescript
dataConfig: {
  save: {
    strategy: 'custom',
    repositoryClass: 'Step2Repository'
  }
}
```

**Implementation:**
```typescript
// backend/src/repositories/custom/step2.repository.ts

async save(auditId: number, payload: any) {
  const client = await prisma.client.findUnique({ where: { auditId } });
  
  // Update client with selected entity
  await prisma.client.update({
    where: { id: client.id },
    data: { selectedEntityId: payload.selectedEntityId }
  });
  
  // Handle contact associations
  // ... custom logic
  
  return payload;
}
```

### Strategy 4: `complex-transaction`

**Use Case:** Multi-table with relationships in single transaction

**Example:** Step 2-3 (Findings with Evidence)

```typescript
dataConfig: {
  save: {
    strategy: 'complex-transaction',
    repositoryClass: 'FindingRepository',
    transactional: true
  }
}
```

**Implementation:**
```typescript
// backend/src/repositories/custom/finding.repository.ts

async save(auditId: number, payload: any) {
  return await prisma.$transaction(async (tx) => {
    // 1. Delete existing findings and related data
    await tx.finding.deleteMany({ where: { auditId } });
    
    // 2. Create new findings with nested evidence and recommendations
    for (const item of payload.items) {
      const finding = await tx.finding.create({
        data: {
          auditId,
          title: item.title,
          description: item.description,
          severity: item.severity,
          status: item.status,
          // Create related records in same transaction
          evidence: {
            create: item.evidence?.map(e => ({
              description: e.description,
              documentId: e.documentId
            })) || []
          },
          recommendations: {
            create: item.recommendations?.map(r => ({
              description: r.description,
              priority: r.priority
            })) || []
          }
        }
      });
    }
    
    return payload;
  });
}
```

---

## Step-by-Step Example

### Complete Flow: Creating Step 1-1 (Client Basic Information)

#### 1. Define TypeScript Configuration

**File:** `backend/src/config/steps/phase1/step1.config.ts`

```typescript
export const Phase1Step1Config: StepConfig = {
  stepKey: '1-1',
  phaseId: 1,
  stepId: 1,
  stepName: 'Client Basic Information',
  description: 'Capture essential client details',
  
  formSchema: {
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Client Name',
        validation: { required: true, minLength: 3, maxLength: 100 }
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        validation: { required: true, email: true }
      },
      {
        name: 'industry',
        type: 'select',
        label: 'Industry',
        options: ['Technology', 'Finance', 'Healthcare'],
        validation: { required: true }
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
      model: 'client',
      transactional: false
    }
  }
};
```

#### 2. Register in Step Registry

**File:** `backend/src/config/step-registry.ts`

```typescript
private registerSteps(): void {
  this.register(Phase1Step1Config);  // ← Add this line
}
```

#### 3. System Automatically Handles:

✅ **Metadata Endpoint:** GET `/api/metadata/phases/1/steps/1`
- Returns formSchema for frontend to build form

✅ **Data Fetch Endpoint:** GET `/api/audits/:auditId/phases/1/steps/1`
- Uses `prisma-simple` strategy to fetch client data

✅ **Data Save Endpoint:** POST `/api/audits/:auditId/phases/1/steps/1`
- Validates payload against formSchema
- Uses `prisma-upsert` strategy to save client data

✅ **Frontend Form Rendering:**
- DynamicFormComponent builds form from formSchema
- Creates validators from field.validation rules
- Handles submission and error display

#### 4. NO Additional Code Required!

You **DO NOT** need to create:
- ❌ ClientFormComponent
- ❌ ClientController
- ❌ ClientService
- ❌ Client routes

All handled by existing generic components!

---

## TypeScript Config vs Database Config

### Current Architecture

**TypeScript configs** are the **source of truth**:
- Loaded at application startup
- Type-safe with IDE support
- Version controlled

**Database table** `StepConfiguration`:
- Stores the SAME data as JSON
- Can be synced from TypeScript configs via seed script
- Future: Allow runtime updates by admin users

### Ensuring They Match

**Seed Script:** `backend/prisma/sync-step-configs.ts`

```typescript
// Reads TypeScript configs
const allSteps = stepRegistry.getAllSteps();

// Upserts to database
for (const step of allSteps) {
  await prisma.stepConfiguration.upsert({
    where: { stepKey: step.stepKey },
    update: {
      formSchema: step.formSchema,
      dataConfig: step.dataConfig,
      // ... all fields
    },
    create: {
      stepKey: step.stepKey,
      phaseId: step.phaseId,
      // ... all fields
    }
  });
}
```

**Verification:**
```bash
npm run prisma:seed
# Syncs TypeScript → Database
# Your attached JSON should match TypeScript configs exactly!
```

---

## Summary

### The Power of Metadata-Driven Architecture

**Instead of 80 × N files, you have:**
- 1 × Controller (StepController)
- 1 × Service (StepService)
- 1 × Form Component (DynamicFormComponent)
- 80 × Config Files (step1.config.ts, step2.config.ts, ...)

**To add a new step:**
1. Create config file (copy existing template)
2. Define formSchema (what fields)
3. Define dataConfig (how to fetch/save)
4. Register in step-registry.ts
5. Done! ✅

**The system automatically:**
- ✅ Renders the form
- ✅ Validates the data (client + server)
- ✅ Fetches data using configured strategy
- ✅ Saves data using configured strategy
- ✅ Tracks step completion status
- ✅ Enforces step dependencies

### Key Takeaways

1. **Configuration is King:** Everything is driven by `StepConfig` objects
2. **Generic Components:** One component renders ALL steps
3. **Strategy Pattern:** Fetch/save strategies handle different data patterns
4. **Type Safety:** TypeScript provides compile-time checks
5. **Validation:** Multi-layer validation ensures data integrity
6. **Extensibility:** Add new steps without changing core code

---

## Next Steps

To fully understand:
1. ✅ Read this document
2. 🔍 Trace one request through the codebase (follow Step 1-2 example)
3. 🧪 Try adding a new step (copy step1.config.ts as template)
4. 📊 Review the database schema (`prisma/schema.prisma`)
5. 🎨 Inspect the dynamic form component (`dynamic-form.component.ts`)

Questions? Look at:
- `step.service.ts` - orchestrates everything
- `validation.service.ts` - handles all validation
- `dynamic-form.component.ts` - renders forms
- `step-registry.ts` - loads configurations
