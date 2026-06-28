# Dependencies Quick Reference Guide

## What Are Dependencies?

Dependencies tell the system **what data a step needs from other steps** to validate correctly.

Think of it like this:
- **Without dependencies:** Each validator queries the database separately (slow)
- **With dependencies:** System loads all needed data once (fast)

---

## How to Define Dependencies in Step Config

### Basic Structure

```typescript
export const MyStepConfig: StepConfig = {
  stepKey: '2-3',
  phaseId: 2,
  stepId: 3,
  stepName: 'My Step',
  
  dependencies: {
    // Steps that MUST be completed before this step
    requiredSteps: ['1-1', '2-1'],
    
    // Optional: Steps that provide useful data but aren't required
    optionalSteps: ['1-3'],
    
    // Fields needed from each step with HYBRID STRATEGY
    dataReferences: {
      // Option 1: Always pre-load (small datasets)
      '1-1': {
        fields: ['name', 'email', 'industry'],
        strategy: 'preload'  // Always loads into memory
      },
      
      // Option 2: Adaptive (auto-decide based on size)
      '2-1': {
        fields: ['id'],
        strategy: 'auto',     // Pre-load if < 100, else direct DB
        threshold: 100        // Threshold for decision
      },
      
      // Option 3: Old format (defaults to 'auto')
      '2-2': ['id', 'title']  // Backward compatible
    }
  },
  
  // ... rest of config
};
```

### Hybrid Validation Strategies

The system uses **three strategies** to optimize memory and performance:

| Strategy | When to Use | How It Works | Memory Impact |
|----------|-------------|--------------|---------------|
| **preload** | Always small (< 100 records) | Loads all data into memory | Small (KB) |
| **auto** | Variable size | Checks count, decides at runtime | Adaptive |
| **direct-db** | Always large (> 1000 records) | Validators query DB directly | Minimal (bytes) |
| **foreign-key** | Simple ID validation | DB constraints handle it | None |

**Example scenarios:**
- **Client** (1 record): Use `preload` → loads ~1 KB
- **Documents** (50 records): Use `auto` → pre-loads ~500 bytes
- **Documents** (500 records): Use `auto` → switches to direct DB queries
- **Findings** (10,000 records): Use `direct-db` → no pre-loading, minimal memory

**Default:** If no strategy specified, uses `auto` with threshold of 100 records.

---

## Real Examples

### Example 1: Simple Dependency (Step 1-2)

**Scenario:** Entity Selection needs client to exist

```typescript
// Step 1-2: Entity & Contact Selection
dependencies: {
  requiredSteps: ['1-1'],  // Client must be created first
  dataReferences: {
    '1-1': {
      fields: ['id', 'name'],
      strategy: 'preload'  // Always 1 record
    }
  }
}
```

**What happens:**
1. User tries to access Step 1-2
2. System checks: Is Step 1-1 completed? ✅ Yes → Allow access
3. When validating, system loads client data from Client table (1 record)
4. Validator can use `context.dependencyData.get('1-1')` to check client

---

### Example 2: Multiple Dependencies with Hybrid Strategy (Step 2-3)

**Scenario:** Findings need client info AND documents (which could be large)

```typescript
// Step 2-3: Audit Findings
dependencies: {
  requiredSteps: ['1-1', '2-1'],
  dataReferences: {
    // Client: Always small, pre-load all fields
    '1-1': {
      fields: ['name', 'email', 'industry'],
      strategy: 'preload'
    },
    // Documents: Could be 10 or 10,000 - use adaptive
    '2-1': {
      fields: ['id'],      // Only need ID for validation
      strategy: 'auto',     // Decide based on count
      threshold: 100        // Pre-load if < 100
    }
  }
}
```

**What happens:**
1. System checks both steps are completed
2. Loads client data (always pre-loaded)
3. Counts documents:
   - If < 100 documents: Pre-loads IDs into memory
   - If >= 100 documents: Marks for direct DB validation
