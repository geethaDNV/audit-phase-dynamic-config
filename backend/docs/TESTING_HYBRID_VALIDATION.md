# Testing Hybrid Validation Strategy

## 🔄 Do You Need to Drop and Recreate the Database?

**NO - Schema hasn't changed!** ✅

The hybrid validation strategy is a **runtime optimization** that doesn't require schema changes:
- Same database tables (Client, Document, Finding, etc.)
- Same columns and relationships
- Same foreign keys

**What Changed:** Only the TypeScript code that decides HOW to load data (pre-load vs direct DB).

### Quick Update Steps

```bash
# 1. Navigate to backend
cd backend

# 2. Rebuild TypeScript (to compile new types)
npm run build

# 3. Restart your server
npm run dev
```

**Optional:** If you want fresh test data, you can run:
```bash
npx prisma migrate reset --force
npm run seed
```

---

## 🧪 Testing Scenarios

### Scenario 1: Small Dataset (Pre-load Strategy)

**Goal:** Verify that small datasets (< 100 records) are pre-loaded into memory.

#### Setup
1. Create a new audit with minimal data:
   - 1 Client
   - 5 Entities
   - 10 Documents
   - 2 Findings

#### Steps
1. **Create Client** (Step 1-1)
   ```bash
   POST /api/step/save
   {
     "auditId": 1,
     "phaseId": 1,
     "stepId": 1,
     "data": {
       "name": "Small Test Corp",
       "email": "test@small.com",
       "industry": "Technology"
     }
   }
   ```

2. **Add Entities** (Step 1-2)
   ```bash
   POST /api/step/save
   {
     "auditId": 1,
     "phaseId": 1,
     "stepId": 2,
     "data": {
       "entities": [
         { "name": "Entity 1", "type": "Subsidiary" },
         { "name": "Entity 2", "type": "Division" },
         { "name": "Entity 3", "type": "Branch" },
         { "name": "Entity 4", "type": "Department" },
         { "name": "Entity 5", "type": "Office" }
       ]
     }
   }
   ```

3. **Upload Documents** (Step 2-1)
   ```bash
   POST /api/step/save
   {
     "auditId": 1,
     "phaseId": 2,
     "stepId": 1,
     "data": {
       "items": [
         {
           "title": "Document 1",
           "documentType": "Financial Statement",
           "filePath": "/documents/doc1.pdf",
           "fileSize": 1024
         },
         // ... add 10 documents total
       ]
     }
   }
   ```

4. **Create Finding** (Step 2-3)
   ```bash
   POST /api/step/save
   {
     "auditId": 1,
     "phaseId": 2,
     "stepId": 3,
     "data": {
       "title": "Test Finding",
       "severity": "Medium",
       "evidence": [
         { "documentId": 1, "description": "Reference to doc 1" }
       ]
     }
   }
   ```

#### Expected Logs
```
✅ Pre-loaded 1 client(s) for audit 1
✅ Pre-loaded 10 document(s) for audit 1
```

#### Verification
- Check server logs for "Pre-loaded" messages
- Verify fast response times (< 100ms)
- No additional DB queries during validation

---

### Scenario 2: Large Dataset (Direct DB Strategy)

**Goal:** Verify that large datasets (>= 100 records) trigger direct DB validation.

#### Setup - Option A: Manual Creation (Time-Consuming)
Create an audit with:
- 1 Client
- 150+ Documents
- 10 Findings

#### Setup - Option B: Seed Script (Recommended)

