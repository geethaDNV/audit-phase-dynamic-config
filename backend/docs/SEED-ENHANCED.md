# Enhanced Seed Script

The seed script has been updated to automatically initialize **all** step validation dependencies when seeding the database.

## What the Seed Does Now

When you run `npm run prisma:seed`, it will:

1. **Clean existing data** (drops and recreates all tables)
2. **Create sample audits** (Audit #1 and #2)
3. **Create audit phases**
4. **Seed sample data** (clients, entities, contacts, documents, findings, etc.)
5. **✨ NEW: Create phase configurations** (8 phases from client-assessment to client-presentation)
6. **✨ NEW: Sync step configurations** (from TypeScript registry to database)
7. **✨ NEW: Compute dependencies** (auto-calculate which steps depend on each step)
8. **✨ NEW: Initialize step statuses** (creates `AuditStepStatus` records for ALL steps in ALL audits)

## Usage

### Drop and Recreate Everything

```bash
cd backend

# Drop database, run migrations, and seed
npm run db:reset

# This runs:
# 1. prisma migrate reset (drops DB + runs migrations)
# 2. prisma db seed (runs seed.ts automatically)
```

### Manual Seeding

```bash
cd backend

# Run seed manually (after migrations)
npm run prisma:seed
```

## What Gets Seeded for Step Validation

### Phase Configurations (8 phases)
- Client Assessment
- Audit Execution  
- Evidence Collection
- Risk Analysis
- Findings & Recommendations
- Quality Review
- Final Report
- Client Presentation

### Step Configurations (from TypeScript)
All steps defined in `src/config/steps/phase*/` get synced to the `StepConfiguration` table:
- Step metadata (name, description)
- Form schemas
- Data configs
- Business rules
- **Dependencies** (requiredSteps, dataReferences)

### Step Dependencies
Auto-computes:
- Forward dependencies (which steps this step requires)
- **Reverse dependencies** (which steps require this step) ← automatically calculated!

### Audit Step Statuses
For **each seeded audit**, creates `AuditStepStatus` records for **all available steps**:

**Example for Audit #1:**
```
stepKey | status
--------|--------
1-1     | pending
1-2     | pending
1-3     | pending
2-1     | pending
2-2     | pending
2-3     | pending
```

All steps start as `pending`, ready for the frontend validation to work correctly!

## Benefits

✅ **No manual initialization needed** - Everything ready after seed  
✅ **Consistent state** - All audits have complete step status records  
✅ **Frontend validation works immediately** - Steps are properly blocked/enabled  
✅ **Dependencies auto-computed** - No need to run separate scripts  
✅ **Safe to re-run** - `db:reset` drops everything and rebuilds cleanly

## Seed Output Example

```
🌱 Starting database seed...
🧹 Cleaning existing data...
📋 Creating sample audits...
✅ Created 2 audits
📊 Creating audit phases...
✅ Created audit phases
👤 Creating client data (Step 1)...
✅ Created client data
...
✅ Created findings with evidence and recommendations

📐 Creating phase configurations...
✅ Created 8 phase configurations

⚙️  Syncing step configurations from TypeScript registry...
✅ Synced 6 step configurations to database

🔗 Computing step dependencies...
✅ Updated dependencies for 5 steps

📊 Initializing step statuses for seeded audits...
   ✅ Audit #1 (Acme Corporation - Annual Financial Audit 2026): initialized 6 step statuses
   ✅ Audit #2 (TechStart Inc - Initial Assessment): initialized 6 step statuses
✅ Initialized 12 step statuses across 2 audits

✨ Database seeding completed successfully!

📊 Summary:
   Audits:              2
   Phases:              4
   Phase Configs:       8
   Step Configs:        6
   Step Statuses:       12    ← All steps initialized!
   Clients:             2
   Entities:            3
   ...
```

## Troubleshooting

### "No steps found in TypeScript registry!"

**Cause:** Step configs don't exist in `src/config/steps/`

**Fix:** Make sure you have step configuration files:
```
src/config/steps/
├── phase1/
│   ├── step1.config.ts
│   ├── step2.config.ts
│   └── step3.config.ts
└── phase2/
    ├── step1.config.ts
    ├── step2.config.ts
    └── step3.config.ts
```

### Frontend still shows validation issues

**Check:**
1. Frontend loaded the audit progress: `await metadataService.loadAuditProgress(auditId)`
2. Browser console shows step statuses loaded
3. Database has records:
   ```sql
   SELECT * FROM "AuditStepStatus" WHERE "auditId" = 1;
   ```

## Related Scripts

While the seed now does everything, these standalone scripts are still available:

```bash
# Verify step setup (diagnostic tool)
npm run verify:steps

# Fix missing step statuses (if you manually create audits)
npm run fix:step-statuses

# Sync step configs (if you add new steps without re-seeding)
npm run sync:steps

# Compute dependencies (if you change dependencies)
npm run compute-dependencies
```

## When to Re-seed

Re-run the seed when:
- ✅ Adding new step configurations
- ✅ Changing step dependencies
- ✅ Updating phase configurations
- ✅ Want fresh test data
- ✅ Database schema changes (migrations)

**Note:** Re-seeding **drops ALL data**, so only use in development!
