# Complete Validation Flow Example

This document shows **exactly** how validation works with dependencies using a real example.

---

## Scenario: User Submits Step 2-3 (Findings)

### Prerequisites (Steps Already Completed)

**Step 1-1 (Client Selection) - Completed:**
```json
// Saved to Client table in database
{
  "id": 1,
  "auditId": 100,
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "industry": "Finance"
}
```

**Step 2-1 (Document Upload) - Completed:**
```json
// Saved to Document table in database
[
  {
    "id": 101,
    "auditId": 100,
    "title": "Financial Statement 2024",
    "documentType": "PDF",
    "uploadedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": 102,
    "auditId": 100,
    "title": "Tax Returns 2024",
    "documentType": "PDF",
    "uploadedAt": "2024-01-15T10:05:00Z"
  }
]
```

**AuditStepStatus table:**
```sql
auditId | stepKey | status
--------|---------|----------
100     | 1-1     | completed
100     | 2-1     | completed
```

---

## Step 1: User Submits Finding

**API Request:**
```http
POST /api/audits/100/phases/2/steps/3
Content-Type: application/json

{
  "items": [
    {
      "title": "Missing Financial Controls",
      "description": "The company lacks proper segregation of duties in their financial processes",
      "severity": "High",
      "category": "Financial",
      "status": "Open",
      "evidence": [
        {
          "documentRef": 101,  // References document from Step 2-1
          "description": "Financial statement shows irregular transactions"
        }
      ],
      "recommendations": [
        {
          "description": "Implement dual-approval process",
          "priority": "High"
        }
      ]
    }
  ]
}
```

---

## Step 2: StepService Receives Request

**Code Path: `step.service.ts`**

```typescript
async saveStepData(auditId: 100, phaseId: 2, stepId: 3, payload) {
  
  // 1. Load step configuration
  const config = metadataRegistry.getConfig(2, 3);
  
  // config contains:
  {
    stepKey: '2-3',
    dependencies: {
      requiredSteps: ['1-1', '2-1'],        // ← These must be completed
      dataReferences: {
        '1-1': ['name', 'email', 'industry'],  // ← Need client data
        '2-1': ['items']                        // ← Need document data
      }
    },
    businessRules: [
      {
        type: 'cross-step',
        validatorClass: 'DocumentReferenceValidator'  // ← Will validate documentRef
      }
    ]
  }
  
  // 2. Call validation
  await validationService.validate(
    payload,
    config.formSchema,
    { auditId: 100, phaseId: 2, stepId: 3 },
    config.dependencies  // ← Pass dependencies here!
  );
}
```

---

## Step 3: ValidationService Builds Context

**Code Path: `validation.service.ts`**

```typescript
async validate(payload, formSchema, context, dependencies) {
  
  // 1. Build ValidationContext with pre-loaded data
  const validationContext = await contextService.buildValidationContext(
    context,
    dependencies  // { requiredSteps: ['1-1', '2-1'], dataReferences: {...} }
  );
  
  // validationContext will contain ALL dependency data pre-loaded!
  
  // 2. Run validators with enriched context
  await validateBusinessRules(payload, formSchema.businessRules, validationContext);
}
```

---

## Step 4: ValidationContextService Loads Dependencies

**Code Path: `validation-context.service.ts`**

```typescript
async buildValidationContext(context, dependencies) {
  const { auditId } = context;  // auditId = 100
  
  // 1. Collect step keys to load
  const stepKeysToLoad = new Set(['1-1', '2-1']);
  // From dependencies.requiredSteps and dependencies.dataReferences
  
  // 2. Load data from DOMAIN TABLES (one batched operation)
  const dependencyData = await loadDependencyDataFromDomainTables(
    100,  // auditId
    ['1-1', '2-1']
  );
  
  // 3. Check step statuses
  const stepStatusRecords = await prisma.auditStepStatus.findMany({
    where: {
      auditId: 100,
      stepKey: { in: ['1-1', '2-1'] }
    }
  });
  // Returns: [
  //   { stepKey: '1-1', status: 'completed' },
  //   { stepKey: '2-1', status: 'completed' }
  // ]
  
  // 4. Validate required steps are completed
  // ✅ Both '1-1' and '2-1' have status = 'completed', validation passes
  
  // 5. Return enriched context
  return {
    auditId: 100,
    phaseId: 2,
    stepId: 3,
    dependencyData: Map {
      '1-1' => { name: 'Acme Corporation', email: '...', industry: 'Finance' },
      '2-1' => { items: [{ id: 101, title: '...' }, { id: 102, title: '...' }] }
    },
    stepStatuses: Map {
      '1-1' => 'completed',
      '2-1' => 'completed'
    }
  };
}
```

