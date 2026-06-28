# Architecture Refactoring: Domain Tables as Single Source of Truth

## Problem Statement

The original implementation duplicated data in two places:
1. **Domain tables** (Client, Document, Finding, etc.) - Normalized, relational data
2. **StepData table** - JSON blob storing the same data

This caused:
- Data duplication
- Synchronization issues
- Wasted storage
- Unnecessary validation queries

## Solution

**Domain tables are now the single source of truth.**

### What Changed

#### BEFORE (Problematic)
```typescript
// User submits Step 1-1 (Client)
saveStepData(payload) {
  // 1. Save to Client table
  await prisma.client.create({ data: payload });
  
  // 2. ALSO save to StepData (duplicate!)
  await prisma.stepData.create({
    stepKey: '1-1',
    data: payload  // ❌ Same data stored twice
  });
}

// Validation queries StepData
const clientData = context.dependencyData.get('1-1'); // From StepData table
```

#### AFTER (Clean)
```typescript
// User submits Step 1-1 (Client)
saveStepData(payload) {
  // Save ONLY to Client table (single source of truth)
  await prisma.client.create({ data: payload });
  
  // StepData stores ONLY metadata (optional)
  await prisma.stepData.create({
    stepKey: '1-1',
    data: {
      submittedAt: new Date(),
      validationStatus: 'passed',
      timeSpent: 45  // ✅ Metadata only, not form data
    }
  });
}

// Validation queries domain tables
const client = await prisma.client.findUnique({ where: { auditId } }); // ✅ From Client table
```

---

## New Architecture

### 1. Domain Tables Store All Data

Each step maps to one or more domain tables:

| Step Key | Domain Tables | Purpose |
|----------|---------------|---------|
| `1-1` | `Client` | Client basic information |
| `1-2` | `Entity`, `Contact` | Client entities and contacts |
| `1-3` | `RiskAssessment` | Risk assessment data |
| `2-1` | `Document` | Document uploads |
| `2-2` | `ChecklistItem` | Checklist items |
| `2-3` | `Finding`, `Evidence`, `Recommendation` | Findings and evidence |

### 2. StepData Stores Metadata Only (Optional)

```typescript
interface StepMetadata {
  submittedAt?: Date;
  submittedBy?: string;
  validationStatus?: 'pending' | 'passed' | 'failed';
  validationErrors?: string[];
  timeSpent?: number;  // seconds
  fieldsChanged?: string[];
  isDraft?: boolean;
  uiState?: Record<string, any>;  // For autosave
}
```

**Use StepData for:**
- ✅ Submission timestamps and user tracking
- ✅ Validation audit trail
- ✅ Draft/autosave state
- ✅ UI state for dynamic forms
- ✅ Steps without domain models

**Do NOT use StepData for:**
- ❌ Storing actual form data (use domain tables)
- ❌ Cross-step validation (query domain tables)
- ❌ Reporting/analytics (use domain tables)

### 3. Validation Queries Domain Tables

```typescript
// ValidationContextService maps step keys to domain tables
async loadDependencyDataFromDomainTables(auditId: number, stepKeys: string[]) {
  const data = new Map();
  
  for (const stepKey of stepKeys) {
    switch (stepKey) {
      case '1-1':
        const client = await prisma.client.findUnique({ where: { auditId } });
        data.set('1-1', client);
        break;
        
      case '2-1':
        const documents = await prisma.document.findMany({ where: { auditId } });
        data.set('2-1', { items: documents });
        break;
    }
  }
  
  return data;
}
```

### 4. Foreign Keys Enforce Integrity

Instead of custom validators checking IDs exist, let the database handle it:

```prisma
model Evidence {
  id         Int      @id @default(autoincrement())
  findingId  Int
  documentId Int?
  
  finding  Finding   @relation(fields: [findingId], references: [id])
  document Document? @relation(fields: [documentId], references: [id])
  //                                  ↑ Foreign key constraint ensures document exists
}
```

```typescript
// Validator is simplified
try {
  await prisma.evidence.create({ data: { findingId, documentId: 101 } });
} catch (error) {
  if (error.code === 'P2003') {  // Foreign key violation
    throw new ValidationError('Referenced document does not exist');
  }
}
```

---

## Benefits

### Performance
- ✅ **50% fewer writes** - Save to one table instead of two
- ✅ **Smaller database** - No duplicated data
- ✅ **Faster queries** - Domain tables are indexed and normalized

### Data Integrity
- ✅ **Single source of truth** - No synchronization issues
- ✅ **Foreign keys enforce relationships** - Database-level constraints
- ✅ **ACID transactions** - Consistent state across related tables

### Developer Experience
- ✅ **Simpler code** - No need to keep two tables in sync
- ✅ **Better tooling** - ORM works naturally with domain models
- ✅ **Easier debugging** - Query domain tables directly

### Scalability
- ✅ **Scales to 80+ steps** - No overhead from duplicate storage
- ✅ **Easier to add steps** - Just map to domain table
- ✅ **Reporting ready** - Domain tables queryable for analytics

---

## Migration Guide

### For Existing Steps

1. **Remove StepData saves from repositories**
```typescript
// OLD
await prisma.stepData.create({ data: payload });

// NEW - save only to domain table
await prisma.client.create({ data: payload });
```

2. **Update validators to query domain tables**
```typescript
// OLD
const documentData = context.dependencyData.get('2-1'); // From StepData

// NEW
const documents = await prisma.document.findMany({ where: { auditId } }); // From Document table
```

3. **Optional: Add metadata tracking**
```typescript
await stepMetadataService.recordSubmission(auditId, phaseId, stepId, {
  stepKey: '1-1',
  submittedAt: new Date(),
  validationStatus: 'passed'
});
```

### For New Steps

1. **Create domain model** (or use existing)
2. **Map step to domain table** in `ValidationContextService.loadDependencyDataFromDomainTables()`
3. **Add foreign keys** to enforce relationships
4. **No StepData configuration needed** (unless storing metadata)

---

## Files Modified

### Core Services
- `validation-context.service.ts` - Now queries domain tables instead of StepData
- `step.service.ts` - Records metadata separately, saves to domain tables
- `step-metadata.service.ts` - NEW: Manages StepData for metadata only

### Schema
- `schema.prisma` - Updated StepData comments, made `data` field optional

### Validators
- `validator-registry.ts` - Now receives data from domain tables

---

## Backward Compatibility

For steps that don't have domain models yet:
- StepData fallback is still supported
- `loadDependencyDataFromDomainTables()` has a default case that queries StepData
- Gradual migration is possible

---

## Best Practices

### DO ✅
- Store form data in domain tables
- Use foreign keys to enforce relationships
- Query domain tables for validation
- Use StepData for metadata/audit trail only
- Add new steps by mapping to domain models

### DON'T ❌
- Duplicate data in StepData
- Use StepData for cross-step validation
- Bypass foreign key constraints
- Store large blobs in StepData
- Create circular dependencies

---

## Questions?

This refactoring eliminates unnecessary duplication while maintaining the flexibility of the metadata-driven architecture. Domain tables are now the authoritative source for all business data.
