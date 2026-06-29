/**
 * Fix Script: Initialize Missing Step Statuses
 * 
 * This script:
 * 1. Checks which steps exist in StepConfiguration
 * 2. Finds all audits
 * 3. Initializes missing AuditStepStatus records for each audit
 * 
 * Run: npx ts-node prisma/fix-step-statuses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStepStatuses() {
  console.log('🔍 Checking step configurations...\n');
  
  // 1. Get all active steps from StepConfiguration
  const allSteps = await prisma.stepConfiguration.findMany({
    where: { isActive: true },
    select: {
      stepKey: true,
      phaseId: true,
      stepId: true,
      stepName: true
    },
    orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
  });
  
  console.log(`✅ Found ${allSteps.length} active steps in StepConfiguration:`);
  allSteps.forEach(step => {
    console.log(`   - ${step.stepKey}: ${step.stepName}`);
  });
  console.log('');
  
  if (allSteps.length === 0) {
    console.error('❌ No steps found in StepConfiguration table!');
    console.log('   Run: npm run sync-metadata to populate StepConfiguration');
    await prisma.$disconnect();
    return;
  }
  
  // 2. Get all audits
  const audits = await prisma.audit.findMany({
    select: { id: true, name: true }
  });
  
  console.log(`📋 Found ${audits.length} audits to process\n`);
  
  if (audits.length === 0) {
    console.log('ℹ️  No audits found');
    await prisma.$disconnect();
    return;
  }
  
  // 3. For each audit, initialize missing step statuses
  let totalInitialized = 0;
  
  for (const audit of audits) {
    console.log(`\n🔧 Processing Audit #${audit.id}: ${audit.name}`);
    
    // Get existing statuses for this audit
    const existingStatuses = await prisma.auditStepStatus.findMany({
      where: { auditId: audit.id },
      select: { stepKey: true, status: true }
    });
    
    const existingStepKeys = new Set(existingStatuses.map(s => s.stepKey));
    
    console.log(`   Existing step statuses: ${existingStatuses.length}`);
    existingStatuses.forEach(status => {
      console.log(`      ${status.stepKey}: ${status.status}`);
    });
    
    // Find missing steps
    const missingSteps = allSteps.filter(step => !existingStepKeys.has(step.stepKey));
    
    if (missingSteps.length === 0) {
      console.log(`   ✅ All steps already initialized`);
      continue;
    }
    
    console.log(`   ⚠️  Missing ${missingSteps.length} step statuses:`);
    missingSteps.forEach(step => {
      console.log(`      ${step.stepKey}: ${step.stepName}`);
    });
    
    // Create missing status records
    const newStatuses = missingSteps.map(step => ({
      auditId: audit.id,
      phaseId: step.phaseId,
      stepId: step.stepId,
      stepKey: step.stepKey,
      status: 'pending'
    }));
    
    await prisma.auditStepStatus.createMany({
      data: newStatuses
    });
    
    totalInitialized += newStatuses.length;
    console.log(`   ✅ Initialized ${newStatuses.length} missing step statuses`);
  }
  
  console.log(`\n✅ Done! Initialized ${totalInitialized} step statuses across ${audits.length} audits\n`);
  
  await prisma.$disconnect();
}

// Run the fix
fixStepStatuses().catch(error => {
  console.error('❌ Error:', error);
  prisma.$disconnect();
  process.exit(1);
});
