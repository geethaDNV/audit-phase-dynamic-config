import { PrismaClient } from '@prisma/client';
import { stepRegistry } from '../src/config/step-registry';

const prisma = new PrismaClient();

/**
 * Sync TypeScript step configurations to StepConfiguration database table
 * 
 * This script:
 * 1. Loads all TypeScript step configs from StepRegistry
 * 2. Upserts them into the StepConfiguration table
 * 3. Ensures the database is the single source of truth for the frontend
 * 
 * Run this after:
 * - Creating new step configs
 * - Modifying existing step configs
 * - Updating validation rules or dependencies
 */
async function syncStepConfigurations() {
  console.log('🔄 Syncing TypeScript step configurations to database...\n');
  
  try {
    // Load all step configs from TypeScript (using singleton instance)
    const allSteps = stepRegistry.getAllSteps();
    
    console.log(`📋 Found ${allSteps.length} step configurations in TypeScript\n`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const config of allSteps) {
      try {
        await prisma.stepConfiguration.upsert({
          where: { stepKey: config.stepKey },
          create: {
            stepKey: config.stepKey,
            phaseId: config.phaseId,
            stepId: config.stepId,
            stepName: config.stepName,
            description: config.description || '',
            formSchema: config.formSchema as any,
            dataConfig: config.dataConfig as any,
            businessRules: config.businessRules || null,
            dependencies: config.dependencies || null,
            isActive: true,
            version: 1
          },
          update: {
            stepName: config.stepName,
            description: config.description || '',
            formSchema: config.formSchema as any,
            dataConfig: config.dataConfig as any,
            businessRules: config.businessRules || null,
            dependencies: config.dependencies || null,
            version: { increment: 1 }
          }
        });
        
        console.log(`  ✅ Synced: ${config.stepKey} - ${config.stepName}`);
        syncedCount++;
      } catch (error: any) {
        console.error(`  ❌ Failed to sync ${config.stepKey}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Sync Summary:`);
    console.log(`   Total steps: ${allSteps.length}`);
    console.log(`   ✅ Synced: ${syncedCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    
    // Verify count in database
    const dbCount = await prisma.stepConfiguration.count({
      where: { isActive: true }
    });
    
    console.log(`   💾 Active steps in database: ${dbCount}`);
    
    console.log(`\n✅ Step configuration sync completed successfully!`);
    
  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncStepConfigurations()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
