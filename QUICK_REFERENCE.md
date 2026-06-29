# Quick Reference Card - Actual Architecture

## 🎯 What Loads From Where?

### Backend Runtime

| Component | Source | File/Table | Purpose |
|-----------|--------|------------|---------|
| **Form Schemas** | TypeScript | `step-registry.ts` | Type-safe field definitions |
| **Validation Rules** | TypeScript | `step-registry.ts` | Compile-time validation |
| **Fetch Strategies** | TypeScript | `step-registry.ts` | Data loading logic |
| **Save Strategies** | TypeScript | `step-registry.ts` | Data persistence logic |
| **Business Rules** | TypeScript | `step-registry.ts` | Custom validators |

### Frontend Runtime

| Component | Source | API Endpoint | Purpose |
|-----------|--------|--------------|---------|
| **Phase List** | Database | `GET /api/metadata/phases` | Available phases |
| **Step List** | Database | `GET /api/metadata/phases` | Available steps |
| **Step Status** | Database | `GET /api/metadata/audits/:id/progress` | Completed/pending/blocked |
| **Form Schema** | TypeScript (via backend) | `GET /api/metadata/phases/:p/steps/:s` | Field definitions |

---

## 🔄 Dependency Enforcement

### ❌ What Frontend Does NOT Use

```typescript
// This exists in TypeScript configs
dependencies: {
  requiredSteps: ['1-1', '1-2']  // ← Frontend IGNORES this!
}
```

### ✅ What Frontend Actually Uses

```typescript
// Frontend enforces sequential flow via status tracking
isStepAvailable(stepKey: string) {
  // Rule 1: Step 1-1 always available
  if (stepKey === '1-1') return true;
  
  // Rule 2: Other steps in same phase → previous step must be completed
  if (stepId > 1) {
    const prevStep = `${phaseId}-${stepId-1}`;
    const prevStatus = getStepProgress(prevStep);
    return prevStatus?.status === 'completed';
  }
  
  // Rule 3: First step of new phase → ALL previous phase steps completed
  if (phaseId > 1 && stepId === 1) {
    const prevPhaseSteps = getAllStepsInPhase(phaseId - 1);
    return prevPhaseSteps.every(s => s.status === 'completed');
  }
}
```

**Source:** `AuditStepStatus` table, NOT `config.dependencies`

---

## 📊 Data Flow Visualization

### User Submits Step 1-2

```
1. Frontend validates form (Angular validators from formSchema)
   ↓
2. POST /api/audits/1/phases/1/steps/2
   ↓
3. Backend: stepRegistry.getConfig(1, 2) ← TypeScript!
   ↓
4. Backend validates payload against config.formSchema
   ↓
5. Backend saves using config.dataConfig.save strategy
   ↓
6. Backend updates: AuditStepStatus → status = 'completed'
   ↓
7. Frontend refreshes: GET /api/metadata/audits/1/progress
   ↓
8. Frontend checks: isStepAvailable('1-3')
   ↓
   Logic: Step 1-2 completed? Yes → Step 1-3 available ✅
```

---

## 🔧 Common Commands

### Sync TypeScript → Database

```bash
cd backend
npm run sync:steps
```

**What it does:**
- Loads all configs from TypeScript `step-registry.ts`
- Writes to `StepConfiguration` table in database
- Frontend can now see updated step list

### Initialize Audit Step Statuses

```bash
cd backend
npm run fix:step-statuses
```

**What it does:**
- Creates `AuditStepStatus` records for all active steps
- Sets initial status to 'pending'
- Required for new audits

### Verify Setup

```bash
cd backend
npm run verify:steps
```

**What it does:**
- Compares TypeScript configs vs Database records
- Shows missing/extra configs
- Verifies sync is up to date

---

## 🐛 Debugging Guide

### Frontend: "Step shows as available but shouldn't be"

**Check:** `AuditStepStatus` table
```sql
SELECT stepKey, status, completedAt
FROM "AuditStepStatus"
WHERE auditId = 1
ORDER BY phaseId, stepId;
```

**Issue:** Status might be incorrectly set to 'completed'

**Fix:** Update status or re-run `npm run fix:step-statuses`

---

### Backend: "Validation rules not working"

**Check:** TypeScript config file
```typescript
// backend/src/config/steps/phase1/step1.config.ts
formSchema: {
  fields: [
    {
      name: 'email',
      validation: {
        required: true,  // ← Is this set?
        email: true      // ← Is this set?
      }
    }
  ]
}
```

**Issue:** Validation rules might be missing in TypeScript config

**Fix:** Edit TypeScript config, restart backend

---

### Frontend: "Step list not showing new step"

**Check:** Did you sync configs?
```bash
npm run sync:steps
```

**Issue:** Database doesn't have new step yet

**Fix:** Run sync command, restart backend

---

## 📝 File Locations

### TypeScript Configs
```
backend/src/config/
  ├── step-registry.ts              ← Loads all configs
  ├── types/step-config.types.ts    ← TypeScript interfaces
  └── steps/
      ├── phase1/
      │   ├── step1.config.ts
      │   ├── step2.config.ts
      │   └── step3.config.ts
      └── phase2/
          ├── step1.config.ts
          ├── step2.config.ts
          └── step3.config.ts
```

### Database Schema
```
backend/prisma/
  ├── schema.prisma                 ← Defines tables
  ├── seed.ts                       ← Seeds initial data
  └── sync-step-configs.ts          ← Syncs TypeScript → DB
```

### Frontend Services
```
frontend/src/app/features/audit/
  └── services/
      └── metadata.service.ts       ← Loads from database, checks statuses
```

---

## 🎯 Key Principles

1. **TypeScript = Development Source**
   - Edit configs here during development
   - Type-safe, autocomplete, refactorable

2. **Database = Runtime State**
   - Stores step lists (synced from TypeScript)
   - Tracks which steps are completed per audit
   - Enables/disables steps dynamically

3. **Sync Keeps Them Aligned**
   - `npm run sync:steps` writes TypeScript → Database
   - Run after editing TypeScript configs

4. **Frontend Uses Status Tracking**
   - Does NOT read `config.dependencies` field
   - Enforces sequential flow via `AuditStepStatus`

---

## ✅ Quick Verification Checklist

- [ ] TypeScript configs define form schemas
- [ ] Backend loads from `step-registry.ts`
- [ ] Database has matching `StepConfiguration` records (via sync)
- [ ] Frontend loads step lists from database
- [ ] Frontend enforces dependencies via `AuditStepStatus`
- [ ] Frontend does NOT use `config.dependencies.requiredSteps`

If all checked, you understand the architecture! ✨
