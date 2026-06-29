# Actual System Architecture - CORRECTED

## ❗ Important Clarification

The system uses a **HYBRID ARCHITECTURE** - NOT purely TypeScript or purely Database.

---

## 🎯 What Loads From Where

### Backend: Loads from TypeScript

```typescript
// backend/src/services/metadata-registry.service.ts

public getFormSchema(phaseId: number, stepId: number) {
  const config = stepRegistry.getConfig(phaseId, stepId); // ← TypeScript!
  return {
    formSchema: config.formSchema,      // Form fields & validation
    stepName: config.stepName,
    description: config.description
    // NOTE: dependencies field is NOT returned!
  };
}
```

**What Backend Uses TypeScript For:**
- ✅ Form schemas (`formSchema`)
- ✅ Validation rules (`validation`)
- ✅ Fetch strategies (`dataConfig.fetch`)
- ✅ Save strategies (`dataConfig.save`)
- ✅ Business rules (`businessRules`)

**Why:** Type safety, IDE autocomplete, compile-time validation

---

### Frontend: Loads from Database

```typescript
// frontend/src/app/features/audit/services/metadata.service.ts

// Load all phases and steps
GET /api/metadata/phases
  → Queries: prisma.stepConfiguration.findMany()
  → Returns: List of all phases with their steps

// Load audit progress
GET /api/metadata/audits/:auditId/progress
  → Queries: prisma.auditStepStatus.findMany()
  → Returns: Which steps are pending/in-progress/completed/blocked

// Frontend enforces dependencies via:
isStepAvailable(stepKey: string) {
  // Checks step status, NOT config dependencies!
  const progress = this.getStepProgress(stepKey);
  
  // Rules:
  // - Step 1-1 always available
  // - Other steps: previous step must be completed
  // - First step of new phase: all previous phase steps must be completed
  
  // Does NOT check config.dependencies.requiredSteps!
}
```

**What Frontend Uses Database For:**
- ✅ Phase list (`PhaseConfiguration` table)
- ✅ Step list (`StepConfiguration` table)
- ✅ Step completion status (`AuditStepStatus` table)
- ✅ Dependency enforcement (via status tracking, NOT config dependencies)

**Why:** Runtime data varies per audit; status must be persisted

---

## 🔄 The Sync Process

### Development Workflow

```
1. Developer creates/edits TypeScript config
   └─ backend/src/config/steps/phase1/step1.config.ts

2. Developer runs sync command
   └─ npm run sync:steps

3. Sync script loads TypeScript configs
   └─ backend/prisma/sync-step-configs.ts

4. Sync script writes to database
   └─ INSERT/UPDATE StepConfiguration table

5. Frontend now sees updated step list
   └─ GET /api/metadata/phases returns new config
```

### Why Sync?

**TypeScript configs define the "template":**
- What fields exist
- What validation rules apply
- How to fetch/save data

**Database tracks the "runtime state":**
- Which steps exist (from TypeScript sync)
- Which steps are completed (per audit)
- Step status (pending/completed/blocked)

---

## 🤔 Why NOT Load Everything from Database?

You might ask: "Why not load form schemas from database too?"

**Answer: Type Safety**

```typescript
// TypeScript approach (current)
const config: StepConfig = stepRegistry.getConfig(1, 1);
config.formSchema.fields[0].name  // ← IDE autocomplete!
config.formSchema.fields[0].type  // ← Type: FieldType
// Compile error if structure is wrong ✅

// Database approach (if we switched)
const config = await prisma.stepConfiguration.findUnique(...);
const fields = (config.formSchema as any).fields;  // ← No type safety!
fields[0].name  // ← No autocomplete, runtime errors possible ❌
```

**Benefits of TypeScript Loading:**
- Compile-time type checking
- IDE autocomplete
- Refactoring support
- No JSON parsing errors at runtime

---

## 📊 Data Flow Example

### User Loads Step 1-2

```
1. Frontend: GET /api/metadata/phases
   Backend queries: prisma.stepConfiguration.findMany()
   Returns: [{ stepKey: "1-1", stepName: "Client" }, { stepKey: "1-2", ... }]
   Frontend now knows: Step 1-2 exists ✅

2. Frontend: GET /api/metadata/audits/1/progress
   Backend queries: prisma.auditStepStatus.findMany({ where: { auditId: 1 } })
   Returns: [{ stepKey: "1-1", status: "completed" }, { stepKey: "1-2", status: "pending" }]
   Frontend now knows: Step 1-1 is done, 1-2 is available ✅

3. Frontend checks: isStepAvailable("1-2")
   Logic: Previous step 1-1 is completed? Yes → Available ✅

4. Frontend: GET /api/metadata/phases/1/steps/2
   Backend loads: stepRegistry.getConfig(1, 2) ← TypeScript!
   Returns: { formSchema: { fields: [...] } }
   Frontend renders: Form fields from schema ✅

5. User fills form and submits
   Frontend: POST /api/audits/1/phases/1/steps/2
   Backend loads: stepRegistry.getConfig(1, 2) ← TypeScript again!
   Backend validates: Against formSchema from TypeScript
   Backend saves: Using dataConfig.save strategy from TypeScript
   Backend updates: AuditStepStatus → status = "completed" ✅

6. Frontend: GET /api/metadata/audits/1/progress (refresh)
   Now shows: Step 1-2 completed, Step 1-3 available ✅
```