**Create a seed script:** `backend/prisma/seed-large-audit.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLargeAudit() {
  console.log('🌱 Seeding large audit...');

  // 1. Create audit
  const audit = await prisma.audit.create({
    data: {
      name: 'Large Audit Test',
      type: 'External',
      startDate: new Date(),
      status: 'Planning'
    }
  });
  console.log(`✅ Created audit: ${audit.id}`);

  // 2. Create client
  const client = await prisma.client.create({
    data: {
      auditId: audit.id,
      name: 'Large Test Corp',
      email: 'test@large.com',
      industry: 'Finance'
    }
  });
  console.log(`✅ Created client: ${client.id}`);

  // 3. Create 150 documents (triggers direct DB strategy)
  const documents = [];
  for (let i = 1; i <= 150; i++) {
    documents.push({
      auditId: audit.id,
      title: `Document ${i}`,
      fileName: `doc${i}.pdf`,
      documentType: 'Financial Statement',
      fileType: 'pdf',
      fileSize: 1024 * i,
      filePath: `/documents/doc${i}.pdf`,
      uploadedAt: new Date()
    });
  }
  await prisma.document.createMany({ data: documents });
  console.log(`✅ Created 150 documents`);

  // 4. Mark steps as completed
  await prisma.auditStepStatus.createMany({
    data: [
      { auditId: audit.id, stepKey: '1-1', status: 'completed', completedAt: new Date() },
      { auditId: audit.id, stepKey: '2-1', status: 'completed', completedAt: new Date() }
    ]
  });
  console.log(`✅ Marked steps as completed`);

  console.log(`🎉 Large audit ready! Audit ID: ${audit.id}`);
}

seedLargeAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run the seed:**
```bash
npx tsx prisma/seed-large-audit.ts
```

#### Steps
1. **Create Finding with Evidence**
   ```bash
   POST /api/step/save
   {
     "auditId": <AUDIT_ID>,
     "phaseId": 2,
     "stepId": 3,
     "data": {
       "title": "Large Audit Finding",
       "severity": "High",
       "evidence": [
         { "documentId": 75, "description": "Reference to document 75" }
       ]
     }
   }
   ```

#### Expected Logs
```
⚡ Using direct DB validation for 150 document(s) (threshold: 100)
```

#### Verification
- Check logs for "Using direct DB validation" message
- Verify minimal memory usage (no 150 documents loaded)
- Response time should be reasonable (< 200ms)
- Validator queries DB directly for document ID validation

---

### Scenario 3: Threshold Testing (Auto Strategy)

**Goal:** Test the auto strategy switching at the threshold boundary.

#### Test Cases

| Documents | Expected Strategy | Log Message |
|-----------|------------------|-------------|
| 50 | preload | ✅ Pre-loaded 50 document(s) |
| 99 | preload | ✅ Pre-loaded 99 document(s) |
| 100 | direct-db | ⚡ Using direct DB validation for 100 document(s) |
| 101 | direct-db | ⚡ Using direct DB validation for 101 document(s) |
| 1000 | direct-db | ⚡ Using direct DB validation for 1000 document(s) |

#### Setup Script
Create `backend/test-threshold.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testThreshold(documentCount: number) {
  console.log(`\n📊 Testing with ${documentCount} documents`);
  
  const audit = await prisma.audit.create({
    data: {
      name: `Threshold Test (${documentCount} docs)`,
      type: 'External',
      startDate: new Date(),
      status: 'Planning'
    }
  });

  await prisma.client.create({
    data: {
      auditId: audit.id,
      name: `Test Client ${documentCount}`,
      email: `test${documentCount}@example.com`,
      industry: 'Technology'
    }
  });

  // Create documents
  const documents = Array.from({ length: documentCount }, (_, i) => ({
    auditId: audit.id,
    title: `Doc ${i + 1}`,
    fileName: `doc${i + 1}.pdf`,
    documentType: 'Financial Statement' as any,
    fileType: 'pdf',
    fileSize: 1024,
    filePath: `/documents/doc${i + 1}.pdf`,
    uploadedAt: new Date()
  }));
  await prisma.document.createMany({ data: documents });

  await prisma.auditStepStatus.createMany({
    data: [
      { auditId: audit.id, stepKey: '1-1', status: 'completed', completedAt: new Date() },
      { auditId: audit.id, stepKey: '2-1', status: 'completed', completedAt: new Date() }
    ]
  });

  console.log(`✅ Created audit ${audit.id} with ${documentCount} documents`);
  return audit.id;
}