4. Validator adapts its strategy based on what was loaded

---

### Example 3: Optional Dependencies

**Scenario:** Risk Assessment benefits from previous risk but doesn't require it

```typescript
// Step 1-3: Risk Assessment
dependencies: {
  requiredSteps: [],  // No required dependencies
  optionalSteps: ['1-3'],  // Previous risk assessment (if exists)
  dataReferences: {
    '1-3': ['riskLevel', 'riskScore']  // Previous risk data
  }
}
```

**What happens:**
1. No required steps, so user can access immediately
2. System tries to load previous risk assessment (if it exists)
3. Validator can compare: "Did risk increase?"

---

## How Validators Use Dependencies (Hybrid Approach)

### Before (Slow - N+1 Problem)

```typescript
// Validator queries database directly
private myValidator: AsyncValidator = async (payload, context) => {
  // ❌ Database query #1
  const client = await prisma.client.findUnique({ 
    where: { auditId: context.auditId } 
  });
  
  // ❌ Database query #2 - could be 10,000+ records!
  const documents = await prisma.document.findMany({ 
    where: { auditId: context.auditId } 
  });
  
  // Validate using client and documents
  // Problem: Loads all data every time, wastes memory
};
```

**Problems:**
- Multiple database queries (slow)
- Loads all data into memory (memory inefficient for large datasets)

---

### After (Fast & Memory Efficient - Hybrid)

```typescript
// Validator uses pre-loaded context with adaptive strategy
private myValidator: AsyncValidator = async (payload, context) => {
  // ✅ Get client data (always pre-loaded, 1 record)
  const clientData = context.dependencyData.get('1-1');
  
  // ✅ Check which strategy was used for documents
  const docStrategy = context.dependencyStrategies.get('2-1');
  const docData = context.dependencyData.get('2-1');
  
  if (docStrategy.strategy === 'preloaded') {
    // Small dataset: Use pre-loaded IDs (NO additional DB query)
    const validDocIds = docData.items.map(doc => doc.id);
    if (!validDocIds.includes(payload.documentId)) {
      return 'Invalid document reference';
    }
  } else if (docStrategy.strategy === 'direct-db') {
    // Large dataset: Query DB directly (memory efficient)
    const exists = await prisma.document.findUnique({
      where: { id: payload.documentId },
      select: { id: true }
    });
    if (!exists) {
      return 'Invalid document reference';
    }
  }
  // foreign-key: No validation needed, DB handles it
  
  return null;  // Valid
};
```

**Benefits:**
- Client data pre-loaded (always small)
- Document validation adapts to dataset size
- Memory efficient for large datasets
- Still fast for small datasets

---

## Step-to-Table Mapping

When you specify dependencies, the system knows which database table to query:

| Step Key | Database Table(s) | What Gets Loaded |
|----------|------------------|------------------|
| `1-1` | `Client` | Client basic info |
| `1-2` | `Client` + `Entity` + `Contact` | Client with entities and contacts |
| `1-3` | `RiskAssessment` | Risk assessment data |
| `2-1` | `Document` | Uploaded documents |
| `2-2` | `ChecklistItem` | Checklist items |
| `2-3` | `Finding` + `Evidence` | Findings with evidence |

This mapping is defined in `ValidationContextService.loadDependencyDataFromDomainTables()`

---

## Common Patterns

### Pattern 1: Linear Dependency Chain

```
Step 1-1 (Client)
    ↓
Step 1-2 (Entity) - requires 1-1
    ↓
Step 1-3 (Risk) - requires 1-2
```

**Configs:**
```typescript
// Step 1-1: No dependencies
dependencies: {}

// Step 1-2: Needs client
dependencies: {
  requiredSteps: ['1-1'],
  dataReferences: { '1-1': ['id', 'name'] }
}

// Step 1-3: Needs entity
dependencies: {
  requiredSteps: ['1-2'],
  dataReferences: { '1-2': ['selectedEntityId'] }
}
```