---

## Step 5: Load Data from Domain Tables

**Code Path: `validation-context.service.ts > loadDependencyDataFromDomainTables()`**

```typescript
async loadDependencyDataFromDomainTables(auditId: 100, stepKeys: ['1-1', '2-1']) {
  
  const dependencyData = new Map();
  
  // Execute queries IN PARALLEL
  const queries = stepKeys.map(async (stepKey) => {
    
    switch (stepKey) {
      case '1-1':  // Client data
        const client = await prisma.client.findUnique({
          where: { auditId: 100 }
        });
        // Query result:
        // {
        //   id: 1,
        //   name: 'Acme Corporation',
        //   email: 'contact@acme.com',
        //   industry: 'Finance'
        // }
        return { stepKey: '1-1', data: client };
        
      case '2-1':  // Document data
        const documents = await prisma.document.findMany({
          where: { auditId: 100 }
        });
        // Query result:
        // [
        //   { id: 101, title: 'Financial Statement 2024', ... },
        //   { id: 102, title: 'Tax Returns 2024', ... }
        // ]
        return { stepKey: '2-1', data: { items: documents } };
    }
  });
  
  const results = await Promise.all(queries);
  // ✅ Only 2 database queries total (batched in parallel)
  
  results.forEach(({ stepKey, data }) => {
    dependencyData.set(stepKey, data);
  });
  
  return dependencyData;
  // Returns: Map {
  //   '1-1' => { name: 'Acme Corporation', ... },
  //   '2-1' => { items: [{ id: 101 }, { id: 102 }] }
  // }
}
```

---

## Step 6: Validator Uses Pre-loaded Data

**Code Path: `validator-registry.ts > DocumentReferenceValidator`**

```typescript
private documentReferenceValidator: AsyncValidator = async (payload, context) => {
  
  // payload contains user submission:
  const { items } = payload;  
  // items[0].evidence[0].documentRef = 101
  
  // ✅ Get documents from pre-loaded context (NO DATABASE QUERY!)
  const documentData = context.dependencyData.get('2-1');
  
  // documentData = {
  //   items: [
  //     { id: 101, title: 'Financial Statement 2024' },
  //     { id: 102, title: 'Tax Returns 2024' }
  //   ]
  // }
  
  const validDocumentIds = documentData.items.map(doc => doc.id);
  // validDocumentIds = [101, 102]
  
  // Check each finding's evidence
  for (const finding of items) {
    if (finding.evidence) {
      for (const evidence of finding.evidence) {
        const docRef = evidence.documentRef;  // 101
        
        if (!validDocumentIds.includes(docRef)) {
          return `Evidence references invalid document ID: ${docRef}`;
        }
      }
    }
  }
  
  // ✅ Document 101 exists in the list, validation passes!
  return null;  // Valid
};
```

---

## Step 7: Validation Complete - Save to Database

Since validation passed, the system saves the finding:

```typescript
// Saved to Finding table
{
  "id": 201,
  "auditId": 100,
  "title": "Missing Financial Controls",
  "description": "...",
  "severity": "High",
  "category": "Financial",
  "status": "Open"
}

// Saved to Evidence table
{
  "id": 301,
  "findingId": 201,
  "documentId": 101,  // ← Foreign key references Document.id
  "description": "Financial statement shows irregular transactions"
}

// Saved to Recommendation table
{
  "id": 401,
  "findingId": 201,
  "description": "Implement dual-approval process",
  "priority": "High"
}

// Update AuditStepStatus
{
  "auditId": 100,
  "stepKey": "2-3",
  "status": "completed",
  "completedAt": "2024-01-15T14:30:00Z"
}
```