---

## 🔍 Common Misconceptions

### ❌ Misconception 1: "Frontend loads dependencies from config"

**Reality:** Frontend does NOT use `config.dependencies.requiredSteps`

```typescript
// This field exists in TypeScript configs
dependencies: {
  requiredSteps: ['1-1', '1-2']  // ← Backend uses for validation
}

// But frontend enforces dependencies via status tracking:
isStepAvailable("2-1") {
  // Checks: Is step 1-3 completed?
  // Does NOT check: config.dependencies.requiredSteps
}
```

**Where `config.dependencies` IS used:**
- ✅ Backend validation (loading data from previous steps)
- ✅ Backend cross-step validation
- ❌ NOT frontend dependency enforcement

---

### ❌ Misconception 2: "All configs load from database"

**Reality:** Backend loads schemas from TypeScript; Database is for tracking only

```
Backend:
  FormSchema ← TypeScript stepRegistry ✅
  Validation rules ← TypeScript stepRegistry ✅
  Fetch/save strategies ← TypeScript stepRegistry ✅

Database:
  Step list ← StepConfiguration table ✅
  Step status ← AuditStepStatus table ✅
  Phase list ← PhaseConfiguration table ✅
```

---

### ❌ Misconception 3: "Database has different dependencies than TypeScript"

**Reality:** They SHOULD match (after sync), but frontend doesn't use them anyway!

```
TypeScript Config:
  dependencies: { requiredSteps: ['1-1'] }
      ↓ npm run sync:steps
Database Record:
  dependencies: { "requiredSteps": ["1-1"] }  ← Same structure!

Frontend:
  ← Does NOT read this field at all!
  Uses status-based flow instead
```

---

## 🎯 Summary Table

| Component | Loads From | Used For | Why |
|-----------|-----------|----------|-----|
| **Backend: Form Schemas** | TypeScript | Field definitions, validation | Type safety |
| **Backend: Data Config** | TypeScript | Fetch/save strategies | Type safety |
| **Backend: Dependencies** | TypeScript | Cross-step validation | Type safety |
| **Frontend: Phase/Step List** | Database | UI navigation | Per-audit data |
| **Frontend: Step Status** | Database | Dependency enforcement | Runtime state |
| **Frontend: Dependency Logic** | ❌ NOT from config | Status-based flow | Simpler logic |

---

## 🚀 Why This Hybrid Approach?

### Best of Both Worlds

**TypeScript:**
- ✅ Type safety during development
- ✅ Compile-time error catching
- ✅ IDE support (autocomplete, refactoring)
- ✅ Version control with code

**Database:**
- ✅ Runtime flexibility per audit
- ✅ Step status persistence
- ✅ Progress tracking
- ✅ Admin can enable/disable steps

### Future Enhancements

**Could load form schemas from database IF:**
- Admin UI for editing schemas
- Schema versioning system
- Runtime validation of JSON structure
- Type generation from database schema

**But for now:** TypeScript provides better DX (Developer Experience)

---

## 📝 Key Takeaways

1. **Backend loads form schemas from TypeScript** (type safety)
2. **Frontend loads step lists from database** (runtime data)
3. **Frontend enforces dependencies via status tracking** (NOT config.dependencies field)
4. **Sync script keeps TypeScript & Database in sync** (npm run sync:steps)
5. **Hybrid architecture = Type safety + Runtime flexibility**

---

## 🛠️ How to Verify This Yourself

### Check Backend Loading Source

```bash
# Search for where getConfig is called
grep -r "stepRegistry.getConfig" backend/src/

# You'll find it loads from TypeScript step-registry.ts
# NOT from database queries
```

### Check Frontend Dependency Logic

```bash
# Look at isStepAvailable method
grep -A 20 "isStepAvailable" frontend/src/app/features/audit/services/metadata.service.ts

# You'll see it checks:
# - getStepProgress() ← Database (AuditStepStatus)
# - NOT config.dependencies.requiredSteps
```

### Check Sync Script

```bash
# See how TypeScript configs are synced to database
cat backend/prisma/sync-step-configs.ts

# Loads: stepRegistry.getAllSteps()
# Writes: prisma.stepConfiguration.upsert(...)
```

---

That's the actual architecture! TypeScript for schemas, Database for runtime tracking. 🎉