async function runTests() {
  const testCases = [50, 99, 100, 101, 500];
  
  for (const count of testCases) {
    await testThreshold(count);
  }
  
  console.log('\n🎉 All test audits created!');
  console.log('\nNow test saving a Finding for each audit and check the logs.');
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run:**
```bash
npx tsx backend/test-threshold.ts
```

**Then test each audit:**
```bash
# For each audit ID, create a finding and observe logs
POST /api/step/save
{
  "auditId": <AUDIT_ID>,
  "phaseId": 2,
  "stepId": 3,
  "data": {
    "title": "Test Finding",
    "severity": "Medium",
    "evidence": [{ "documentId": 1, "description": "Test" }]
  }
}
```

---

### Scenario 4: Invalid Reference Testing

**Goal:** Test that validation works correctly for both strategies.

#### Test Case 1: Pre-loaded Strategy (< 100 docs)
```bash
# Create audit with 10 documents (IDs 1-10)
# Try to reference document ID 999 (doesn't exist)

POST /api/step/save
{
  "auditId": 1,
  "phaseId": 2,
  "stepId": 3,
  "data": {
    "title": "Invalid Reference Test",
    "severity": "High",
    "evidence": [
      { "documentId": 999, "description": "Invalid doc" }
    ]
  }
}
```

**Expected:**
- ❌ Error: "Invalid document ID: 999"
- Validation uses pre-loaded IDs (no DB query)

#### Test Case 2: Direct DB Strategy (>= 100 docs)
```bash
# Create audit with 150 documents (IDs 1-150)
# Try to reference document ID 999 (doesn't exist)

POST /api/step/save
{
  "auditId": 2,
  "phaseId": 2,
  "stepId": 3,
  "data": {
    "title": "Invalid Reference Test",
    "severity": "High",
    "evidence": [
      { "documentId": 999, "description": "Invalid doc" }
    ]
  }
}
```

**Expected:**
- ❌ Error: "Invalid document ID: 999"
- Validation queries DB directly

---

## 📝 What to Watch For

### Performance Logs
Enable detailed logging in `validation-context.service.ts`:

```typescript
console.log(`Strategy decision:`, {
  stepKey,
  count,
  threshold: config.threshold || this.DEFAULT_THRESHOLD,
  chosenStrategy: strategy.strategy,
  memoryImpact: strategy.strategy === 'preloaded' ? `~${count * 10} bytes` : 'minimal'
});
```

### Expected Behaviors

✅ **Small Datasets (< 100):**
- Fast validation (< 100ms)
- Pre-loaded IDs in memory
- No validator DB queries

✅ **Large Datasets (>= 100):**
- Reasonable validation time (< 200ms)
- Minimal memory usage
- Validator queries DB directly

❌ **Warning Signs:**
- Memory crashes (means pre-loading too much)
- Slow validation (> 500ms)
- N+1 queries (multiple validator queries)

---

## 🔍 Debugging Tips

### Check Strategy Selection
Add this to your Finding creation endpoint:

```typescript
const context = await validationContextService.buildValidationContext(
  stepContext,
  stepConfig.dependencies
);

// Log what was loaded
console.log('Dependency strategies:', 
  Array.from(context.dependencyStrategies.entries())
);
```

### Monitor Memory Usage
```typescript
// Before validation
const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

// After validation
const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`Memory delta: ${(memAfter - memBefore).toFixed(2)} MB`);
```

### Count DB Queries
Enable Prisma query logging in `.env`:
```
DATABASE_URL="..."
LOG_QUERIES=true
```

Then in your Prisma client setup:
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});
```

---

## ✅ Success Criteria

### Small Dataset Test (< 100 records)
- [ ] Logs show "Pre-loaded X document(s)"
- [ ] Validation completes in < 100ms
- [ ] No additional validator DB queries
- [ ] Memory usage < 1 MB

### Large Dataset Test (>= 100 records)
- [ ] Logs show "Using direct DB validation for X document(s)"
- [ ] Validation completes in < 200ms
- [ ] Memory usage < 1 MB (no mass pre-loading)
- [ ] Validator makes targeted DB queries

### Threshold Boundary Test
- [ ] 99 documents → Pre-loaded
- [ ] 100 documents → Direct DB
- [ ] 101 documents → Direct DB

### Invalid Reference Test
- [ ] Both strategies catch invalid document IDs
- [ ] Clear error messages
- [ ] No crashes or timeouts

---

## 📊 Performance Comparison

Run both scenarios and compare:

| Metric | Small (10 docs) | Large (500 docs) |
|--------|-----------------|------------------|
| Strategy | Pre-loaded | Direct DB |
| Load time | ~50ms | ~80ms (count only) |
| Validation time | ~30ms | ~150ms |
| Memory used | ~1 KB | ~1 KB |
| DB queries | 2 (load all) | 3 (count + validate) |

**Key Insight:** Large dataset uses ~same memory but slightly slower validation (acceptable trade-off).

---

## 🚀 Next Steps After Testing

Once you verify hybrid validation works:

1. **Monitor Production Usage:**
   - Track which strategy is chosen most often
   - Adjust threshold if needed (default: 100)

2. **Optimize Further:**
   - Add caching for frequently accessed data
   - Consider Redis for very large audits
   - Add query result pagination

3. **Move to Phase 1.3:**
   - Replace unsafe expression evaluator with Jexl
   - Add database indexes
   - Create metadata API endpoints

---

## 💡 Troubleshooting

### Problem: Always using preload even with 500 documents
**Cause:** Config not using new format  
**Fix:** Update config to use `{ strategy: 'auto', threshold: 100 }`

### Problem: "Cannot read property 'strategy' of undefined"
**Cause:** Missing dependencyStrategies check  
**Fix:** Add null check: `if (!strategy) return 'Data not available';`

### Problem: Slow validation with large datasets
**Cause:** Validator querying all records  
**Fix:** Ensure validator checks strategy and uses targeted queries

### Problem: Memory crash with 1000+ documents
**Cause:** Still pre-loading everything  
**Fix:** Lower threshold or use explicit `strategy: 'direct-db'`