---

## Complete Query Summary

### Total Database Queries During Validation:

1. **Load step status** (1 query - batched):
   ```sql
   SELECT stepKey, status FROM AuditStepStatus 
   WHERE auditId = 100 AND stepKey IN ('1-1', '2-1')
   ```

2. **Load client data** (1 query - parallel):
   ```sql
   SELECT * FROM Client WHERE auditId = 100
   ```

3. **Load document data** (1 query - parallel):
   ```sql
   SELECT * FROM Document WHERE auditId = 100
   ```

**Total: 3 queries** (2 run in parallel, so effectively 2 sequential operations)

### Without Batching (Old Way):
- DocumentReferenceValidator would query documents: 1 query
- If we had 3 validators, each making a query: 3 queries
- Total: 4+ queries (N+1 problem)

---

## What Happens If Validation Fails?

### Example: User references invalid document

**Request:**
```json
{
  "items": [{
    "evidence": [{ "documentRef": 999 }]  // ❌ Document 999 doesn't exist!
  }]
}
```

**Validation Flow:**
```typescript
// Step 6: Validator runs
const validDocumentIds = [101, 102];  // From database
const docRef = 999;  // From user submission

if (!validDocumentIds.includes(999)) {
  // ❌ 999 is not in [101, 102]
  return 'Evidence references invalid document ID: 999. Document must be uploaded in Step 2-1 first.';
}
```

**API Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      "Evidence references invalid document ID: 999. Document must be uploaded in Step 2-1 first."
    ]
  }
}
```

**Database:** No data is saved (validation failed before save)

---

## What Happens If Required Step Not Completed?

### Example: User tries Step 2-3 before completing Step 2-1

**AuditStepStatus table:**
```sql
auditId | stepKey | status
--------|---------|----------
100     | 1-1     | completed
100     | 2-1     | in-progress  ❌ Not completed!
```

**Validation Flow:**
```typescript
// Step 4: Check required steps
const requiredSteps = ['1-1', '2-1'];
const stepStatuses = Map {
  '1-1' => 'completed',
  '2-1' => 'in-progress'  // ❌ Not 'completed'
};

const missingSteps = [];
requiredSteps.forEach(stepKey => {
  if (stepStatuses.get(stepKey) !== 'completed') {
    missingSteps.push(stepKey);  // Add '2-1' to missing
  }
});

if (missingSteps.length > 0) {
  throw new Error('Cannot proceed. Required steps not completed: 2-1');
}
```

**API Response:**
```json
{
  "success": false,
  "error": {
    "code": "DEPENDENCY_ERROR",
    "message": "Cannot proceed. Required steps not completed: 2-1"
  }
}
```

---

## Key Takeaways

### 1. Dependencies Declared in Config
```typescript
dependencies: {
  requiredSteps: ['1-1', '2-1'],     // Must be completed
  dataReferences: {
    '1-1': ['name', 'email'],         // Fields we need
    '2-1': ['items']
  }
}
```

### 2. System Uses Dependencies to:
- ✅ Check if required steps are completed
- ✅ Pre-load data from domain tables (batched queries)
- ✅ Build ValidationContext with all data
- ✅ Pass enriched context to validators

### 3. Validators Use Pre-loaded Data
```typescript
// NO DB QUERY - data already in context!
const documentData = context.dependencyData.get('2-1');
```

### 4. Foreign Keys Provide Extra Safety
```sql
ALTER TABLE Evidence 
ADD CONSTRAINT fk_document 
FOREIGN KEY (documentId) REFERENCES Document(id);
```

Even if validation somehow failed, database would reject invalid foreign keys.

---

## Summary

**Dependencies tell the system:**
- "This step needs data from steps 1-1 and 2-1"
- "Load client and document data before validating"

**ValidationContextService:**
- Queries domain tables for that data (batched)
- Pre-loads everything into memory
- Passes to validators

**Validators:**
- Use pre-loaded data (no additional queries)
- Validate business rules
- Return errors or null

**Result:**
- Fast validation (3 queries max, 2 in parallel)
- No N+1 query problem
- Clean architecture
- Domain tables are source of truth
