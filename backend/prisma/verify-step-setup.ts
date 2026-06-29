/**
 * Verification Script: Check Step Configuration and Status Completeness
 * 
 * This script checks:
 * 1. Steps defined in TypeScript registry
 * 2. Steps in StepConfiguration database table
 * 3. AuditStepStatus records for each audit
 * 4. Missing initializations
 * 
 * Run: npx ts-node prisma/verify-step-setup.ts
 */

import { PrismaClient } from '@prisma/client';
import { stepRegistry } from '../src/config/step-registry';

const prisma = new PrismaClient();

async function verifyStepSetup() {
  console.log('🔍 STEP CONFIGURATION VERIFICATION\n');
  console.log('='.repeat(60));
  
  // 1. Check TypeScript registry
  console.log('\n1️⃣  TypeScript Step Registry:\n');
  const tsSteps = stepRegistry.getAllSteps();
  
  if (tsSteps.length === 0) {
    console.error('❌ No steps found in TypeScript registry!');
    console.log('   Check: src/config/steps/phase*/*.config.ts\n');
  } else {
    console.log(`✅ Found ${tsSteps.length} steps in TypeScript registry:\n`);
    tsSteps.forEach(step => {
      console.log(`   [${step.stepKey}] ${step.stepName}`);
      if (step.dependencies?.requiredSteps) {
        console.log(`      └─ Requires: ${step.dependencies.requiredSteps.join(', ')}`);
      }
    });
    console.log('');
  }
  
  // 2. Check StepConfiguration database table
  console.log('\n2️⃣  StepConfiguration Database Table:\n');
  const dbSteps = await prisma.stepConfiguration.findMany({
    select: {
      stepKey: true,
      stepName: true,
      isActive: true,
      phaseId: true,
      stepId: true
    },
    orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
  });
  
  if (dbSteps.length === 0) {
    console.error('❌ No steps found in StepConfiguration table!');
    console.log('   Run: npm run sync:steps\n');
  } else {
    console.log(`✅ Found ${dbSteps.length} steps in database:\n`);
    dbSteps.forEach(step => {
      const status = step.isActive ? '✅' : '❌';
      console.log(`   ${status} [${step.stepKey}] ${step.stepName}`);
    });
    console.log('');
  }
  
  // 3. Compare TypeScript vs Database
  console.log('\n3️⃣  TypeScript ↔️ Database Comparison:\n');
  
  const tsStepKeys = new Set(tsSteps.map(s => s.stepKey));
  const dbStepKeys = new Set(dbSteps.map(s => s.stepKey));
  
  const inTsNotDb = tsSteps.filter(s => !dbStepKeys.has(s.stepKey));
  const inDbNotTs = dbSteps.filter(s => !tsStepKeys.has(s.stepKey));
  
  if (inTsNotDb.length > 0) {
    console.log('⚠️  Steps in TypeScript but NOT in database:');
    inTsNotDb.forEach(s => console.log(`   - ${s.stepKey}: ${s.stepName}`));
    console.log('   → Run: npm run sync:steps\n');
  }
  
  if (inDbNotTs.length > 0) {
    console.log('⚠️  Steps in database but NOT in TypeScript:');
    inDbNotTs.forEach(s => console.log(`   - ${s.stepKey}: ${s.stepName}`));
    console.log('   → These may be orphaned steps\n');
  }
  
  if (inTsNotDb.length === 0 && inDbNotTs.length === 0) {
    console.log('✅ TypeScript and Database are in sync!\n');
  }
  
  // 4. Check AuditStepStatus for each audit
  console.log('\n4️⃣  Audit Step Status Records:\n');
  
  const audits = await prisma.audit.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: { id: 'asc' }
  });
  
  let totalMissing = 0;
  
  if (audits.length === 0) {
    console.log('ℹ️  No audits found in database\n');
  } else {
    console.log(`📋 Checking ${audits.length} audits:\n`);
    
    for (const audit of audits) {
      const statuses = await prisma.auditStepStatus.findMany({
        where: { auditId: audit.id },
        select: {
          stepKey: true,
          status: true
        },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });
      
      const statusStepKeys = new Set(statuses.map(s => s.stepKey));
      const missing = dbSteps.filter(s => !statusStepKeys.has(s.stepKey));
      
      const statusIcon = missing.length === 0 ? '✅' : '⚠️';
      console.log(`${statusIcon} Audit #${audit.id} (${audit.name})`);
      console.log(`   Has: ${statuses.length}/${dbSteps.length} step statuses`);
      
      if (statuses.length > 0) {
        const completed = statuses.filter(s => s.status === 'completed').length;
        const pending = statuses.filter(s => s.status === 'pending').length;
        const inProgress = statuses.filter(s => s.status === 'in-progress').length;
        
        console.log(`   Status: ${completed} completed, ${inProgress} in-progress, ${pending} pending`);
      }
      
      if (missing.length > 0) {
        console.log(`   ❌ Missing ${missing.length} step statuses:`);
        missing.forEach(s => console.log(`      - ${s.stepKey}`));
        totalMissing += missing.length;
      }
      
      console.log('');
    }
    
    if (totalMissing > 0) {
      console.log(`⚠️  Total missing step statuses: ${totalMissing}`);
      console.log('   → Run: npm run fix:step-statuses\n');
    } else {
      console.log('✅ All audits have complete step status records!\n');
    }
  }
  
  // 5. Summary and recommendations
  console.log('='.repeat(60));
  console.log('\n📝 SUMMARY & RECOMMENDATIONS:\n');
  
  const issues: string[] = [];
  
  if (tsSteps.length === 0) {
    issues.push('❌ No TypeScript step configurations found');
  }
  
  if (dbSteps.length === 0) {
    issues.push('❌ StepConfiguration table is empty - Run: npm run sync:steps');
  }
  
  if (inTsNotDb.length > 0) {
    issues.push(`⚠️  ${inTsNotDb.length} steps need syncing to database - Run: npm run sync:steps`);
  }
  
  if (totalMissing > 0) {
    issues.push(`⚠️  ${totalMissing} missing audit step statuses - Run: npm run fix:step-statuses`);
  }
  
  if (issues.length === 0) {
    console.log('✅ Everything looks good! No issues found.\n');
  } else {
    console.log('Issues found:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('\nRecommended steps:');
    console.log('   1. npm run sync:steps        # Sync TypeScript configs to database');
    console.log('   2. npm run fix:step-statuses # Initialize missing audit step statuses');
    console.log('   3. npm run verify:steps      # Re-run this verification\n');
  }
  
  await prisma.$disconnect();
}

// Run verification
verifyStepSetup().catch(error => {
  console.error('❌ Error:', error);
  prisma.$disconnect();
  process.exit(1);
});
