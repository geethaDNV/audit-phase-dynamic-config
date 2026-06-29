# Step Validation Fix - Quick Guide

## 🐛 Problem
Audit #5 shows:
- Phase 1 steps (1-1, 1-2, 1-3) are completed ✅
- Phase 2 steps (2-1, 2-2, 2-3) have NO records in `AuditStepStatus` ❌
- Frontend allows navigation to step 2-3 (skipping 2-1, 2-2) ❌

## 🔧 What Was Fixed

### 1. Frontend Validation (FIXED)
**File:** `frontend/src/app/features/audit/services/metadata.service.ts`

**Before:** When no progress record existed, `isStepAvailable()` would fall through and incorrectly return true.

**After:** Now explicitly checks:
- ✅ If no progress record exists → step NOT available (returns false)
- ✅ Step 1-1 is always available
- ✅ Other steps require previous step to be completed
- ✅ First step of new phase requires ALL previous phase steps to be completed

### 2. Missing Step Status Records
**Problem:** `AuditStepStatus` table only had records for steps that were saved, not all available steps.

**Solution:** Created scripts to:
1. Verify step configuration completeness
2. Initialize missing status records for existing audits

## 🚀 How to Fix Your Database

Run these commands in the backend folder:

```bash
cd backend

# Step 1: Verify current state
npm run verify:steps

# This will show:
# - Steps in TypeScript registry
# - Steps in StepConfiguration table
# - Missing AuditStepStatus records per audit

# Step 2: Sync TypeScript configs to database (if needed)
npm run sync:steps

# Step 3: Initialize missing step statuses
npm run fix:step-statuses

# This will create AuditStepStatus records for:
# - All steps in StepConfiguration
# - For all existing audits
# - With status = 'pending'

# Step 4: Verify everything is fixed
npm run verify:steps
```

## ✅ Expected Results After Fix

### Database - AuditStepStatus Table
For Audit #5, you should now see:

```
auditId | phaseId | stepId | stepKey | status
--------|---------|--------|---------|----------
5       | 1       | 1      | 1-1     | completed
5       | 1       | 2      | 1-2     | completed
5       | 1       | 3      | 1-3     | completed
5       | 2       | 1      | 2-1     | pending    ← NEW
5       | 2       | 2      | 2-2     | pending    ← NEW
5       | 2       | 3      | 2-3     | pending    ← NEW
```

### Frontend Behavior

1. **Step 2-1:** ✅ Enabled (all phase 1 steps completed)
2. **Step 2-2:** ❌ Disabled (2-1 not completed)
3. **Step 2-3:** ❌ Disabled (2-2 not completed)

Browser console will show:
```
[isStepAvailable] Step 2-2 is pending
[isStepAvailable] Previous step 2-1 not completed (status: pending)
```

## 🧪 Testing the Fix

### Test 1: Reload Frontend
```bash
# Refresh browser at http://localhost:4200
# Open audit #5
# Check browser console for validation logs
```

**Expected:**
- Step 2-1 button: **Enabled** (green/clickable)
- Step 2-2 button: **Disabled** (grey/not clickable)
- Step 2-3 button: **Disabled** (grey/not clickable)

### Test 2: Complete Step 2-1
1. Click on Step 2-1 (should be enabled)
2. Fill in the form
3. Click Save
4. Check that Step 2-2 is now **enabled**
5. Check that Step 2-3 is still **disabled**

### Test 3: Try to Jump Steps (Should Fail)
```bash
# Try to save step 2-3 without completing 2-1 and 2-2
curl -X POST http://localhost:3000/api/audits/5/phases/2/steps/3 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "title": "Test Finding",
      "description": "This should fail validation",
      "severity": "High",
      "category": "Financial",
      "status": "Open"
    }]
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot proceed. Required steps not completed: 2-1"
  }
}
```

## 📝 New Scripts Added

| Script | Purpose |
|--------|---------|
| `npm run verify:steps` | Check step configuration completeness |
| `npm run sync:steps` | Sync TypeScript configs to database |
| `npm run fix:step-statuses` | Initialize missing AuditStepStatus records |

## 🔄 For Future Audits

The fix ensures that:

1. **On audit load:** Frontend calls initialization endpoint
2. **Initialization endpoint:** Creates `pending` status for all steps
3. **Frontend validation:** Checks completion before allowing navigation
4. **Backend validation:** Double-checks in case frontend is bypassed

New audits will automatically get all step statuses initialized on first load.

## 🛠️ Maintenance

### When Adding New Steps
```bash
# 1. Create new step config in src/config/steps/phaseX/
# 2. Sync to database
npm run sync:steps

# 3. Update dependencies
npm run compute-dependencies

# 4. Fix existing audits (adds new step as 'pending')
npm run fix:step-statuses
```

### Debugging Step Validation
Enable verbose logging in browser console:
```typescript
// frontend/src/app/features/audit/services/metadata.service.ts
// isStepAvailable() already has console.log statements

// Look for:
// [isStepAvailable] No progress record for X-X - step not available
// [isStepAvailable] Previous step X-X not completed (status: pending)
// [isStepAvailable] Not all steps in phase X are completed
```

## 📊 Database Queries for Verification

```sql
-- Check StepConfiguration table
SELECT "stepKey", "stepName", "isActive" 
FROM "StepConfiguration" 
ORDER BY "phaseId", "stepId";

-- Check AuditStepStatus for a specific audit
SELECT "stepKey", "status", "completedAt" 
FROM "AuditStepStatus" 
WHERE "auditId" = 5
ORDER BY "phaseId", "stepId";

-- Find audits with missing step statuses
SELECT 
  a.id AS "auditId",
  a.name AS "auditName",
  COUNT(DISTINCT sc."stepKey") AS "totalSteps",
  COUNT(DISTINCT ass."stepKey") AS "initializedSteps",
  COUNT(DISTINCT sc."stepKey") - COUNT(DISTINCT ass."stepKey") AS "missingSteps"
FROM "Audit" a
CROSS JOIN "StepConfiguration" sc
LEFT JOIN "AuditStepStatus" ass 
  ON a.id = ass."auditId" AND sc."stepKey" = ass."stepKey"
WHERE sc."isActive" = true
GROUP BY a.id, a.name
HAVING COUNT(DISTINCT sc."stepKey") > COUNT(DISTINCT ass."stepKey");
```

## ✅ Validation Checklist

- [ ] Run `npm run verify:steps` - no issues reported
- [ ] All steps in StepConfiguration table
- [ ] All audits have complete AuditStepStatus records
- [ ] Frontend blocks navigation to incomplete steps
- [ ] Backend rejects saves for steps with incomplete dependencies
- [ ] Browser console shows validation logs
- [ ] Step buttons show correct enabled/disabled state