---

### Pattern 2: Multiple Independent Dependencies

```
Step 1-1 (Client) ────┐
                      ├──→ Step 2-3 (Findings)
Step 2-1 (Documents) ─┘
```

**Config:**
```typescript
// Step 2-3: Needs both client AND documents
dependencies: {
  requiredSteps: ['1-1', '2-1'],
  dataReferences: {
    '1-1': ['name', 'industry'],
    '2-1': ['items']
  }
}
```

---

### Pattern 3: Historical Reference (Same Step)

```
Step 1-3 (Current Risk)
    ↑
Step 1-3 (Previous Risk) - optional reference to itself
```

**Config:**
```typescript
// Can reference previous execution of same step
dependencies: {
  optionalSteps: ['1-3'],  // Previous risk assessment
  dataReferences: {
    '1-3': ['riskLevel', 'assessedAt']
  }
}
```

---

## Checklist: Adding Dependencies to a Step

- [ ] **Identify what data you need from other steps**
      - Do you validate against documents? Add `'2-1'`
      - Do you need client info? Add `'1-1'`
      - Do you compare with previous assessment? Add that step

- [ ] **Determine if they're required or optional**
      - `requiredSteps`: User CANNOT access this step until these are completed
      - `optionalSteps`: Nice to have, but not blocking

- [ ] **List the specific fields you need**
      ```typescript
      dataReferences: {
        '1-1': ['name', 'email', 'industry'],
        '2-1': ['items']
      }
      ```

- [ ] **Add to step config**
      ```typescript
      dependencies: {
        requiredSteps: ['...'],
        dataReferences: { ... }
      }
      ```

- [ ] **Create/update validator to use context**
      ```typescript
      const data = context.dependencyData.get('1-1');
      ```

- [ ] **Test the flow**
      - Try accessing step before dependencies complete (should fail)
      - Try with valid dependencies (should work)
      - Check validator uses pre-loaded data

---

## Debugging Tips

### Problem: "Required steps not completed"

**Error:**
```
Cannot proceed. Required steps not completed: 1-1
```

**Solution:**
Check `AuditStepStatus` table:
```sql
SELECT stepKey, status FROM AuditStepStatus 
WHERE auditId = ? AND stepKey = '1-1';
```

Make sure status = `'completed'`, not `'in-progress'` or `'pending'`

---

### Problem: Validator can't find dependency data

**Error:**
```
Cannot read property 'items' of undefined
```

**Cause:** Dependency not loaded

**Solution:**
1. Check step config has `dataReferences`:
   ```typescript
   dependencies: {
     dataReferences: {
       '2-1': ['items']  // ← Is this declared?
     }
   }
   ```

2. Check data exists in database:
   ```sql
   SELECT * FROM Document WHERE auditId = ?;
   ```

3. Check step key matches:
   ```typescript
   const data = context.dependencyData.get('2-1');  // Exact match!
   ```

---

### Problem: Validation is slow

**Symptom:** Step save takes 2-3 seconds

**Check:**
1. Are validators querying database directly? (They shouldn't!)
2. Look for `await prisma.` inside validators
3. Should use `context.dependencyData.get()` instead

**Fix:** Update validator to use pre-loaded context

---

## Summary

**Dependencies = Configuration that tells the system:**
1. Which steps must be completed first
2. What data to pre-load from domain tables
3. Which fields are needed for validation

**System automatically:**
- ✅ Checks required steps are completed
- ✅ Queries domain tables in parallel
- ✅ Pre-loads all data into memory
- ✅ Passes to validators

**Validators:**
- ✅ Use `context.dependencyData.get('step-key')`
- ✅ Never query database directly
- ✅ Fast and efficient

**Result:**
- 🚀 Fast validation (2-3 queries max)
- 🎯 No N+1 problem
- 🏗️ Clean architecture
- 📊 Domain tables as source of truth
